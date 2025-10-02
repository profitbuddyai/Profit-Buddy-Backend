const { FBA_Inbound_Placement_Fees_Chart, FBA_Storage_Fee_Chart } = require('../Enums/AmazonConstant');
const { OunceToPound, gramsToPounds, mmToInch, getProductSize } = require('./Converter');

const getFBAInboundPlacementFees = (width, length, height, weight) => {
  const convertedWidth = mmToInch(width);
  const convertedLength = mmToInch(length);
  const convertedHeight = mmToInch(height);
  const convertedWeight = gramsToPounds(weight);

  if (!convertedWidth || !convertedLength || !convertedHeight || !convertedWeight || convertedWeight <= 0) {
    const defaultFees = FBA_Inbound_Placement_Fees_Chart.smallStandard.weightLimits['16 oz or less'];
    return {
      minimal: defaultFees?.minimal ?? 0,
      partial: defaultFees?.partial ?? 0,
      optimized: defaultFees?.optimized ?? 0,
    };
  }
  
  const weightLb = OunceToPound(convertedWeight);
  const dims = [convertedWidth, convertedLength, convertedHeight].sort((a, b) => b - a);

  function fits(maxDims) {
    const sorted = [...maxDims].sort((a, b) => b - a);
    return dims[0] <= sorted[0] && dims[1] <= sorted[1] && dims[2] <= sorted[2];
  }

  let category = null;

  if (fits(FBA_Inbound_Placement_Fees_Chart.smallStandard.maxDimensions) && convertedWeight <= 16) {
    category = 'smallStandard';
  } else if (fits(FBA_Inbound_Placement_Fees_Chart.largeStandard.maxDimensions) && weightLb <= 20) {
    category = 'largeStandard';
  } else if (fits(FBA_Inbound_Placement_Fees_Chart.largeBulky.maxDimensions) && weightLb <= 50) {
    category = 'largeBulky';
  }

  if (!category) {
    return { minimal: null, partial: null, optimized: null };
  }

  const limits = FBA_Inbound_Placement_Fees_Chart[category].weightLimits;
  let matched = null;

  for (const [range, fees] of Object.entries(limits)) {
    if (category === 'smallStandard' && convertedWeight <= 16) matched = fees;
    if (category === 'largeStandard') {
      if (range.includes('12 oz or less') && convertedWeight <= 12) matched = fees;
      if (range.includes('12+ oz to 1.5 lb') && convertedWeight > 12 && weightLb <= 1.5) matched = fees;
      if (range.includes('1.5+ lb to 3 lb') && weightLb > 1.5 && weightLb <= 3) matched = fees;
      if (range.includes('3+ lb to 20 lb') && weightLb > 3 && weightLb <= 20) matched = fees;
    }
    if (category === 'largeBulky') {
      if (range.includes('5 lb or less') && weightLb <= 5) matched = fees;
      if (range.includes('5+ lb to 12 lb') && weightLb > 5 && weightLb <= 12) matched = fees;
      if (range.includes('12+ lb to 28 lb') && weightLb > 12 && weightLb <= 28) matched = fees;
      if (range.includes('28+ lb to 42 lb') && weightLb > 28 && weightLb <= 42) matched = fees;
      if (range.includes('42+ lb to 50 lb') && weightLb > 42 && weightLb <= 50) matched = fees;
    }
  }

  return {
    minimal: matched?.minimal ?? 0,
    partial: matched?.partial ?? 0,
    optimized: matched?.optimized ?? 0,
  };
};

const CalcShippingFee = (weightInGrams) => {
  const weight = gramsToPounds(weightInGrams);
  return weight * 0.6;
};

const calculateStorageFee = ({ length, width, height, weight, storageMonths, isDangerous = false }) => {
  const convertedLength = mmToInch(length);
  const convertedWidth = mmToInch(width);
  const convertedHeight = mmToInch(height);
  const convertedWeight = gramsToPounds(weight);

  const productSize = getProductSize({ length: convertedLength, width: convertedWidth, height: convertedHeight, weight: convertedWeight });

  const cubicFeet = (convertedLength * convertedWidth * convertedHeight) / 1728;
  const weeks = storageMonths * 4.345;

  const currentMonth = new Date().getMonth() + 1;
  const season = currentMonth >= 10 && currentMonth <= 12 ? 'peak' : 'off_peak';

  if (isDangerous) {
    const rate = FBA_Storage_Fee_Chart?.[season].dangerous[productType];
    return cubicFeet * rate;
  }

  let tier;
  if (weeks <= 22) tier = 'below_22_weeks';
  else if (weeks <= 28) tier = '22_28_weeks';
  else if (weeks <= 36) tier = '28_36_weeks';
  else if (weeks <= 44) tier = '36_44_weeks';
  else if (weeks <= 52) tier = '44_52_weeks';
  else tier = '52_plus_weeks';

  const fees = FBA_Storage_Fee_Chart?.[season][productSize][tier];
  const totalFee = cubicFeet * (fees.base + fees.surcharge);

  return totalFee;
};

module.exports = { getFBAInboundPlacementFees, CalcShippingFee, calculateStorageFee };
