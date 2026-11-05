require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const FoodItem = require('./models/FoodItem');
const User = require('./models/User');
const Order = require('./models/Order');
const Notification = require('./models/Notification');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ---------- SETTINGS (change these numbers to tune the canteen) ----------
const AVG_PREP_MINUTES = 5;      // average minutes to prepare one order
const SAME_TIME_WINDOW_SEC = 60; // teacher/student "same time" window
const LOW_STOCK_LIMIT = 5;       // stock at or below this is "low"
const MEDIUM_FROM = 5;           // pending orders for Medium workload
const HIGH_FROM = 10;            // pending orders for High workload

const sampleFood = [
  { name: 'Idli', price: 30, isVeg: true, category: 'Breakfast' },
  { name: 'Masala Dosa', price: 50, isVeg: true, category: 'Breakfast' },
  { name: 'Palav', price: 45, isVeg: true, category: 'Breakfast' },
  { name: 'Tomato Bath', price: 40, isVeg: true, category: 'Breakfast' },
  { name: 'Rice Rasam', price: 40, isVeg: true, category: 'Meals' },
  { name: 'Chapati and Chutney', price: 40, isVeg: true, category: 'Meals' },
  { name: 'Parota', price: 45, isVeg: true, category: 'Meals' },
  { name: 'Biryani', price: 90, isVeg: false, category: 'Meals' },
  { name: 'Chicken Biryani', price: 120, isVeg: false, category: 'Meals' },
  { name: 'Veg Burger', price: 60, isVeg: true, category: 'Snacks' },
  { name: 'Maggi', price: 30, isVeg: true, category: 'Snacks' },
  { name: 'Noodles', price: 50, isVeg: true, category: 'Snacks' },
  { name: 'Cold Coffee', price: 40, isVeg: true, category: 'Drinks' },
];

// ---------- HELPERS ----------
function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function sendError(res, err, fallback) {
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: fallback || 'Something went wrong on the server' });
}

function requireLogin(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Please log in first' });
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Your login has expired. Please log in again' });
  }
}

// The server checks the role in the database. The website cannot fake it.
async function requireAdmin(req, res, next) {
  requireLogin(req, res, async () => {
    const user = await User.findById(req.auth.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only' });
    }
    next();
  });
}

async function notify(userId, type, message, orderId) {
  if (!userId) return; // walk-in customers have no account
  await Notification.create({ user: userId, type, message, order: orderId });
}

// Takes stock for every item, or gives it all back if one item fails.
async function reserveItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw httpError(400, 'The cart is empty');
  const orderItems = [];
  const reserved = [];
  let totalAmount = 0;
  try {
    for (const line of items) {
      const quantity = Number(line.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        throw httpError(400, 'Quantity must be between 1 and 10');
      }
      const food = await FoodItem.findOneAndUpdate(
        { _id: line.id, isAvailable: true, quantityAvailable: { $gte: quantity } },
        { $inc: { quantityAvailable: -quantity } },
        { new: true }
      );
      if (!food) throw httpError(400, 'An item is unavailable or does not have enough stock');
      reserved.push({ id: food._id, quantity });
      orderItems.push({ foodItem: food._id, name: food.name, price: food.price, quantity });
      totalAmount += food.price * quantity;
    }
  } catch (e) {
    for (const r of reserved) {
      await FoodItem.findByIdAndUpdate(r.id, { $inc: { quantityAvailable: r.quantity } });
    }
    if (e.name === 'CastError') throw httpError(400, 'Invalid item in the cart');
    throw e;
  }
  return { orderItems, totalAmount };
}

async function giveStockBack(order) {
  for (const line of order.items) {
    await FoodItem.findByIdAndUpdate(line.foodItem, { $inc: { quantityAvailable: line.quantity } });
  }
}

async function makeOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dayStart = new Date(y, now.getMonth(), now.getDate());
  const countToday = await Order.countDocuments({ createdAt: { $gte: dayStart } });
  return `C360-${y}${m}${d}-${String(countToday + 1).padStart(3, '0')}`;
}

// YOUR PRIORITY RULE:
// 1. Orders already being prepared are never pushed back.
// 2. Waiting orders go first come, first served.
// 3. Orders placed within 60 seconds of the first order of a group are
//    "at the same time", and inside that group a teacher goes first.
async function getQueue() {
  const active = await Order.find({ status: { $in: ['placed', 'accepted', 'preparing'] } }).sort({ createdAt: 1 });
  const started = active.filter((o) => o.status === 'preparing');
  const waiting = active.filter((o) => o.status !== 'preparing');

  const groups = [];
  for (const o of waiting) {
    const last = groups[groups.length - 1];
    if (last && o.createdAt - last.start <= SAME_TIME_WINDOW_SEC * 1000) last.orders.push(o);
    else groups.push({ start: o.createdAt, orders: [o] });
  }
  const sortedWaiting = groups.flatMap((g) =>
    g.orders.sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt)
  );
  return [...started, ...sortedWaiting];
}

function workloadOf(count) {
  if (count >= HIGH_FROM) return 'High';
  if (count >= MEDIUM_FROM) return 'Medium';
  return 'Low';
}

app.get('/', (req, res) => res.send('Hello from Campus 360 Smart Canteen!'));

// ---------- AUTH ----------
function makeToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
}
function publicUser(u) {
  return { id: u._id, name: u.name, email: u.email, role: u.role };
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ message: 'This email is already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = role === 'teacher' ? 'teacher' : 'student';
    const user = await User.create({ name, email, passwordHash, role: assignedRole });
    res.status(201).json({ message: 'Registration successful', user: publicUser(user) });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) return res.status(401).json({ message: 'Wrong email or password' });
    res.cookie('token', makeToken(user), { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
    res.json({ message: 'Login successful', user: publicUser(user) });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// Lets the website stay logged in after a refresh
app.get('/api/auth/me', requireLogin, async (req, res) => {
  const user = await User.findById(req.auth.id);
  if (!user) return res.status(401).json({ message: 'Please log in again' });
  res.json({ user: publicUser(user) });
});

// ---------- MENU (public) ----------
app.get('/api/menu', async (req, res) => {
  try {
    const items = await FoodItem.find({ isAvailable: true });
    res.json(
      items.map((i) => ({
        id: i._id,
        name: i.name,
        price: i.price,
        isVeg: i.isVeg,
        category: i.category,
        imageUrl: i.imageUrl,
        quantityAvailable: i.quantityAvailable,
        soldOut: i.quantityAvailable === 0,
        rating: i.rating || 4.5,
        numReviews: i.numReviews || 0,
        isSpecial: i.isSpecial || false,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: 'Could not load the menu' });
  }
});

// ---------- QUEUE / CROWD (public) ----------
app.get('/api/queue', async (req, res) => {
  try {
    const queue = await getQueue();
    res.json({
      pendingOrders: queue.length,
      workload: workloadOf(queue.length),
      estimatedWaitMinutes: (queue.length + 1) * AVG_PREP_MINUTES,
      note: 'Estimated wait is an estimate, not a guaranteed pickup time.',
      priorityNote: 'Staff orders placed at the same moment as student orders are served first.',
    });
  } catch (err) {
    sendError(res, err);
  }
});

// ---------- STUDENT ORDERS ----------
app.post('/api/orders', requireLogin, async (req, res) => {
  try {
    const { items, orderType } = req.body;
    if (!['pickup', 'dine-in'].includes(orderType)) {
      return res.status(400).json({ message: 'Choose Pickup or Dine-in' });
    }
    const user = await User.findById(req.auth.id);
    if (!user) return res.status(401).json({ message: 'Please log in again' });

    const { orderItems, totalAmount } = await reserveItems(items);
    const order = await Order.create({
      orderNumber: await makeOrderNumber(),
      student: user._id,
      customerName: user.name,
      orderType,
      items: orderItems,
      totalAmount,
      priority: user.role === 'teacher' ? 1 : 2, // set by the server from the role
      paymentMethod: 'cash_at_counter',
    });
    await notify(user._id, 'confirmed', `Order ${order.orderNumber} is placed.`, order._id);

    res.status(201).json({
      message: 'Order placed',
      order: { id: order._id, orderNumber: order.orderNumber, totalAmount, status: order.status },
    });
  } catch (err) {
    sendError(res, err, 'Could not place the order');
  }
});

app.get('/api/orders/my', requireLogin, async (req, res) => {
  try {
    const orders = await Order.find({ student: req.auth.id }).sort({ createdAt: -1 }).limit(20);
    const queue = await getQueue();
    res.json(
      orders.map((o) => {
        const position = queue.findIndex((q) => String(q._id) === String(o._id));
        const inQueue = position !== -1;
        return {
          id: o._id,
          orderNumber: o.orderNumber,
          orderType: o.orderType,
          status: o.status,
          totalAmount: o.totalAmount,
          items: o.items.map((i) => ({ foodItem: i.foodItem, name: i.name, quantity: i.quantity })),
          createdAt: o.createdAt,
          ordersAhead: inQueue ? position : null,
          estimatedWaitMinutes: inQueue ? (position + 1) * AVG_PREP_MINUTES : null,
          isRated: o.isRated || false,
        };
      })
    );
  } catch (err) {
    res.status(500).json({ message: 'Could not load your orders' });
  }
});

app.post('/api/orders/:id/cancel', requireLogin, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, student: req.auth.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'placed') {
      return res.status(400).json({ message: 'This order can no longer be cancelled' });
    }
    order.status = 'cancelled';
    await order.save();
    await giveStockBack(order);
    await notify(order.student, 'cancelled', `Order ${order.orderNumber} was cancelled.`, order._id);
    res.json({ message: 'Order cancelled' });
  } catch (err) {
    sendError(res, err, 'Could not cancel the order');
  }
});

// ---------- RATING SYSTEM ----------
app.post('/api/orders/:id/rate', requireLogin, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, student: req.auth.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed orders can be rated' });
    }
    if (order.isRated) {
      return res.status(400).json({ message: 'You have already rated this order' });
    }
    const { ratings } = req.body;
    if (Array.isArray(ratings)) {
      for (const r of ratings) {
        const star = Number(r.rating);
        if (star >= 1 && star <= 5) {
          const food = await FoodItem.findById(r.foodItemId);
          if (food) {
            const currentTotal = (food.rating || 4.5) * (food.numReviews || 0);
            const newReviews = (food.numReviews || 0) + 1;
            const newRating = Number(((currentTotal + star) / newReviews).toFixed(1));
            food.rating = newRating;
            food.numReviews = newReviews;
            await food.save();
          }
        }
      }
    }
    order.isRated = true;
    await order.save();
    res.json({ message: 'Thank you for your rating!' });
  } catch (err) {
    sendError(res, err, 'Could not submit rating');
  }
});

// ---------- NOTIFICATIONS ----------
app.get('/api/notifications', requireLogin, async (req, res) => {
  const list = await Notification.find({ user: req.auth.id }).sort({ createdAt: -1 }).limit(15);
  res.json(list.map((n) => ({ id: n._id, type: n.type, message: n.message, isRead: n.isRead, createdAt: n.createdAt })));
});

app.post('/api/notifications/read', requireLogin, async (req, res) => {
  await Notification.updateMany({ user: req.auth.id, isRead: false }, { isRead: true });
  res.json({ message: 'Marked as read' });
});

// ---------- ADMIN: ORDERS ----------
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const queue = await getQueue();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const finished = await Order.find({
      status: { $in: ['ready', 'completed'] },
      updatedAt: { $gte: dayStart },
    }).sort({ updatedAt: -1 });

    const shape = (o, position) => ({
      id: o._id,
      orderNumber: o.orderNumber,
      customerName: o.customerName || 'Walk-in',
      orderType: o.orderType,
      priority: o.priority,
      status: o.status,
      totalAmount: o.totalAmount,
      items: o.items.map((i) => ({ name: i.name, quantity: i.quantity })),
      createdAt: o.createdAt,
      position,
    });

    res.json({
      queue: queue.map((o, i) => shape(o, i + 1)),
      finishedToday: finished.map((o) => shape(o, null)),
      workload: workloadOf(queue.length),
      pendingOrders: queue.length,
    });
  } catch (err) {
    sendError(res, err);
  }
});

const NEXT_STATUS = {
  placed: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['completed'],
};
const STATUS_NOTE = {
  accepted: ['accepted', 'was accepted.'],
  ready: ['ready', 'is ready for pickup.'],
  cancelled: ['cancelled', 'was cancelled by the canteen.'],
};

app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const allowed = NEXT_STATUS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Cannot change from ${order.status} to ${status}` });
    }
    order.status = status;
    await order.save();
    if (status === 'cancelled') await giveStockBack(order);
    if (STATUS_NOTE[status]) {
      const [type, text] = STATUS_NOTE[status];
      await notify(order.student, type, `Order ${order.orderNumber} ${text}`, order._id);
    }
    res.json({ message: 'Status updated' });
  } catch (err) {
    sendError(res, err);
  }
});

// Walk-in order added at the counter (no account needed)
app.post('/api/admin/orders/walkin', requireAdmin, async (req, res) => {
  try {
    const { items, customerName, isStaff } = req.body;
    const { orderItems, totalAmount } = await reserveItems(items);
    const order = await Order.create({
      orderNumber: await makeOrderNumber(),
      student: null,
      customerName: (customerName || '').toString().slice(0, 40),
      orderType: 'walk-in',
      items: orderItems,
      totalAmount,
      priority: isStaff ? 1 : 2,
      paymentMethod: 'cash_at_counter',
    });
    res.status(201).json({ message: 'Walk-in order added', orderNumber: order.orderNumber });
  } catch (err) {
    sendError(res, err, 'Could not add the order');
  }
});

// ---------- ADMIN: MENU AND INVENTORY ----------
function cleanFood(body) {
  const name = (body.name || '').toString().trim();
  const category = (body.category || '').toString().trim();
  const price = Number(body.price);
  const quantityAvailable = Number(body.quantityAvailable);
  if (!name || !category) throw httpError(400, 'Name and category are required');
  if (!(price >= 0)) throw httpError(400, 'Price must be a number, 0 or more');
  if (!Number.isInteger(quantityAvailable) || quantityAvailable < 0) {
    throw httpError(400, 'Quantity must be a whole number, 0 or more');
  }
  return {
    name,
    category,
    price,
    quantityAvailable,
    isVeg: body.isVeg !== false,
    isAvailable: body.isAvailable !== false,
    isSpecial: body.isSpecial === true,
    imageUrl: (body.imageUrl || '').toString().trim(),
  };
}

app.get('/api/admin/menu', requireAdmin, async (req, res) => {
  const items = await FoodItem.find().sort({ category: 1, name: 1 });
  res.json(
    items.map((i) => ({
      id: i._id,
      name: i.name,
      price: i.price,
      isVeg: i.isVeg,
      category: i.category,
      imageUrl: i.imageUrl,
      quantityAvailable: i.quantityAvailable,
      isAvailable: i.isAvailable,
      lowStock: i.quantityAvailable <= LOW_STOCK_LIMIT,
      rating: i.rating || 4.5,
      numReviews: i.numReviews || 0,
      isSpecial: i.isSpecial || false,
    }))
  );
});

app.post('/api/admin/menu', requireAdmin, async (req, res) => {
  try {
    const item = await FoodItem.create(cleanFood(req.body));
    res.status(201).json({ message: 'Food item added', id: item._id });
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/admin/menu/:id', requireAdmin, async (req, res) => {
  try {
    const item = await FoodItem.findByIdAndUpdate(req.params.id, cleanFood(req.body), { new: true });
    if (!item) return res.status(404).json({ message: 'Food item not found' });
    res.json({ message: 'Food item updated' });
  } catch (err) {
    sendError(res, err);
  }
});

app.delete('/api/admin/menu/:id', requireAdmin, async (req, res) => {
  try {
    const item = await FoodItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Food item not found' });
    res.json({ message: 'Food item deleted' });
  } catch (err) {
    sendError(res, err);
  }
});

// ---------- ADMIN: ANALYTICS (simple reports from real order data) ----------
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find();
    const valid = orders.filter((o) => o.status !== 'cancelled');
    const totalSales = valid.reduce((s, o) => s + o.totalAmount, 0);

    const ordersByStatus = {};
    orders.forEach((o) => {
      ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
    });

    const sold = {};
    valid.forEach((o) => o.items.forEach((i) => { sold[i.name] = (sold[i.name] || 0) + i.quantity; }));
    const popularItems = Object.entries(sold)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const dayKey = (d) => new Date(d).toLocaleDateString('en-CA');
    const daily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daily.push({ date: dayKey(d), orders: 0, sales: 0 });
    }
    valid.forEach((o) => {
      const row = daily.find((r) => r.date === dayKey(o.createdAt));
      if (row) { row.orders += 1; row.sales += o.totalAmount; }
    });

    const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
    valid.forEach((o) => { byHour[new Date(o.createdAt).getHours()].orders += 1; });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentNames = new Set();
    valid.filter((o) => o.createdAt >= weekAgo).forEach((o) => o.items.forEach((i) => recentNames.add(i.name)));

    const foods = await FoodItem.find();
    res.json({
      totalOrders: orders.length,
      totalSales,
      ordersByStatus,
      popularItems,
      dailySales: daily,
      demandByHour: byHour.filter((h) => h.hour >= 7 && h.hour <= 20),
      lowStockItems: foods.filter((f) => f.quantityAvailable <= LOW_STOCK_LIMIT).map((f) => ({ name: f.name, quantityAvailable: f.quantityAvailable })),
      unsoldThisWeek: foods.filter((f) => !recentNames.has(f.name)).map((f) => f.name),
      inventory: foods.map((f) => ({ name: f.name, quantityAvailable: f.quantityAvailable, isAvailable: f.isAvailable })),
    });
  } catch (err) {
    sendError(res, err);
  }
});

// ---------- START ----------
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    if ((await FoodItem.countDocuments()) === 0) {
      await FoodItem.insertMany(sampleFood);
      console.log('Sample food added to the database');
    }
    app.listen(5000, () => console.log('Server is running on http://localhost:5000'));
  } catch (err) {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  }
}

start();