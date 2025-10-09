const crypto = require('crypto');
const { UserModal } = require('../../Models/UserModel');
const { InvitationModel } = require('../../Models/InvitationModel');
const { sendEmail } = require('../../Services/Nodemailer.service');
const { profitBuddy } = require('../../config');
const { UserInviteTemplate } = require('../../Templates/UserInviteTemplate');
const { SubscriptionModel } = require('../../Models/SubscriptionModel');
const { default: mongoose } = require('mongoose');

const inviteUser = async (req, res) => {
  try {
    const { email } = req.body || {};
    const { user } = req || {};
    const inviterId = req.query.userId;

    if (!user?.isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'User can only be invited by admin.',
      });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await UserModal.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'This email is already have an account.',
      });
    }

    const existingInvite = await InvitationModel.findOne({
      email: normalizedEmail,
      inviter: inviterId,
      status: 'pending',
    });

    if (existingInvite) {
      // const existingInvite = await InvitationModel.deleteOne({
      //   email: normalizedEmail,
      // });
      return res.status(400).json({
        success: false,
        message: 'An invitation has already been sent to this email.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const inviteLink = `${profitBuddy?.baseUrl}/authentication?tab=register&email=${normalizedEmail}&register-token=${token}`;

    const invitation = new InvitationModel({
      email: normalizedEmail,
      inviter: inviterId,
      token,
      status: 'pending',
    });

    await invitation.save();

    await sendEmail(normalizedEmail, 'You’re Invited to Join Profit Buddy', UserInviteTemplate(inviteLink));

    return res.status(201).json({
      success: true,
      message: `Invitation sent successfully to ${normalizedEmail}.`,
    });
  } catch (error) {
    console.error('Invite Staff User Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getInvitedUsers = async (req, res) => {
  try {
    const { user } = req || {};
    const inviterId = req.query.userId;

    if (!user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can view invited users.',
      });
    }

    const invitations = await InvitationModel.find({ inviter: inviterId }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      invitations,
    });
  } catch (error) {
    console.error('Get Invited Users Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

const deleteInvitation = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const { user } = req || {};
    const inviterId = req.query.userId;

    if (!user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can delete invitations.',
      });
    }

    if (!inviteId || !mongoose.isValidObjectId(inviteId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid Invitation ID is required.',
      });
    }

    // 1️⃣ Find the invitation
    const invitation = await InvitationModel.findOne({
      _id: inviteId,
      inviter: inviterId,
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found.',
      });
    }

    // 2️⃣ If invite was accepted → check user subscription
    if (invitation.status === 'accepted') {
      const invitedUser = await UserModal.findOne({ email: invitation.email }).populate('currentSubscription');

      if (invitedUser && invitedUser.currentSubscription) {
        const sub = invitedUser.currentSubscription;

        if (sub.planName === 'full_access') {
          await SubscriptionModel.deleteOne({ _id: sub._id });
          invitedUser.currentSubscription = null;
          await invitedUser.save();
        }
      }
    }

    // 3️⃣ Delete the invitation itself
    await InvitationModel.deleteOne({ _id: inviteId });

    return res.status(200).json({
      success: true,
      message: 'Invitation deleted successfully.',
    });
  } catch (error) {
    console.error('Delete Invitation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

module.exports = { inviteUser, getInvitedUsers, deleteInvitation };
