const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    foodItem: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },

    // Walk-in orders added by the admin have no student account.
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerName: { type: String, default: '' },

    orderType: {
      type: String,
      enum: ['pickup', 'dine-in', 'walk-in'],
      required: true,
    },

    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['placed', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'placed',
    },

    // 1 = teacher / staff, 2 = student. Used for the "same time" rule.
    priority: { type: Number, enum: [1, 2], default: 2 },

    // Cash at the counter or a clearly labelled demo. No real payment.
    paymentMethod: { type: String, enum: ['cash_at_counter', 'demo'], default: 'cash_at_counter' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);