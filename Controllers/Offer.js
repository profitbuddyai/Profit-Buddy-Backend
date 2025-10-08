const { AMAZON_SELLER_ID } = require('../Enums/AmazonConstant');
const { QUERY_FOR_FETCH_OFFER_DATA } = require('../Enums/KeepaConstant');
const { buyBoxSellerIds } = require('../Enums/OurConstant');
const { getSellerInfoFromKeepa, getProductsFromKeepa } = require('../Services/Keepa.service');
const { enrichOffersWithSeller, extractOffersFromProduct } = require('../Utils/ExtractNeededData');
const { mapSellerData, getUniqueIds } = require('../Utils/GraphCsvUtils');

const getOffersOfProduct = async (req, res) => {
  try {
    const { asin } = req.query;
    if (!asin) {
      return res.status(400).json({ success: false, message: 'Asin is required' });
    }

    const offersResult = await getProductsFromKeepa(asin, QUERY_FOR_FETCH_OFFER_DATA);

    if (!offersResult?.products || !offersResult?.products?.length === 0 || offersResult?.products[0]?.offers?.length === 0) {
      return res.status(400).json({ success: false, message: 'Oops, This product has no offers.' });
    }

    const finalizedOffer = extractOffersFromProduct(offersResult?.products?.[0]);

    if (!finalizedOffer || Object.keys(finalizedOffer)?.length === 0) {
      return res.status(400).json({ success: false, message: 'Oops, This product has no offers.' });
    }
    const buyBoxSellerHistory = mapSellerData(offersResult?.products?.[0]?.buyBoxSellerIdHistory || []);
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    const recentBuyBoxSellers = (buyBoxSellerHistory || []).filter((obj) => obj.date >= ninetyDaysAgo).map((obj) => obj.sellerId);
    const sellerIds = [...finalizedOffer.offers.map((offer) => offer.sellerId), ...recentBuyBoxSellers];
    let uniqueSellerIds = getUniqueIds(sellerIds);
    if (uniqueSellerIds.length > 100) {
      uniqueSellerIds = uniqueSellerIds.slice(0, 100);
    }

    const sellerIdParam = uniqueSellerIds.join(',');
    

    const sellerInfo = await getSellerInfoFromKeepa(sellerIdParam);

    const enrichedOffers = enrichOffersWithSeller(finalizedOffer, sellerInfo);

    const sellerData = Object.values(sellerInfo)?.reduce((acc, seller) => {
      acc[seller?.sellerId] = {
        name: seller?.sellerName,
        ratingCount: seller?.currentRatingCount,
        rating: seller?.currentRating ? (seller?.currentRating / 100) * 5 : 0,
        id: seller?.sellerId,
        sellerType: seller?.sellerId === AMAZON_SELLER_ID ? 'AMZ' : seller?.hasFBA ? 'FBA' : 'FBM',
      };
      return acc;
    }, {});

    return res.status(200).json({ success: true, asin: asin, offer: enrichedOffers, buyBoxSellerHistory, sellerData });
  } catch (error) {
    console.error(error);

    return res.status(500).json({ success: false, message: 'Unable to fetch offers from Keepa at the moment.', error });
  }
};

module.exports = { getOffersOfProduct };
