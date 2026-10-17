const ApiError = require('../utils/apiError');

/**
 * Middleware factory for validating request parameters against a Joi schema.
 * @param {import('joi').ObjectSchema} schema Joi validation schema
 * @param {'body' | 'query' | 'params'} source Property of req to validate (default: 'body')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, ''),
      }));
      return next(ApiError.unprocessableEntity('Validation Error', errorDetails));
    }

    req[source] = value;
    return next();
  };
};

module.exports = validate;
