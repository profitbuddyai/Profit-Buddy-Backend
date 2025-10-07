const {
  KEEPA_EPOCH_START_MINUTES,
  AMAZON_PRICE_HISTORY_CONSTANT,
  BUYBOX_PRICE_HISTORY_CONSTANT,
  NEW_PRICE_HISTORY_CONSTANT,
  SALES_RANK_HISTORY_CONSTANT,
  OFFER_COUNT_HISTORY_CONSTANT,
} = require('../Enums/KeepaConstant');

const keepaToMs = (keepaMinute) => (Number(keepaMinute) + KEEPA_EPOCH_START_MINUTES) * 60000;

const mapSellerData = (arr) => {
  const result = [];
  for (let i = 0; i < arr.length; i += 2) {
    result.push({
      date: keepaToMs(arr[i]),
      sellerId: arr[i + 1] !== -1 && arr[i + 1] !== -2 && arr[i + 1] ? arr[i + 1] : null,
    });
  }
  return result;
};

const getUniqueIds = (arr) => {
  return [...new Set(arr.filter((id) => id != null && id !== -1))];
};

const parseToMap = (arr, step, transformValue = (v) => v) => {
  const map = new Map();
  if (!Array.isArray(arr)) return map;
  for (let i = 0; i < arr.length; i += step) {
    const t = arr[i];
    const v = arr[i + 1];
    if (t == null) continue;
    map.set(Number(t), transformValue(v));
  }
  return map;
};

const priceTransform = (v, wantsNull = true, divisor = 100) => {
  if (v == null) return null;
  if (v === -1) return wantsNull ? null : -1;
  const n = Number(v);
  return Number.isNaN(n) ? null : n / divisor;
};

const rankTransform = (v, wantsNull) => {
  if (v == null) return null;
  if (v === -1) return wantsNull ? null : -1;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

const clampData = (data, days = '90') => {
  let formattedDays = Number(days);

  let now = new Date();
  const halfDayMs = 12 * 60 * 60 * 1000; // 12 hours in ms
  now = new Date(Date.now() + halfDayMs);

  const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); // local start-of-day
  let startDateTs = null;
  if (formattedDays) {
    const sd = new Date(now);
    sd.setDate(sd.getDate() - formattedDays);
    startDateTs = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate()).getTime();
  }

  let normalized = data.map((d) => ({ ...d, date: new Date(d.date).getTime() }));

  normalized = normalized.map((d) => ({ ...d, date: Math.min(d.date, todayTs) }));

  normalized.sort((a, b) => a.date - b.date);

  const byDate = new Map();
  for (const item of normalized) byDate.set(item.date, item);
  normalized = Array.from(byDate.values()).sort((a, b) => a.date - b.date);

  if (startDateTs !== null) {
    normalized = normalized.filter((d) => d.date >= startDateTs && d.date <= todayTs);

    if (normalized.length) {
      if (normalized[0].date > startDateTs) {
        normalized.unshift({ ...normalized[0], date: startDateTs });
      }
    } else {
      normalized = [{ date: startDateTs }, { date: todayTs }];
    }
  }

  if (!normalized.some((d) => d.date === todayTs)) {
    const before = [...normalized].reverse().find((d) => d.date < todayTs);
    if (before) normalized.push({ ...before, date: todayTs });
  }

  return normalized;
};

const forwardFillSeries = (result, keys, fillInitialWithFirst = false) => {
  if (!Array.isArray(result) || result.length === 0) return;

  // 1) Fill leading nulls from the first forward non-null (only if requested)
  // if (fillInitialWithFirst) {
  //   keys.forEach((k) => {
  //     // find first non-null value for this key
  //     let firstFound = null;
  //     for (let i = 0; i < result.length; i++) {
  //       const v = result[i][k];
  //       if (v !== null && v !== undefined) {
  //         firstFound = v;
  //         break;
  //       }
  //     }

  //     // if found, fill all leading null/undefined entries up to the first real value
  //     if (firstFound !== null) {
  //       for (let i = 0; i < result.length; i++) {
  //         if (result[i][k] === null || result[i][k] === undefined) {
  //           result[i][k] = firstFound;
  //         } else {
  //           // once we hit a real value, stop filling leading section
  //           break;
  //         }
  //       }
  //     }
  //   });
  // }

  // 2) Backward fill the rest of the series (propagate last seen value forward)

  keys.forEach((k) => {
    let last = null;

    for (let i = 0; i < result.length; i++) {
      const v = result[i][k];

      if ((v === null || v === undefined) && last !== null && last !== undefined) {
        result[i][k] = last;
      } else {
        last = result[i][k];
      }

      if (result[i][k] === -1) {
        result[i][k] = null;
      }
    }
  });
};

const buildFlatGraphData = (graphData, seriesConfigs, opts = {}) => {
  // NOTE: changed default fillInitialWithFirst to true so the first element
  // will take the next available value if it is null.
  const {
    priceDivisor = 100,
    forwardFill = true,
    fillInitialWithFirst = true, // <-- changed default to true
    days = 90,
  } = opts;

  const seriesMaps = {};
  const tsSet = new Set();

  seriesConfigs.forEach(({ key, source, step, transform, fillNull }) => {
    const arr = graphData[source] || [];
    const map = parseToMap(arr, step, (v) => transform(v, fillNull, priceDivisor));
    seriesMaps[key] = map;
    map.forEach((_, t) => tsSet.add(t));
  });

  const tsArray = Array.from(tsSet).sort((a, b) => a - b);

  let result = tsArray.map((keepaMinute) => {
    const ms = keepaToMs(keepaMinute);
    const date = ms;
    const entry = { date };
    for (const key in seriesMaps) {
      entry[key] = seriesMaps[key].get(keepaMinute) ?? null;
    }

    return entry;
  });

  const eligibleFillKeys = seriesConfigs.filter((c) => seriesMaps[c.key]).map((c) => c.key);

  if (forwardFill) {
    forwardFillSeries(result, eligibleFillKeys, fillInitialWithFirst);
  }

  result = clampData(result, days);

  result = result.filter((entry) => Object.keys(seriesMaps).some((k) => entry[k] !== null));

  if (result.length === 1) {
    result.push({ ...result[0] });
  }

  return result;
};

const extractGraphData = (csv, config) => {
  const graphData = {};
  for (const [key, constant] of Object.entries(config.keys)) {
    if (typeof constant === 'number') {
      if (csv[constant]?.length) {
        graphData[key] = csv[constant];
      }
    } else {
      graphData[key] = constant;
    }
  }
  return graphData;
};

const getAggregateHistoryDays = (csv) => {
  const indexes = [
    { index: AMAZON_PRICE_HISTORY_CONSTANT, step: 2 },
    { index: BUYBOX_PRICE_HISTORY_CONSTANT, step: 3 },
    { index: NEW_PRICE_HISTORY_CONSTANT, step: 2 },
    { index: SALES_RANK_HISTORY_CONSTANT, step: 2 },
    { index: OFFER_COUNT_HISTORY_CONSTANT, step: 2 },
  ];

  let earliest = Infinity;
  let latest = -Infinity;

  indexes.forEach(({ index, step }) => {
    const arr = csv[index];
    if (Array.isArray(arr) && arr.length >= step) {
      const first = keepaToMs(arr[0]);
      const last = keepaToMs(arr[arr.length - step]);
      if (first < earliest) earliest = first;
      if (last > latest) latest = last;
    }
  });

  if (earliest === Infinity || latest === -Infinity) return 0;

  const diffDays = Math.floor((latest - earliest) / (1000 * 60 * 60 * 24));
  return diffDays + 1;
};
module.exports = { extractGraphData, buildFlatGraphData, priceTransform, rankTransform, keepaToMs, getAggregateHistoryDays, parseToMap, mapSellerData, getUniqueIds };
