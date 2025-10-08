const { SupportQueryTemplate } = require('../Templates/SupportQueryTemplate');
const { sendEmail } = require('../Services/Nodemailer.service');

const submitSupportQuery = async (req, res) => {
  try {
    const { query } = req.body || {};
    const { user } = req || {};

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Support query is required.',
      });
    }

    await sendEmail('support@innercircleacd.com', 'New Support Query Submitted', SupportQueryTemplate(user?.email, query));

    return res.status(200).json({
      success: true,
      message: 'Support query submitted successfully.',
    });
  } catch (err) {
    console.error('Submit support query error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Could not submit support query.',
      error: err,
    });
  }
};

module.exports = { submitSupportQuery };
