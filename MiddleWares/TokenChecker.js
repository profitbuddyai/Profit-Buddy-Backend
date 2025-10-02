const { UserModal } = require('../Models/UserModel');
const { verifyJwt } = require('../Utils/Jwt');

const tokenChecker = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Invalid token format.' });
  }

  try {
    const decoded = await verifyJwt(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Token is invalid.' });
    }

    const user = await UserModal.findById(decoded._id).populate('currentSubscription');

    if (!user) {
      return res.status(404).json({ message: 'User not found please signup first.' });
    }

    if (!user.verified) {
      return res.status(401).json({ message: 'Your email is not verified, Please verify first.' });
    }

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }

    req.query.userId = decoded._id;
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }
    if (err?.message.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        message: 'Slow internet or database is unreachable. Please try again later.',
      });
    }
    return res.status(403).json({ message: 'Error occuring while verifying your session.' });
  }
};

module.exports = tokenChecker;
