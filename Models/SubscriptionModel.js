const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subscriptionSchema = new Schema(
  {
    planName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['incomplete', 'incomplete_payment', 'active', 'canceled', 'past_due', 'unpaid'],
      default: 'incomplete',
    },
    subscriptionType: {
      type: String,
      enum: ['stripe', 'coupon'],
      required: true,
    },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },

    userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  },
  {
    timestamps: true,
  }
);

const SubscriptionModel = mongoose.model('Subscription', subscriptionSchema);

module.exports = { SubscriptionModel };
