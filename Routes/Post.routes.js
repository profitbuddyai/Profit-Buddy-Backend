const express = require('express');
const { login, register, requestPasswordReset, verifyResetToken, resetPassword, updateProfile, verifyEmail, deleteAccount, requestDeleteAccount } = require('../Controllers/User');
const { userLoginValidate, userRegisterValidate } = require('../MiddleWares/UserValidation');
const tokenChecker = require('../MiddleWares/TokenChecker');
const { upsertHistory } = require('../Controllers/History');
const { createSubscription, cancelSubscription, createSetupIntent, verifyCoupon, setDefaultPaymentMethod } = require('../Controllers/Subscription');
const { generateCoupon, deleteCoupon } = require('../Controllers/Admin/Coupon');
const { submitSupportQuery } = require('../Controllers/Support');
const { inviteUser, grantFullAccess } = require('../Controllers/Admin/AddUser');
const router = express.Router();

router.post('/register', userRegisterValidate, register);
router.post('/verify-email', verifyEmail);
router.post('/login', userLoginValidate, login);
router.post('/upsert-history', tokenChecker, upsertHistory);
router.post('/request-password-reset', requestPasswordReset);
router.post('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);
router.post('/request-delete-account', tokenChecker, requestDeleteAccount);
router.post('/delete-account', tokenChecker, deleteAccount);
router.post('/update-profile', tokenChecker, updateProfile);
router.post('/submit-support-query', tokenChecker, submitSupportQuery);

router.post('/create-subscription', tokenChecker, createSubscription);
router.post('/cancel-subscription', tokenChecker, cancelSubscription);
router.post('/verify-coupon', tokenChecker, verifyCoupon);

router.post('/generate-coupon', tokenChecker, generateCoupon);
router.post('/invite-user', tokenChecker, inviteUser);
router.post('/grant-full-access', tokenChecker, grantFullAccess);

router.post('/create-setup-intent', tokenChecker, createSetupIntent);
router.post('/set-defualt-payment-method', tokenChecker, setDefaultPaymentMethod);

module.exports = router;
