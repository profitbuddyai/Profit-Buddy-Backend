const {
  AMAZON_IMAGE_BASE_URL,
  RATING_CONSTANT,
  REVIEW_COUNT_CONSTANT,
  BUYBOX_PRICE_HISTORY_CONSTANT,
  SALES_RANK_HISTORY_CONSTANT,
  NEW_FBM_PRICE_HISTORY_CONSTANT,
  NEW_FBA_PRICE_HISTORY_CONSTANT,
  AMAZON_PRICE_HISTORY_CONSTANT,
  NEW_PRICE_HISTORY_CONSTANT,
  OFFER_COUNT_HISTORY_CONSTANT,
  LIST_PRICE_HISTORY_CONSTANT,
} = require('../Enums/KeepaConstant');
const { gramsToPounds, gramsToOunce, mmToInch, mmToCm } = require('./Converter');
const { buildFlatGraphData, extractGraphData, priceTransform, rankTransform, getAggregateHistoryDays } = require('./GraphCsvUtils');
const { getFBAInboundPlacementFees, CalcShippingFee, calculateStorageFee } = require('./FeeCalc');
const { HistoryModal } = require('../Models/HistoryModel');

const extractNeededDataFromProduct = (product) => {
  if (!product) return {};

  const extractedData = {};
  const csv = product.csv || [];

  // Images
  if (product.images?.length) {
    extractedData.images = product.images.map((img) => `${AMAZON_IMAGE_BASE_URL}${img?.l || img?.m}`);
  }

  // Basic info
  if (product.title) extractedData.title = product.title;
  if (product.asin) extractedData.asin = product.asin;
  if (product.categoryTree?.length) extractedData.category = product.categoryTree[0]?.name || 'Uncategorized';
  if (product.brand) extractedData.brand = product.brand;
  if (product.buyBoxSellerIdHistory?.length) extractedData.sellerId = product?.buyBoxSellerIdHistory?.at(-1);

  // Reviews
  const ratingHistory = csv[RATING_CONSTANT] || [];
  const reviewCountHistory = csv[REVIEW_COUNT_CONSTANT] || [];
  extractedData.reviews = {};
  if (ratingHistory.length) extractedData.reviews.rating = ratingHistory.at(-1) / 10 || 0;
  if (reviewCountHistory.length) extractedData.reviews.count = reviewCountHistory.at(-1) || 0;

  // Info
  const buyboxHistory = csv[BUYBOX_PRICE_HISTORY_CONSTANT] || [];
  const newPriceHistory = csv[NEW_PRICE_HISTORY_CONSTANT] || [];
  const amazonPriceHistory = csv[AMAZON_PRICE_HISTORY_CONSTANT] || [];
  const listPriceHistory = csv[LIST_PRICE_HISTORY_CONSTANT] || [];
  const salesRankHistory = csv[SALES_RANK_HISTORY_CONSTANT] || [];
  const offerCountHistory = csv[OFFER_COUNT_HISTORY_CONSTANT] || [];

  extractedData.info = {};

  const getLastPrice = (arr, position = -1) => {
    if (!arr.length) return null;
    return arr.at(position) / 100;
  };

  if (buyboxHistory.at(-2) / 100 > 0) extractedData.info.salePrice = buyboxHistory.at(-2) / 100;
  else {
    const candidates = [getLastPrice(newPriceHistory), getLastPrice(amazonPriceHistory), getLastPrice(listPriceHistory)].filter((p) => p > 0);
    const validSalePrice = candidates.length ? Math.min(...candidates) : 0;
    const shippingFee = CalcShippingFee(product.packageWeight ?? product.itemWeight);

    extractedData.info.salePrice = validSalePrice + shippingFee;
  }

  if (amazonPriceHistory.length) extractedData.info.amazonPrice = amazonPriceHistory.at(-1) / 100 || 0;
  if (buyboxHistory.length) extractedData.info.buybox = buyboxHistory.at(-2) / 100 || 0;
  if (listPriceHistory.length) extractedData.info.listPrice = listPriceHistory.at(-1) / 100 || 0;
  if (newPriceHistory.length) extractedData.info.newPrice = newPriceHistory.at(-1) / 100 || 0;
  if (salesRankHistory.length) extractedData.info.sellRank = salesRankHistory.at(-1) || 0;
  if (offerCountHistory.length) extractedData.info.offerCount = offerCountHistory.at(-1) || 0;
  if (product.monthlySold) extractedData.info.monthlySold = product.monthlySold;
  if (product.competitivePriceThreshold) extractedData.info.competitivePriceThreshold = product.competitivePriceThreshold / 100;

  // Dimension
  extractedData.dimension = {};
  if (product.packageWidth) extractedData.dimension.width = `${mmToCm(product.packageWidth).toFixed(2)} cm (${mmToInch(product.packageWidth).toFixed(2)} in)`;
  if (product.packageLength) extractedData.dimension.length = `${mmToCm(product.packageLength).toFixed(2)} cm (${mmToInch(product.packageLength).toFixed(2)} in)`;
  if (product.packageHeight) extractedData.dimension.height = `${mmToCm(product.packageHeight).toFixed(2)} cm (${mmToInch(product.packageHeight).toFixed(2)} in)`;
  if (product.packageWeight) extractedData.dimension.weight = `${gramsToPounds(product.packageWeight).toFixed(2)} lb (${gramsToOunce(product.packageWeight).toFixed(2)} oz)`;

  // Fees
  extractedData.fees = {};
  if (product.fbaFees?.pickAndPackFee) extractedData.fees.fbaFees = product.fbaFees.pickAndPackFee / 100;
  if (product.referralFeePercent) extractedData.fees.referralFeePercent = product.referralFeePercent / 100;
  if (product.packageWeight ?? product.itemWeight) extractedData.fees.inboundShippingFee = CalcShippingFee(product.packageWeight ?? product.itemWeight);
  extractedData.fees.inboundPlacementFee = getFBAInboundPlacementFees(product.packageWidth, product.packageLength, product.packageHeight, product.packageWeight);
  extractedData.fees.storageFees = calculateStorageFee({
    width: product.packageWidth,
    length: product.packageLength,
    height: product.packageHeight,
    weight: product.packageWeight,
    storageMonths: 1,
    isDangerous: product?.isDangerous || false,
  });

  // Graph History Length
  extractedData.historyLength = getAggregateHistoryDays(csv);

  // Graph data
  extractedData.graphData = extractGraphDataFromProduct(product, 90);

  return extractedData;
};

const extractNeededDataFromHistoryProduct = (product) => {
  if (!product) return {};
  const csv = product.csv || [];

  const extractedData = {};

  // Images
  if (product.images?.length) {
    extractedData.images = product.images.map((img) => `${AMAZON_IMAGE_BASE_URL}${img?.l || img?.m}`);
  }

  // Basic info
  if (product.title) extractedData.title = product.title;
  if (product.asin) extractedData.asin = product.asin;
  if (product.categoryTree?.length) extractedData.category = product.categoryTree[0]?.name || 'Uncategorized';
  if (product.brand) extractedData.brand = product.brand;

  // Dimension
  extractedData.dimension = {};
  if (product.packageWidth) extractedData.dimension.width = `${mmToCm(product.packageWidth).toFixed(2)} cm (${mmToInch(product.packageWidth).toFixed(2)} in)`;
  if (product.packageLength) extractedData.dimension.length = `${mmToCm(product.packageLength).toFixed(2)} cm (${mmToInch(product.packageLength).toFixed(2)} in)`;
  if (product.packageHeight) extractedData.dimension.height = `${mmToCm(product.packageHeight).toFixed(2)} cm (${mmToInch(product.packageHeight).toFixed(2)} in)`;
  if (product.packageWeight) extractedData.dimension.weight = `${gramsToPounds(product.packageWeight).toFixed(2)} lb (${gramsToOunce(product.packageWeight).toFixed(2)} oz)`;

  return extractedData;
};

const extractOffersFromProduct = (product) => {
  if (!product?.liveOffersOrder?.length || !product?.offers?.length) return {};

  const { liveOffersOrder, offers } = product;

  const availableOffers = liveOffersOrder
    .map((index) => offers[index])
    .filter((offer) => offer?.condition === 1)
    .map((offer) => {
      const stock = offer.stockCSV?.length ? offer.stockCSV.at(-1) : false;
      const price = offer.offerCSV?.length >= 2 ? offer.offerCSV.at(-2) / 100 : null;

      let seller = offer.isAmazon ? 'AMZ' : offer.isFBA ? 'FBA' : 'FBM';

      const shippingFee = CalcShippingFee(product?.packageWeight ?? product?.itemWeight);
      const finalPrice = seller === 'FBM' ? price + shippingFee : price;

      return {
        stock,
        price: finalPrice,
        seller,
        sellerId: offer.sellerId,
        condition: offer.condition,
      };
    });

  const totalOfferCount = availableOffers.length;
  const amazonOfferCount = availableOffers.filter((o) => o.seller === 'AMZ').length;
  const fbaOfferCount = availableOffers.filter((o) => o.seller === 'FBA').length;
  const fbmOfferCount = availableOffers.filter((o) => o.seller === 'FBM').length;

  return {
    totalOfferCount,
    amazonOfferCount,
    fbaOfferCount,
    fbmOfferCount,
    offers: availableOffers,
  };
};

const extractNeededDataFromSeller = (seller) => {
  if (!seller) return {};

  const extractedData = {};

  // Basic info
  if (seller.sellerName) extractedData.name = seller.sellerName;
  if (seller.sellerId) extractedData.id = seller.sellerId;
  extractedData.shipsFrom = seller.shipsFromChina ? 'China' : 'Local Warehouse';

  if (Array.isArray(seller.totalStorefrontAsins)) {
    extractedData.totalAsins = seller.totalStorefrontAsins.at(-1) || 0;
  }

  // Ratings
  if (seller.currentRating || seller.currentRatingCount) {
    extractedData.rating = ((seller.currentRating || 0) / 100) * 5;
    extractedData.ratingCount = seller.currentRatingCount || 0;
  }

  // Scammer
  extractedData.scammer = !!seller.isScammer;

  // Phone
  if (seller?.phoneNumber) extractedData.phone = seller.phoneNumber;

  // Brands
  if (seller?.sellerBrandStatistics?.length) {
    extractedData.brands = seller.sellerBrandStatistics.map((b) => ({
      name: b.brand,
      count: b.productCount,
    }));
  }

  // Categories
  if (seller?.sellerCategoryStatistics?.length) {
    extractedData.categories = seller.sellerCategoryStatistics.map((c) => ({
      id: c.catId,
      count: c.productCount,
    }));
  }

  return extractedData;
};

const enrichOffersWithSeller = (offerData, sellers) => {
  const enrichedOffers = offerData?.offers?.map((offer) => {
    const seller = sellers?.[offer.sellerId];

    return {
      ...offer,
      sellerInfo: seller
        ? {
            name: seller?.sellerName,
            ratingCount: seller?.currentRatingCount,
            rating: seller?.currentRating ? (seller?.currentRating / 100) * 5 : 0,
            id: offer?.sellerId,
          }
        : null,
    };
  });

  return { ...offerData, offers: enrichedOffers };
};

const enrichSellersWithCategoryName = (sellerData, categories) => {
  const enrichedCategories = sellerData?.categories?.map((category) => {
    const { name, catId } = categories?.[category.id] || {};

    return {
      ...category,
      name: name,
    };
  });

  return { ...sellerData, categories: enrichedCategories };
};

const extractGraphDataFromProduct = (product, days) => {
  if (!product) return {};

  const graphData = {};
  const csv = product.csv || [];

  if (csv?.length) {
    const graphConfigs = {
      keepaGraphData: {
        keys: {
          buyboxHistory: BUYBOX_PRICE_HISTORY_CONSTANT,
          amazonHistory: AMAZON_PRICE_HISTORY_CONSTANT,
          salesRankHistory: SALES_RANK_HISTORY_CONSTANT,
          newPriceHistory: NEW_PRICE_HISTORY_CONSTANT,
          offerCountHistory: OFFER_COUNT_HISTORY_CONSTANT,
          monthlySoldHistory: product?.monthlySoldHistory || [],
        },
        series: [
          { key: 'buyBox', source: 'buyboxHistory', step: 3, transform: priceTransform, fillNull: false },
          { key: 'amazon', source: 'amazonHistory', step: 2, transform: priceTransform, fillNull: false },
          { key: 'salesRank', source: 'salesRankHistory', step: 2, transform: rankTransform, fillNull: false },
          { key: 'newPrice', source: 'newPriceHistory', step: 2, transform: priceTransform, fillNull: false },
          { key: 'offerCount', source: 'offerCountHistory', step: 2, transform: rankTransform, fillNull: false },
          { key: 'monthlySold', source: 'monthlySoldHistory', step: 2, transform: rankTransform, fillNull: false },
        ],
      },
    };

    for (const [graphName, config] of Object.entries(graphConfigs)) {
      const graphRawData = extractGraphData(csv, config);
      graphData[graphName] = buildFlatGraphData(graphRawData, config.series, days ? { days } : {});
    }
  }

  return graphData;
};

const enrichHistoryDataInProducts = async (products, userId) => {
  if (!products?.length || !userId) return products;

  const asins = products.map((p) => p.asin);

  const userHistories = await HistoryModal.find({
    userRef: userId,
    asin: { $in: asins },
  }).lean();

  const historyMap = Object.fromEntries(userHistories.map((h) => [h.asin, h]));

  const finalResult = products.map((product) => ({
    ...product,
    history: {
      ...product?.history,
      buyCost: historyMap[product.asin]?.buyCost || 0,
    },
  }));

  return finalResult;
};

module.exports = {
  extractNeededDataFromProduct,
  extractNeededDataFromHistoryProduct,
  extractOffersFromProduct,
  enrichOffersWithSeller,
  extractNeededDataFromSeller,
  enrichSellersWithCategoryName,
  extractGraphDataFromProduct,
  enrichHistoryDataInProducts,
};
