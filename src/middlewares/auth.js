const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authentication middleware: Verifies JWT token and attaches user to req.user
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(ApiError.unauthorized('Authentication token is missing. Please log in.'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(ApiError.unauthorized('The user belonging to this token no longer exists.'));
    }

    if (!user.isActive) {
      return next(ApiError.unauthorized('This user account has been deactivated.'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Session expired. Please log in again.'));
    }
    return next(ApiError.unauthorized('Invalid authentication token.'));
  }
});

/**
 * Authorization middleware factory: Restricts route to specific user roles
 * @param  {...string} roles Allowed roles ('admin', 'teacher', 'student')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Role '${req.user.role}' is not authorized to perform this operation. Allowed: [${roles.join(', ')}]`
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
