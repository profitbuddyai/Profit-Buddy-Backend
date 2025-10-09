const express = require('express');
const tokenChecker = require('../MiddleWares/TokenChecker');
const { deleteCoupon } = require('../Controllers/Admin/Coupon');
const { deleteInvitation } = require('../Controllers/Admin/AddUser');
const router = express.Router();

router.delete('/coupon/:id', tokenChecker, deleteCoupon);
router.delete('/invite/:inviteId', tokenChecker, deleteInvitation);

module.exports = router;
