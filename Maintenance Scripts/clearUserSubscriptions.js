const mongoose = require('mongoose');
const { UserModal } = require('../Models/UserModel');
const { SubscriptionModel } = require('../Models/SubscriptionModel');

const clearUserSubscriptions = async () => {
  try {
    const users = await UserModal.find({});
    console.log(`Found ${users.length} users`);

    // Collect all subscription IDs
    const subscriptionIds = users.filter((user) => user.currentSubscription).map((user) => user.currentSubscription);

    if (subscriptionIds.length > 0) {
      const deleteResult = await SubscriptionModel.deleteMany({ _id: { $in: subscriptionIds } });
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} subscriptions`);
    } else {
      console.log('⚠️ No user has a subscription to delete.');
    }

    // Set currentSubscription to null for all users
    const updateResult = await UserModal.updateMany({}, { $set: { currentSubscription: null } });
    console.log(`✅ Updated ${updateResult.modifiedCount} users`);

    console.log('🎉 Done! All subscriptions removed and users updated.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('🔌 Disconnected from MongoDB');
  }
};

module.exports = { clearUserSubscriptions };
