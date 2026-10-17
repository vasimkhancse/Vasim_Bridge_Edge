const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const apiRateLimiter =
  env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          statusCode: 429,
          message: 'Too many requests from this IP, please try again later.',
        },
      });

module.exports = apiRateLimiter;
