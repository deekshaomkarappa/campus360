const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    isVeg: { type: Boolean, default: true },
    category: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    quantityAvailable: { type: Number, default: 20, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FoodItem', foodItemSchema);