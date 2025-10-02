const { PRICE_IDS } = require('../../Enums/StripeConstant');
const { CouponModel } = require('../../Models/CouponModel');

// controllers/couponController.js
const getCoupons = async (req, res) => {
  try {
    const coupons = await CouponModel.find().sort({ createdAt: -1 }); // latest first
    res.status(200).json({
      success: true,
      coupons,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch coupons',
    });
  }
};

const generateCoupon = async (req, res) => {
  try {
    const { name, planName } = req.body || {};

    if (!name || !planName) {
      return res.status(400).json({
        success: false,
        message: 'Coupon name and plan name are required',
      });
    }

    if (!PRICE_IDS[planName]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const existingCoupon = await CouponModel.findOne({ name });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon with this name already exists',
      });
    }

    const coupon = await CouponModel.create({
      name,
      planName,
    });

    res.status(201).json({
      success: true,
      message: 'Coupon generated successfully',
      coupon,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate coupon',
    });
  }
};

// controllers/couponController.js
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Coupon ID is required',
      });
    }

    const deletedCoupon = await CouponModel.findByIdAndDelete(id);

    if (!deletedCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
      deletedCoupon,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete coupon',
    });
  }
};


module.exports = { getCoupons, generateCoupon , deleteCoupon };
