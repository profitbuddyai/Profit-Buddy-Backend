const { QUERY_FOR_FETCH_PRODUCT_DATA } = require('../Enums/KeepaConstant');
const { HistoryModal } = require('../Models/HistoryModel');
const { searchProductsFromKeepa, getProductsFromKeepa, findProductsAsinsFromKeepa } = require('../Services/Keepa.service');
const { extractNeededDataFromProduct, enrichHistoryDataInProducts } = require('../Utils/ExtractNeededData');

const getProducts = async (req, res) => {
  try {
    const { asin, userId } = req.query;

    if (!asin) {
      return res.status(400).json({ success: false, message: 'Asin is required' });
    }

    const fetchedResult = await getProductsFromKeepa(asin, QUERY_FOR_FETCH_PRODUCT_DATA);

    if (!fetchedResult?.products || !fetchedResult?.products.length === 0) {
      return res.status(400).json({ success: false, message: 'Oops, No products matching with that asin.' });
    }

    const finalResult = fetchedResult?.products?.map((product) => {
      return extractNeededDataFromProduct(product);
    });

    const enrichedWithHistory = await enrichHistoryDataInProducts(finalResult, userId);

    return res.status(200).json({ success: true, products: enrichedWithHistory });
  } catch (error) {
    if (error.message.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        message: 'Slow internet or database is unreachable. Please try again later.',
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const searchProducts = async (req, res) => {
  try {
    const { searchTerm, page = 0, userId } = req.query;
    if (!searchTerm) {
      return res.status(400).json({ success: false, message: 'Search Term is required' });
    }

    const searchedResult = await searchProductsFromKeepa(searchTerm, page);

    if (!searchedResult?.asinList || !searchedResult?.asinList.length === 0) {
      return res.status(400).json({ success: false, message: 'Oops, No products matching with that search.' });
    }

    const fetchedResult = await getProductsFromKeepa(searchedResult?.asinList?.join(','), QUERY_FOR_FETCH_PRODUCT_DATA);

    if (!fetchedResult?.products || !fetchedResult?.products.length === 0) {
      return res.status(400).json({ success: false, message: 'Oops, No products matching with that search.' });
    }

    const finalResult = fetchedResult?.products?.map((product) => {
      return extractNeededDataFromProduct(product);
    });

    const enrichedWithHistory = await enrichHistoryDataInProducts(finalResult, userId);

    return res.status(200).json({ success: true, page: Number(page), products: enrichedWithHistory });
  } catch (error) {
    if (error.message.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        message: 'Slow internet or database is unreachable. Please try again later.',
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const findProductAsins = async (req, res) => {
  try {
    const { selection } = req?.query;

    if (!selection) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const asinList = await findProductsAsinsFromKeepa(selection);

    if (!asinList || !asinList.length === 0) {
      return res.status(400).json({ success: false, message: 'Oops, No Asins matching with that search.' });
    }

    return res.status(200).json({ success: true, asins: asinList });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getProducts, searchProducts, findProductAsins };
