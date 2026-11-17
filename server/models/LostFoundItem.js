const mongoose = require('mongoose');

const lostFoundItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['lost', 'found'], required: true },
    category: {
      type: String,
      enum: [
        'Water Bottle',
        'Bag',
        'Calculator',
        'ID Card',
        'Books',
        'Keys',
        'Earbuds',
        'Wallet',
        'Mobile Phone',
        'Other Items',
        // Backwards compatibility for existing records
        'Electronics',
        'ID & Cards',
        'Bags & Wallets',
        'Books & Stationery',
        'Bottles & Lunchboxes',
        'Clothing & Accessories',
        'Other',
      ],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    imageUrl: { type: String, default: '' },
    status: { type: String, enum: ['open', 'matched', 'claimed'], default: 'open' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reporterName: { type: String, default: '' },
    reporterEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    secretQuestion: { type: String, default: '' }, // Verification question to prove ownership
    secretAnswer: { type: String, default: '' },
    aiKeywords: { type: [String], default: [] },
    matchedItem: { type: mongoose.Schema.Types.ObjectId, ref: 'LostFoundItem', default: null },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    claimAnswer: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LostFoundItem', lostFoundItemSchema);
