const { HistoryModal } = require('../Models/HistoryModel');
const { isValidASIN } = require('../Utils/Validator');

const { getProductsFromKeepa } = require('../Services/Keepa.service');
const { extractNeededDataFromHistoryProduct } = require('../Utils/ExtractNeededData');

const getHistoryData = async (req, res) => {
  try {
    const { userId, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const totalCount = await HistoryModal.countDocuments({ userRef: userId });

    const histories = await HistoryModal.find({ userRef: userId })
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (!histories.length) {
      return res.json({ success: true, data: [], totalCount });
    }

    const asins = histories.map((h) => h.asin).join(',');

    const fetchedResult = await getProductsFromKeepa(asins);

    const finalResult = fetchedResult?.products?.map((product) => {
      const historyEntry = histories.find((h) => h.asin === product.asin);
      return {
        ...extractNeededDataFromHistoryProduct(product),
        updatedAt: historyEntry?.updatedAt || null,
      };
    });

    return res.json({ success: true, products: finalResult, totalCount });
  } catch (error) {
    console.error('getHistoryData error:', error);
    if (error.message.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        message: 'Slow internet or database is unreachable. Please try again later.',
      });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const upsertHistory = async (req, res) => {
  try {
    const { asin, ...historyData } = req.body;
    const { userId } = req.query;

    if (!asin) {
      return res.status(400).json({ success: false, message: 'ASIN is required' });
    }

    if (!isValidASIN(asin)) {
      return res.status(400).json({ success: false, message: 'ASIN should be valid asin' });
    }

    historyData.updatedAt = new Date();

    const history = await HistoryModal.findOneAndUpdate(
      { asin, userRef: userId },
      { $set: historyData, $setOnInsert: { asin, userRef: userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, history });
  } catch (error) {
    console.error('upsertHistory error:', error);
    if (error.message.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        message: 'Slow internet or database is unreachable. Please try again later.',
      });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getHistoryData, upsertHistory };
