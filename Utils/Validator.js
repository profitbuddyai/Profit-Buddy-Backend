const isValidASIN = (value) => {
  return /^[A-Z0-9]{10}$/.test(value);
};
module.exports = { isValidASIN };
