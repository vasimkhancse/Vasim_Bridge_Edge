const env = require('../config/env');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log error for debugging
  if (env.NODE_ENV !== 'test') {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl, method: req.method });
  }

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with invalid ID: ${err.value}`;
    error = ApiError.badRequest(message);
  }

  // Handle Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate value '${value}' entered for unique field '${field}'.`;
    error = ApiError.conflict(message);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    error = ApiError.unprocessableEntity('Database Validation Failed', errors);
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid JWT token');
  }

  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('JWT token has expired');
  }

  // Fallback for unexpected errors
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: error.errors || [],
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

module.exports = errorHandler;
