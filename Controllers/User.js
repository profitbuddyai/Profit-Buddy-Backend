const { profitBuddy } = require('../config');
const { NODE_ENV } = require('../Enums/OurConstant');
const { UserModal } = require('../Models/UserModel');
const { sendEmail } = require('../Services/Nodemailer.service');
const { DeleteAccountVerificationTemplate } = require('../Templates/DeleteAccountVerificationTemplate');
const { EmailVerificationTemplate } = require('../Templates/EmailVerificationTemplate');
const { ForgotPasswordTemplate } = require('../Templates/ForgotPasswordTemplate');
const { generateHash, compareHash } = require('../Utils/BCrypt');
const { generateJwtToken } = require('../Utils/Jwt');
const crypto = require('crypto');
const { InvitationModel } = require('../Models/InvitationModel');
const { SubscriptionModel } = require('../Models/SubscriptionModel');

const register = async (req, res) => {
  const { email, password, terms, inviteToken } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase();

    // 🧩 STEP 1: Check if invited
    let invitation = null;
    if (inviteToken) {
      invitation = await InvitationModel.findOne({ token: inviteToken });

      if (!invitation) {
        return res.status(400).json({ success: false, message: 'Invalid or expired invitation link.' });
      }

      if (invitation.email.toLowerCase() !== normalizedEmail) {
        return res.status(400).json({ success: false, message: 'This invitation was sent to a different email.' });
      }
    }

    // 🧩 STEP 2: Check if user exists
    let user = await UserModal.findOne({ email: normalizedEmail }).select('+password +verifyToken +verifyTokenExpiry');
    const hashedPassword = await generateHash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenExpiry = Date.now() + 15 * 60 * 1000;
    const verifyLink = `${profitBuddy?.baseUrl}/verify?token=${verifyToken}`;

    if (user) {
      if (user.verified) {
        return res.status(409).json({ success: false, message: 'User with this email already exists. Please log in.' });
      }

      const tokenExistsAndValid = user.verifyToken && user.verifyTokenExpiry && new Date(user.verifyTokenExpiry) > Date.now();
      if (tokenExistsAndValid) {
        const timeLeft = Math.ceil((new Date(user.verifyTokenExpiry) - Date.now()) / 60000);
        return res.status(403).json({
          success: false,
          message: `Your email is not verified. Please check your inbox or try again in ${timeLeft} minute(s).`,
        });
      }

      user.verifyToken = verifyToken;
      user.verifyTokenExpiry = verifyTokenExpiry;
      user.verified = false;
      await user.save();

      await sendEmail(user.email, 'Verify Your Email Address', EmailVerificationTemplate(verifyLink));
      return res.status(403).json({
        success: true,
        message: "Your email already exists but not verified, We've sent you a verification link.",
      });
    }

    // 🧩 STEP 3: Create new user
    const newUser = await new UserModal({
      email: normalizedEmail,
      password: hashedPassword,
      terms,
      verifyToken,
      verifyTokenExpiry,
      verified: false,
    });

    await newUser.save();

    if (invitation) {
      const newSubscription = await SubscriptionModel.create({
        userRef: newUser._id,
        planName: 'full_access',
        subscriptionType: 'invite',
        status: 'active',
      });

      newUser.currentSubscription = newSubscription._id;
      await newUser.save();

      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      await invitation.save();
    }

    await sendEmail(normalizedEmail, 'Verify Your Email Address', EmailVerificationTemplate(verifyLink));

    return res.status(201).json({
      success: true,
      message: invitation
        ? "You've successfully registered with full access. Please verify your email to activate your account."
        : "You've successfully registered. We've sent you an email verification link — please check your inbox.",
    });
  } catch (error) {
    console.error('Registration Error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages[0] });
    }

    return res.status(500).json({ message: error?.message || 'Internal server error.' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is missing. Please use the latest link sent to your email.',
      });
    }

    const user = await UserModal.findOne({ verifyToken: token }).select('+verifyToken +verifyTokenExpiry');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link. Please request a new one.',
      });
    }

    if (!user.verifyTokenExpiry || user.verifyTokenExpiry < Date.now()) {
      return res.status(410).json({
        success: false,
        message: 'Your verification link has expired. Please request a new one.',
      });
    }

    if (user.verified) {
      return res.status(200).json({
        success: true,
        message: 'Your email is already verified. You can log in.',
      });
    }

    user.verified = true;
    user.verifyToken = null;
    user.verifyTokenExpiry = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Your email has been verified successfully. You can now log in with your email.',
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while verifying your email. Please try again later.',
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req?.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: !email ? 'Email is required.' : 'Password is required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await UserModal.findOne({ email: normalizedEmail }).select('+password +verifyToken +verifyTokenExpiry').populate('currentSubscription');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isPasswordValid = await compareHash(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.verified) {
      const tokenExistsAndValid = user.verifyToken && user.verifyTokenExpiry && new Date(user.verifyTokenExpiry) > Date.now();

      if (tokenExistsAndValid) {
        const timeLeft = Math.ceil((new Date(user.verifyTokenExpiry) - Date.now()) / 60000);
        return res.status(403).json({
          success: false,
          message: `Your email is not verified. A verification link was already sent. Please check your inbox or try again in ${timeLeft} minute(s).`,
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      user.verifyToken = token;
      user.verifyTokenExpiry = expiry;

      await user.save();

      const verifyLink = `${profitBuddy?.baseUrl}/verify?token=${token}`;
      await sendEmail(user.email, 'Verify Your Email Address', EmailVerificationTemplate(verifyLink));

      return res.status(403).json({
        success: false,
        message: 'Your email is not verified. A new verification link has been sent to your email address.',
      });
    }

    const jwt = await generateJwtToken({ _id: user._id, tokenVersion: user.tokenVersion });

    user.password = undefined;
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;

    return res.status(200).json({
      success: true,
      token: jwt,
      user,
      message: 'Login successful!',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
  }
};

const getUserDetail = async (req, res) => {
  try {
    const userId = req.query.userId;

    const user = await UserModal.findById(userId).select('-password').populate('currentSubscription');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user, nodeEnv: NODE_ENV });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email address to receive a password reset link.',
      });
    }

    const user = await UserModal.findOne({ email }).select('+resetToken +resetTokenExpiry');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address. Please check for typos or sign up for a new account.',
      });
    }

    if (user.resetToken && user.resetTokenExpiry && user.resetTokenExpiry > Date.now()) {
      const timeLeft = Math.ceil((user.resetTokenExpiry - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `A password reset link was already sent. Please check your inbox or try again in ${timeLeft} minute(s).`,
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 min

    const resetLink = `${profitBuddy?.baseUrl}/reset-password?email=${encodeURIComponent(user.email)}&token=${resetToken}`;

    await sendEmail(user.email, 'Reset Your Profit Buddy Password', ForgotPasswordTemplate(resetLink));

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "We've sent you a password reset link! Please check your email (and spam folder).",
    });
  } catch (error) {
    console.error('Error in requestPasswordReset:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while processing your request. Please try again later.',
      error: error.message,
    });
  }
};

const verifyResetToken = async (req, res) => {
  try {
    const { email, token } = req.body || {};

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: !email ? 'Email is required to verify the reset link.' : 'Reset token is missing. Please use the latest link sent to your email.',
      });
    }

    const user = await UserModal.findOne({
      email,
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    }).select('+resetToken +resetTokenExpiry');

    if (!user) {
      const emailExists = await UserModal.findOne({ email });
      if (!emailExists) {
        return res.status(404).json({
          success: false,
          message: "We couldn't find an account with this email. Please make sure you entered the correct one.",
        });
      }

      const userWithExpiredToken = await UserModal.findOne({
        email,
        resetToken: token,
      }).select('+resetToken +resetTokenExpiry');

      if (userWithExpiredToken) {
        return res.status(400).json({
          success: false,
          message: 'Your reset link has expired. Please request a new password reset link.',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid reset link. Please request a new password reset email and try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Your password reset link is valid. You can now reset your password.',
    });
  } catch (error) {
    console.error('Error in verifyResetToken:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while verifying your reset link. Please try again later.',
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body || {};

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: !email
          ? 'Email is required to reset your password.'
          : !token
          ? 'Reset token is missing. Please use the latest link sent to your email.'
          : 'New password is required to reset your account password.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const user = await UserModal.findOne({
      email,
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    }).select('+password +resetToken +resetTokenExpiry');

    if (!user) {
      const emailExists = await UserModal.findOne({ email });
      if (!emailExists) {
        return res.status(404).json({
          success: false,
          message: "We couldn't find an account with this email. Please check the email or sign up for a new account.",
        });
      }

      const tokenExists = await UserModal.findOne({ email, resetToken: token }).select('+resetToken +resetTokenExpiry');
      if (tokenExists) {
        return res.status(400).json({
          success: false,
          message: 'Your reset link has expired. Please request a new one.',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid reset token. Please use the latest password reset email you received.',
      });
    }

    const hashedPassword = await generateHash(newPassword);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.tokenVersion += 1;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while resetting your password. Please try again later.',
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { userId } = req.query;
    const { userName } = req.body || {};

    let user = await UserModal.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (userName) user.userName = userName;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while updating your profile.',
      error: error,
    });
  }
};

const requestDeleteAccount = async (req, res) => {
  try {
    const { userId } = req.query || {};

    const user = await UserModal.findById(userId).select('+deleteToken +deleteTokenExpiry');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this ID.',
      });
    }

    // If token already exists and is still valid → block spamming
    if (user.deleteToken && user.deleteTokenExpiry && user.deleteTokenExpiry > Date.now()) {
      const timeLeft = Math.ceil((user.deleteTokenExpiry - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `A delete account link was already sent. Please check your inbox or try again in ${timeLeft} minute(s).`,
      });
    }

    // Generate new delete token
    const deleteToken = crypto.randomBytes(32).toString('hex');
    const deleteTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    const deleteLink = `${profitBuddy?.baseUrl}/delete-account?token=${deleteToken}`;

    // Send email
    await sendEmail(user.email, 'Confirm Your Account Deletion', DeleteAccountVerificationTemplate(deleteLink));

    // Save token + expiry
    user.deleteToken = deleteToken;
    user.deleteTokenExpiry = deleteTokenExpiry;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "We've sent you a delete account confirmation link! Please check your email (and spam folder).",
    });
  } catch (error) {
    console.error('Error in requestDeleteAccount:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while processing your request. Please try again later.',
      error: error.message,
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { token } = req.body || {};
    const { userId } = req.query || {};

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Delete token is missing. Please use the latest link sent to your email.',
      });
    }

    const user = await UserModal.findOne({
      _id: userId,
      deleteToken: token,
      deleteTokenExpiry: { $gt: Date.now() },
    }).select('+deleteToken +deleteTokenExpiry');

    if (!user) {
      const emailExists = await UserModal.findById(userId);
      if (!emailExists) {
        return res.status(404).json({
          success: false,
          message: "We couldn't find any account. Please check the email or sign up for a new account.",
        });
      }

      const tokenExists = await UserModal.findOne({ _id: userId, deleteToken: token }).select('+deleteToken +deleteTokenExpiry');
      if (tokenExists) {
        return res.status(400).json({
          success: false,
          message: 'Your delete link has expired. Please request a new one.',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid delete token. Please use the latest delete account email you received.',
      });
    }

    await UserModal.deleteOne({ _id: userId });

    return res.status(200).json({
      success: true,
      message: 'Your account has been permanently deleted. We’re sorry to see you go.',
    });
  } catch (error) {
    console.error('Error in deleteAccount:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while deleting your account. Please try again later.',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  getUserDetail,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  updateProfile,
  requestDeleteAccount,
  deleteAccount,
};
