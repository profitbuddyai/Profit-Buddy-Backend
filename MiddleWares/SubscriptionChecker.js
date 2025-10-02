const SubscriptionChecker = (req, res, next) => {
  const sub = req.user?.currentSubscription;

  if (!sub || sub.status !== 'active' || (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date())) {
    return res.status(403).json({ message: 'Please upgrade your plan to access this feature.' });
  }

  next();
};

module.exports = { SubscriptionChecker };
