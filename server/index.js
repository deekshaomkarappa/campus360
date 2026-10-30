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

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const sampleFood = [
  { name: 'Veg Burger', price: 60, isVeg: true, category: 'Snacks' },
  { name: 'Masala Dosa', price: 50, isVeg: true, category: 'Breakfast' },
  { name: 'Chicken Biryani', price: 120, isVeg: false, category: 'Meals' },
  { name: 'Cold Coffee', price: 40, isVeg: true, category: 'Drinks' },
];

app.get('/', (req, res) => {
  res.send('Hello from Campus 360 Smart Canteen!');
});

// ---------- LOGIN CHECK (middleware) ----------
function requireLogin(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Please log in first' });
  }
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Your login has expired. Please log in again' });
  }
}

// ---------- MENU ----------
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
      }))
    );
  } catch (err) {
    res.status(500).json({ message: 'Could not load the menu' });
  }
});

// ---------- AUTH ----------
function makeToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'This email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    res.status(201).json({
      message: 'Registration successful',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong on the server' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) {
      return res.status(401).json({ message: 'Wrong email or password' });
    }

    const token = makeToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.json({
      message: 'Login successful',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong on the server' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// ---------- ORDERS ----------
async function makeOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dayStart = new Date(y, now.getMonth(), now.getDate());
  const countToday = await Order.countDocuments({ createdAt: { $gte: dayStart } });
  const serial = String(countToday + 1).padStart(3, '0');
  return `C360-${y}${m}${d}-${serial}`;
}

app.post('/api/orders', requireLogin, async (req, res) => {
  try {
    const { items, orderType } = req.body;

    if (!['pickup', 'dine-in'].includes(orderType)) {
      return res.status(400).json({ message: 'Choose Pickup or Dine-in' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    const user = await User.findById(req.auth.id);
    if (!user) {
      return res.status(401).json({ message: 'Please log in again' });
    }

    // Build the order from the DATABASE prices, never from the website
    const orderItems = [];
    let totalAmount = 0;

    for (const line of items) {
      const quantity = Number(line.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return res.status(400).json({ message: 'Quantity must be between 1 and 10' });
      }

      const food = await FoodItem.findById(line.id);
      if (!food || !food.isAvailable) {
        return res.status(400).json({ message: 'An item in your cart is not available' });
      }
      if (food.quantityAvailable < quantity) {
        return res.status(400).json({
          message: `Only ${food.quantityAvailable} of ${food.name} left`,
        });
      }

      orderItems.push({
        foodItem: food._id,
        name: food.name,
        price: food.price,
        quantity,
      });
      totalAmount += food.price * quantity;
    }

    // Reduce stock safely: only succeeds if enough is still left
    for (const line of orderItems) {
      const updated = await FoodItem.findOneAndUpdate(
        { _id: line.foodItem, quantityAvailable: { $gte: line.quantity } },
        { $inc: { quantityAvailable: -line.quantity } }
      );
      if (!updated) {
        return res.status(400).json({
          message: `${line.name} just ran out. Please update your cart`,
        });
      }
    }

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

    res.status(201).json({
      message: 'Order placed',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        totalAmount: order.totalAmount,
        status: order.status,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong on the server' });
  }
});
// ---------- MY ORDERS ----------
const AVG_PREP_MINUTES = 5; // assumption: average minutes to prepare one order

app.get('/api/orders/my', requireLogin, async (req, res) => {
  try {
    const orders = await Order.find({ student: req.auth.id })
      .sort({ createdAt: -1 })
      .limit(20);

    // Orders still waiting, oldest first
    const waiting = await Order.find({ status: { $in: ['placed', 'accepted'] } })
      .sort({ createdAt: 1 })
      .select('_id');

    res.json(
      orders.map((o) => {
        const position = waiting.findIndex((w) => String(w._id) === String(o._id));
        const isWaiting = position !== -1;
        return {
          id: o._id,
          orderNumber: o.orderNumber,
          orderType: o.orderType,
          status: o.status,
          totalAmount: o.totalAmount,
          items: o.items.map((i) => ({ name: i.name, quantity: i.quantity })),
          createdAt: o.createdAt,
          ordersAhead: isWaiting ? position : null,
          estimatedWaitMinutes: isWaiting ? (position + 1) * AVG_PREP_MINUTES : null,
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
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.status !== 'placed') {
      return res.status(400).json({
        message: 'This order can no longer be cancelled',
      });
    }

    order.status = 'cancelled';
    await order.save();

    // Give the stock back
    for (const line of order.items) {
      await FoodItem.findByIdAndUpdate(line.foodItem, {
        $inc: { quantityAvailable: line.quantity },
      });
    }

    res.json({ message: 'Order cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Could not cancel the order' });
  }
});
// ---------- START ----------
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const count = await FoodItem.countDocuments();
    if (count === 0) {
      await FoodItem.insertMany(sampleFood);
      console.log('Sample food added to the database');
    }

    app.listen(5000, () => {
      console.log('Server is running on http://localhost:5000');
    });
  } catch (err) {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  }
}

start();