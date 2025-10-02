const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },

    userName: {
      type: String,
      default: '',
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    terms: {
      type: Boolean,
      default: false,
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    plan: {
      type: String,
      default: null,
      required: false,
    },

    quotasUsed: {
      aiChat: { type: Number, default: 0 },
    },

    currentSubscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },

    // Stripe
    stripeCustomerId: { type: String, default: null },

    // Verifications Token
    verifyToken: { type: String, default: null, select: false },
    verifyTokenExpiry: { type: Date, default: null, select: false },
    deleteToken: { type: String, default: null, select: false },
    deleteTokenExpiry: { type: Date, default: null, select: false },
    resetToken: { type: String, default: null, select: false },
    resetTokenExpiry: { type: Date, default: null, select: false },

    // For logout from every device when change password
    tokenVersion: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const UserModal = mongoose.model('User', userSchema);

module.exports = { UserModal };
