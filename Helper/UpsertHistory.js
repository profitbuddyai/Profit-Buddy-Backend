// const { HistoryModal } = require('../Models/HistoryModel');

// const upsertHistory = async (asin, userId, buyCost = 0) => {
//   try {
//     const update = { updatedAt: new Date() };
//     if (buyCost !== null) {
//       update.buyCost = buyCost;
//     }

//     const history = await HistoryModal.findOneAndUpdate({ asin, userRef: userId }, { $set: update, $setOnInsert: { asin, userRef: userId } }, { upsert: true, new: true });

//     return history;
//   } catch (error) {
//     console.error('Error in upsertHistory:', error);
//     throw error;
//   }
// };

// module.exports = { upsertHistory };
