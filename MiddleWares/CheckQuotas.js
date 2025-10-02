const { PLAN_QUOTAS } = require('../Enums/OurConstant');

const checkAiQuota = async (req, res, next) => {
  const user = req.user;
  const userPlan = user?.currentSubscription;

  if (!userPlan || userPlan?.status !== 'active') {
    return res.status(403).json({ message: 'No active plan found' });
  }

  const limit = PLAN_QUOTAS?.[userPlan?.planName]?.aiChat;
  const used = user.quotasUsed.aiChat || 0;

  if (limit !== -1 && used >= limit) {
    return res.status(403).json({ message: 'AI chat quota exceeded for your plan' });
  }

  next();
};

module.exports = { checkAiQuota };
