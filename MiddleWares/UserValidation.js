const Joi = require('joi');

const userRegisterValidate = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().pattern(/^\S+$/).messages({
      'any.required': 'Email is required',
      'string.email': 'Invalid email format',
      'string.pattern.base': 'Email must not contain spaces',
    }),
    password: Joi.string()
      .min(6)
      .required()
      .pattern(/^[\w!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]+$/)
      .messages({
        'any.required': 'Password is required',
        'string.min': 'Password must be at least 6 characters',
        'string.pattern.base': 'Password must not contain spaces and should include special characters if needed',
      }),
    terms: Joi.boolean().valid(true).messages({
      'any.only': 'Please accept the Terms and Conditions',
    }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  next();
};

const userLoginValidate = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().pattern(/^\S+$/).messages({
      'any.required': 'Email is required',
      'string.email': 'Invalid email format',
      'string.pattern.base': 'Email must not contain spaces',
    }),
    password: Joi.string()
      .min(6)
      .required()
      .pattern(/^[\w!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]+$/)
      .messages({
        'any.required': 'Password is required',
        'string.min': 'Password must be at least 6 characters',
        'string.pattern.base': 'Password must not contain spaces and should include special characters if needed',
      }),
  });
  const { error, value } = schema.validate(req?.body || {});
  if (error) {
    const errorMessages = error.details.map((err) => err.message);
    return res.status(400).json({
      message: errorMessages[0],
    });
  }
  next();
};

module.exports = { userRegisterValidate, userLoginValidate };
