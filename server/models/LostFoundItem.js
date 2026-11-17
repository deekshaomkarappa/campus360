const mongoose = require('mongoose');

const PRIVATE_FIELDS = ['reporterEmail', 'contactPhone', 'secretQuestion', 'secretAnswer', 'claimAnswer'];
function removePrivateFields(_doc, ret) {
  for (const field of PRIVATE_FIELDS) delete ret[field];
  return ret;
}

const lostFoundItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['lost', 'found'], required: true },
    category: {
      type: String,
      enum: [
        'Water Bottle', 'Bag', 'Calculator', 'ID Card', 'Books', 'Keys', 'Earbuds',
        'Wallet', 'Mobile Phone', 'Other Items', 'Electronics', 'ID & Cards',
        'Bags & Wallets', 'Books & Stationery', 'Bottles & Lunchboxes',
        'Clothing & Accessories', 'Other',
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
    secretQuestion: { type: String, default: '' },
    secretAnswer: { type: String, default: '' },
    aiKeywords: { type: [String], default: [] },
    matchedItem: { type: mongoose.Schema.Types.ObjectId, ref: 'LostFoundItem', default: null },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    claimAnswer: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { transform: removePrivateFields },
    toObject: { transform: removePrivateFields },
  }
);

// A lost-item report is announced to registered users. Store only a generic
// notification; never include reporter contact details in a broadcast.
lostFoundItemSchema.post('save', async function notifyLostReport(doc) {
  if (!doc.isNew || doc.type !== 'lost') return;
  try {
    const User = mongoose.model('User');
    const Notification = mongoose.model('Notification');
    const recipients = await User.find({ _id: { $ne: doc.reportedBy } }).select('_id').lean();
    await Notification.insertMany(recipients.map(({ _id }) => ({
      user: _id,
      type: 'info',
      message: `A new lost item was reported: ${doc.title}`,
      item: doc._id,
    })));
  } catch (error) {
    // Do not fail an item report because notification delivery is temporarily unavailable.
    console.error('Could not notify users about lost item:', error.message);
  }
});

module.exports = mongoose.model('LostFoundItem', lostFoundItemSchema);
