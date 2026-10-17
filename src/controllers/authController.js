const User = require('../models/User');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, department } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(ApiError.conflict(`An account with email '${email}' already exists.`));
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    password,
    role: role || undefined,
    department,
  });

  // Generate JWT auth token
  const token = user.generateAuthToken();

  return ApiResponse.created(res, 'User registered successfully', {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      createdAt: user.createdAt,
    },
    token,
  });
});

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user and explicitly include password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    return next(ApiError.unauthorized('Invalid email or password credentials.'));
  }

  if (!user.isActive) {
    return next(ApiError.unauthorized('Your account has been deactivated. Please contact an admin.'));
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(ApiError.unauthorized('Invalid email or password credentials.'));
  }

  // Generate token
  const token = user.generateAuthToken();

  return ApiResponse.success(res, 'Login successful', {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
    token,
  });
});

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, 'User profile retrieved successfully', {
    user: req.user,
  });
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/v1/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, department } = req.body;
  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (department !== undefined) user.department = department;

  await user.save();

  return ApiResponse.success(res, 'Profile updated successfully', {
    user,
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
};
