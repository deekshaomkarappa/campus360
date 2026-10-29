require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const FoodItem = require('./models/FoodItem');

const app = express();

app.use(cors());
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

app.get('/api/menu', async (req, res) => {
  try {
    const items = await FoodItem.find({ isAvailable: true });
    const result = items.map((i) => ({
      id: i._id,
      name: i.name,
      price: i.price,
      isVeg: i.isVeg,
      category: i.category,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Could not load the menu' });
  }
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Add sample food only if the database is empty
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