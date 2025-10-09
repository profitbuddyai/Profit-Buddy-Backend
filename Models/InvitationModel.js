const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invitationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    token: {
      type: String,
      required: false,
      default: null,
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
    },

    acceptedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

const InvitationModel = mongoose.model('Invitation', invitationSchema);
module.exports = { InvitationModel };
