require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const FoodItem = require('./models/FoodItem');
const User = require('./models/User');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const sampleFood = [
  { name: 'Veg Burger', price: 60, isVeg: true, category: 'Snacks' },
  { name: 'Masala Dosa', price: 50, isVeg: true, category: 'Breakfast' },
  { name: 'Chicken Biryani', price: 120, isVeg: false, category: 'Meals' },
  { name: 'Cold Coffee', price: 40, isVeg: true, category: 'Drinks' },
];

app.get('/', (req, res) => {
  res.send('Hello from Campus 360 Smart Canteen!');
});

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
    // Everyone who registers is a student. Roles are never taken from the request.
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
      // Same message for both cases, so nobody can guess which emails exist
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