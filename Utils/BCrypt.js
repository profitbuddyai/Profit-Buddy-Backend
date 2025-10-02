const bcrypt = require("bcrypt");

const generateHash = async (password, saltRounds = 10) => {
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error("Error hashing the password: " + error.message);
  }
};

const compareHash = async (upcomingPassword, userPassword) => {
  try {
    const comparedResult = await bcrypt.compare(upcomingPassword, userPassword);
    return comparedResult;
  } catch (error) {
    throw new Error("Error Comparing the password: " + error.message);
  }
};

module.exports = { generateHash, compareHash };
