const mongoose = require('mongoose');
const Review = require('../models/Review');
const College = require('../models/College');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../constants/roles');

/**
 * @desc    Create a new review for a college
 * @route   POST /api/v1/colleges/:collegeId/reviews or POST /api/v1/reviews
 * @access  Private (Student, Teacher, Admin)
 */
const createReview = asyncHandler(async (req, res, next) => {
  const collegeId = req.params.collegeId || req.body.collegeId;

  if (!collegeId) {
    return next(ApiError.badRequest('College ID must be specified.'));
  }

  if (!mongoose.Types.ObjectId.isValid(collegeId)) {
    return next(ApiError.badRequest('Invalid college ID format.'));
  }

  // Ensure target college exists
  const college = await College.findById(collegeId);
  if (!college) {
    return next(ApiError.notFound(`College not found with ID: ${collegeId}`));
  }

  // Check if user has already reviewed this college
  const existingReview = await Review.findOne({
    college: collegeId,
    user: req.user._id,
  });

  if (existingReview) {
    return next(
      ApiError.conflict(
        'You have already submitted a review for this college. Please update your existing review instead.'
      )
    );
  }

  const { rating, title, comment, courseTaken, pros, cons } = req.body;

  const review = await Review.create({
    college: collegeId,
    user: req.user._id,
    rating,
    title,
    comment,
    courseTaken,
    pros,
    cons,
  });

  // Re-aggregate and update college average rating & review count
  await Review.calcAverageRating(collegeId);

  const populatedReview = await Review.findById(review._id)
    .populate('user', 'name role department')
    .populate('college', 'name location');

  return ApiResponse.created(res, 'Review submitted successfully', {
    review: populatedReview,
  });
});

/**
 * @desc    Get all reviews with filtering, text search, and pagination
 * @route   GET /api/v1/reviews or GET /api/v1/colleges/:collegeId/reviews
 * @access  Public
 */
const getReviews = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const { rating, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const collegeId = req.params.collegeId || req.query.collegeId;

  const filter = {};

  if (collegeId) {
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      return next(ApiError.badRequest('Invalid college ID format.'));
    }
    filter.college = collegeId;
  }

  if (rating) {
    filter.rating = Number(rating);
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { comment: { $regex: search, $options: 'i' } },
      { courseTaken: { $regex: search, $options: 'i' } },
    ];
  }

  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortOptions = { [sortBy]: sortDirection };

  const [total, reviews] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('user', 'name role department')
      .populate('college', 'name location'),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return ApiResponse.success(res, 'Reviews retrieved successfully', {
    reviews,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

/**
 * @desc    Get single review by ID
 * @route   GET /api/v1/reviews/:id
 * @access  Public
 */
const getReviewById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(ApiError.badRequest('Invalid review ID format.'));
  }

  const review = await Review.findById(id)
    .populate('user', 'name role department')
    .populate('college', 'name location');

  if (!review) {
    return next(ApiError.notFound(`Review not found with ID: ${id}`));
  }

  return ApiResponse.success(res, 'Review retrieved successfully', { review });
});

/**
 * @desc    Update review (Author or Admin)
 * @route   PUT /api/v1/reviews/:id
 * @access  Private
 */
const updateReview = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(ApiError.badRequest('Invalid review ID format.'));
  }

  const review = await Review.findById(id);
  if (!review) {
    return next(ApiError.notFound(`Review not found with ID: ${id}`));
  }

  // Check ownership: user must be the author or an admin
  const isAuthor = review.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === ROLES.ADMIN;

  if (!isAuthor && !isAdmin) {
    return next(ApiError.forbidden('You are not authorized to update another user\'s review.'));
  }

  const allowedFields = ['rating', 'title', 'comment', 'courseTaken', 'pros', 'cons'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      review[field] = req.body[field];
    }
  });

  await review.save();

  // Re-aggregate rating for college
  await Review.calcAverageRating(review.college);

  const updatedReview = await Review.findById(id)
    .populate('user', 'name role department')
    .populate('college', 'name location');

  return ApiResponse.success(res, 'Review updated successfully', { review: updatedReview });
});

/**
 * @desc    Delete review (Author or Admin)
 * @route   DELETE /api/v1/reviews/:id
 * @access  Private
 */
const deleteReview = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(ApiError.badRequest('Invalid review ID format.'));
  }

  const review = await Review.findById(id);
  if (!review) {
    return next(ApiError.notFound(`Review not found with ID: ${id}`));
  }

  // Check ownership: user must be the author or an admin
  const isAuthor = review.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === ROLES.ADMIN;

  if (!isAuthor && !isAdmin) {
    return next(ApiError.forbidden('You are not authorized to delete another user\'s review.'));
  }

  const collegeId = review.college;
  await Review.findByIdAndDelete(id);

  // Recalculate college aggregate stats
  await Review.calcAverageRating(collegeId);

  return ApiResponse.success(res, 'Review deleted successfully', {
    deletedReviewId: id,
  });
});

module.exports = {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
};
