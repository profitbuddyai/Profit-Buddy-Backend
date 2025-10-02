module.exports = {
  gramsToPounds: (g) => g / 453.592,
  gramsToOunce: (g) => g / 28.35,
  OunceToPound: (g) => g / 16,
  gramsToKilo: (g) => g / 1000,
  mmToInch: (g) => g / 25.4,
  mmToCm: (g) => g / 10,
  mmToMeter: (g) => g / 1000,
  getProductSize: ({ length, width, height, weight }) => {
    const dims = [length, width, height].sort((a, b) => b - a);
    const [L, M, S] = dims;

    if (weight <= 1 && L <= 15 && M <= 12 && S <= 0.75) {
      return 'standard';
    }
    if (weight <= 20 && L <= 18 && M <= 14 && S <= 8) {
      return 'standard';
    }
    if (weight <= 50 && L <= 59 && M <= 33 && S <= 33 && L + 2 * (M + S) <= 130) {
      return 'oversize';
    }
    if (weight > 50 || L > 59 || M > 33 || S > 33 || L + 2 * (M + S) > 130) {
      return 'oversize';
    }

    return 'oversize';
  },
  getDateAfterMonths: (months) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  },
};
