const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const historySchema = new Schema(
  {
    asin: {
      type: String,
      required: true,
    },
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    buyCost: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

historySchema.index({ userRef: 1, asin: 1 }, { unique: true });

const HistoryModal = mongoose.model('History', historySchema);

module.exports = { HistoryModal };
