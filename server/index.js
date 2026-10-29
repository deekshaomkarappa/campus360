const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const foodItems = [
  { id: 1, name: 'Veg Burger', price: 60, isVeg: true, category: 'Snacks' },
  { id: 2, name: 'Masala Dosa', price: 50, isVeg: true, category: 'Breakfast' },
  { id: 3, name: 'Chicken Biryani', price: 120, isVeg: false, category: 'Meals' },
  { id: 4, name: 'Cold Coffee', price: 40, isVeg: true, category: 'Drinks' },
];

app.get('/', (req, res) => {
  res.send('Hello from Campus 360 Smart Canteen!');
});

app.get('/api/menu', (req, res) => {
  res.json(foodItems);
});

app.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});