const { getSellerInfoFromKeepa, getCategoryInfoFromKeepa, getProductsFromKeepa } = require('../Services/Keepa.service');
const { extractNeededDataFromSeller, enrichSellersWithCategoryName } = require('../Utils/ExtractNeededData');
const { calculateSellerMetricsLast30Days } = require('../Utils/SellerUtil');

const getSellerInfo = async (req, res) => {
  try {
    const { sellerId, wantsDetailInfo = false } = req.query;
    if (!sellerId) {
      return res.status(400).json({ success: false, message: 'Seller Id is required' });
    }

    const Sellers = await getSellerInfoFromKeepa(sellerId, { storefront: wantsDetailInfo ? 1 : 0 });

    if (!Sellers?.[sellerId] || !Object?.keys(Sellers?.[sellerId]).length) {
      return res.status(400).json({ success: false, message: 'Oops, No seller found with that ID.' });
    }

    const formatedSellerData = extractNeededDataFromSeller(Sellers?.[sellerId]);

    const categoryIds = [...new Set(formatedSellerData.categories.map((c) => c.id))];
    const categoryIdParam = categoryIds.join(',');

    const CategoryInfo = await getCategoryInfoFromKeepa(categoryIdParam);

    const enrichedSeller = enrichSellersWithCategoryName(formatedSellerData, CategoryInfo);

    return res.status(200).json({ success: true, seller: enrichedSeller });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const calculateSellerRevenue = async (req, res) => {
  try {
    const { sellerAsins, sellerId } = req.query;
    if (!sellerAsins || !sellerId) {
      return res.status(400).json({ success: false, message: 'Seller Asins and Seller ID is required' });
    }

    
    const sellerProducts =await getProductsFromKeepa(sellerAsins, { stock: 1, offers: 20, 'only-live-offers': 1, history: 1, days: 30 });
    if (!sellerProducts?.products || !Object.keys(sellerProducts?.products)?.length) {
      return res.status(400).json({ success: false, message: 'No product found for this seller' });
    }
    const sellerRevenueKeys = calculateSellerMetricsLast30Days(sellerProducts?.products, sellerId);
    const SellerRevenue = sellerRevenueKeys?.finalMetric;
    return res.status(200).json({ success: true, sellerRevenue: SellerRevenue || 0 });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
module.exports = { getSellerInfo , calculateSellerRevenue };
