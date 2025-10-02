const jwt = require("jsonwebtoken");

const generateJwtToken = async (payload) => {
  const secretKey = process.env.SECRET;
  const oneMonthInSeconds = 30 * 24 * 60 * 60;
  return jwt.sign(payload, secretKey, { expiresIn: oneMonthInSeconds });
};

const verifyJwt = async (token) => {
  const cleanToken = token.replace(/^"|"$/g, ""); // Remove quotes from token
  const secretKey = process.env.SECRET;
  const decoded = jwt.verify(cleanToken, secretKey);
  return decoded;
};

module.exports = { generateJwtToken, verifyJwt };
