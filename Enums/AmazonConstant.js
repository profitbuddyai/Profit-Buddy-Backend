const FBA_Inbound_Placement_Fees_Chart = {
  smallStandard: {
    maxDimensions: [15, 12, 0.75],
    weightLimits: {
      '16 oz or less': {
        minimal: 0.3,
        optimized: 0,
      },
    },
  },
  largeStandard: {
    maxDimensions: [18, 14, 8],
    weightLimits: {
      '12 oz or less': {
        minimal: 0.34,
      },
      '12+ oz to 1.5 lb': {
        minimal: 0.41,
      },
      '1.5+ lb to 3 lb': {
        minimal: 0.49,
      },
      '3+ lb to 20 lb': {
        minimal: 0.68,
      },
    },
  },
  largeBulky: {
    maxDimensions: [59, 33, 33],
    weightLimits: {
      '5 lb or less': {
        minimal: 1.6,
        partial: 1.1,
        optimized: 0,
      },
      '5+ lb to 12 lb': {
        minimal: 2.4,
        partial: 1.75,
      },
      '12+ lb to 28 lb': {
        minimal: 3.5,
        partial: 2.19,
      },
      '28+ lb to 42 lb': {
        minimal: 4.95,
        partial: 2.83,
      },
      '42+ lb to 50 lb': {
        minimal: 5.95,
        partial: 3.32,
      },
    },
  },
};

const FBA_Storage_Fee_Chart = {
  off_peak: {
    standard: {
      below_22_weeks: { base: 0.78, surcharge: 0 },
      '22_28_weeks': { base: 0.78, surcharge: 0.44 },
      '28_36_weeks': { base: 0.78, surcharge: 0.76 },
      '36_44_weeks': { base: 0.78, surcharge: 1.16 },
      '44_52_weeks': { base: 0.78, surcharge: 1.58 },
      '52_plus_weeks': { base: 0.78, surcharge: 1.88 },
    },
    oversize: {
      below_22_weeks: { base: 0.56, surcharge: 0 },
      '22_28_weeks': { base: 0.56, surcharge: 0.23 },
      '28_36_weeks': { base: 0.56, surcharge: 0.46 },
      '36_44_weeks': { base: 0.56, surcharge: 0.63 },
      '44_52_weeks': { base: 0.56, surcharge: 0.76 },
      '52_plus_weeks': { base: 0.56, surcharge: 1.26 },
    },
    dangerous: { standard: 0.99, oversize: 0.78 },
  },
  peak: {
    standard: {
      below_22_weeks: { base: 2.4, surcharge: 0 },
      '22_28_weeks': { base: 2.4, surcharge: 0.44 },
      '28_36_weeks': { base: 2.4, surcharge: 0.76 },
      '36_44_weeks': { base: 2.4, surcharge: 1.16 },
      '44_52_weeks': { base: 2.4, surcharge: 1.58 },
      '52_plus_weeks': { base: 2.4, surcharge: 1.88 },
    },
    oversize: {
      below_22_weeks: { base: 1.4, surcharge: 0 },
      '22_28_weeks': { base: 1.4, surcharge: 0.23 },
      '28_36_weeks': { base: 1.4, surcharge: 0.46 },
      '36_44_weeks': { base: 1.4, surcharge: 0.63 },
      '44_52_weeks': { base: 1.4, surcharge: 0.76 },
      '52_plus_weeks': { base: 1.4, surcharge: 1.26 },
    },
    dangerous: { standard: 3.63, oversize: 2.43 },
  },
};

module.exports = { FBA_Inbound_Placement_Fees_Chart, FBA_Storage_Fee_Chart };
