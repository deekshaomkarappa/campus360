const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['confirmed', 'accepted', 'ready', 'cancelled', 'match_found', 'claim_received', 'info'],
      required: true,
    },
    message: { type: String, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'LostFoundItem' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Match notifications are private and role-specific. Contact details are
// included only in the notification delivered to the finder of the matched item.
notificationSchema.pre('validate', async function makeMatchNotificationsPrivate() {
  if (this.type !== 'match_found' || !this.item || !this.user) return;

  const LostFoundItem = mongoose.model('LostFoundItem');
  const item = await LostFoundItem.findById(this.item).select('+contactPhone');
  if (!item || !item.matchedItem) return;
  const counterpart = await LostFoundItem.findById(item.matchedItem).select('+contactPhone');
  if (!counterpart) return;

  const lost = item.type === 'lost' ? item : counterpart;
  const found = item.type === 'found' ? item : counterpart;
  if (String(this.user) === String(lost.reportedBy)) {
    this.message = 'Your lost item has been matched!';
  } else if (String(this.user) === String(found.reportedBy)) {
    this.message = lost.contactPhone
      ? `A lost item you found has been matched. Owner contact: ${lost.contactPhone}`
      : 'A lost item you found has been matched. The owner did not provide a phone number.';
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
