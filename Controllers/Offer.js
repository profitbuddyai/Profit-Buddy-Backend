const { QUERY_FOR_FETCH_OFFER_DATA } = require('../Enums/KeepaConstant');
const { getSellerInfoFromKeepa, getProductsFromKeepa } = require('../Services/Keepa.service');
const { enrichOffersWithSeller, extractOffersFromProduct } = require('../Utils/ExtractNeededData');

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

    const sellerIds = [...new Set(finalizedOffer.offers.map((o) => o.sellerId))];
    const sellerIdParam = sellerIds.join(',');

    const sellerInfo = await getSellerInfoFromKeepa(sellerIdParam);

    const enrichedOffers = enrichOffersWithSeller(finalizedOffer, sellerInfo);

    return res.status(200).json({ success: true, asin: asin, offer: enrichedOffers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch offers from Keepa at the moment.' });
  }
};

module.exports = { getOffersOfProduct };
