const { QUERY_FOR_FETCH_PRODUCT_DATA } = require('../Enums/KeepaConstant');
const { getGraphImageFromKeepa, getProductsFromKeepa } = require('../Services/Keepa.service');
const { extractGraphDataFromProduct } = require('../Utils/ExtractNeededData');
const { isValidASIN } = require('../Utils/Validator');

const getGraphImage = (req, res) => {
  const { asin } = req.query;
  if (!asin) {
    return res.status(400).json({ success: false, message: 'ASIN is required' });
  }
  getGraphImageFromKeepa(asin, res);
};

const getGraphData = async (req, res) => {
  try {
    const { asin, days } = req.query;
    if (!asin || !isValidASIN(asin)) {
      return res.status(400).json({ success: false, message: 'ASIN should be valid asin' });
    }

    const keepaProducts = await getProductsFromKeepa(asin, days && days !== 'all' ? { ...QUERY_FOR_FETCH_PRODUCT_DATA, days: days } : {});

    if (!keepaProducts?.products || !keepaProducts?.products.length === 0) {
      return res.status(400).json({ success: false, message: 'Oops, No product matching with that asin.' });
    }

    const graphData = extractGraphDataFromProduct(keepaProducts?.products[0], days);

    return res.status(200).json({ success: true, grpahData: graphData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getGraphImage, getGraphData };
