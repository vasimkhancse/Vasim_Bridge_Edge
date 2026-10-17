const mongoose = require('mongoose');
const College = require('../models/College');
const Review = require('../models/Review');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create a new college
 * @route   POST /api/v1/colleges
 * @access  Private (Admin only)
 */
const createCollege = asyncHandler(async (req, res, next) => {
  const { name, description, location, website, establishedYear, contactEmail, coursesOffered } = req.body;

  // Check if college with same name already exists
  const existingCollege = await College.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existingCollege) {
    return next(ApiError.conflict(`College with name '${name}' already exists.`));
  }

  const college = await College.create({
    name,
    description,
    location,
    website,
    establishedYear,
    contactEmail,
    coursesOffered,
    createdBy: req.user._id,
  });

  return ApiResponse.created(res, 'College created successfully', { college });
});

/**
 * @desc    Get all colleges with aggregated average ratings, reviews count, filtering, and pagination
 * @route   GET /api/v1/colleges
 * @access  Public
 */
const getColleges = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const { search, city, state, sort } = req.query;

  // Construct MongoDB Aggregation Pipeline
  const pipeline = [];

  // Match filters
  const matchConditions = {};
  if (search) {
    matchConditions.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'location.city': { $regex: search, $options: 'i' } },
      { 'location.state': { $regex: search, $options: 'i' } },
    ];
  }
  if (city) {
    matchConditions['location.city'] = { $regex: `^${city.trim()}$`, $options: 'i' };
  }
  if (state) {
    matchConditions['location.state'] = { $regex: `^${state.trim()}$`, $options: 'i' };
  }

  if (Object.keys(matchConditions).length > 0) {
    pipeline.push({ $match: matchConditions });
  }

  // Lookup reviews for real-time rating aggregation
  pipeline.push({
    $lookup: {
      from: 'reviews',
      localField: '_id',
      foreignField: 'college',
      as: 'reviewsData',
    },
  });

  // Calculate aggregation fields (average rating and total reviews)
  pipeline.push({
    $addFields: {
      reviewCount: { $size: '$reviewsData' },
      averageRating: {
        $cond: {
          if: { $gt: [{ $size: '$reviewsData' }, 0] },
          then: { $round: [{ $avg: '$reviewsData.rating' }, 1] },
          else: 0,
        },
      },
    },
  });

  // Project away heavy array
  pipeline.push({
    $project: {
      reviewsData: 0,
    },
  });

  // Sorting stage
  let sortCriteria = { averageRating: -1, reviewCount: -1 };
  if (sort === 'rating_asc') sortCriteria = { averageRating: 1, reviewCount: 1 };
  if (sort === 'name_asc') sortCriteria = { name: 1 };
  if (sort === 'name_desc') sortCriteria = { name: -1 };
  if (sort === 'reviews_desc') sortCriteria = { reviewCount: -1 };
  if (sort === 'newest') sortCriteria = { createdAt: -1 };

  // Facet for pagination and metadata
  pipeline.push({
    $facet: {
      metadata: [{ $count: 'total' }],
      colleges: [{ $sort: sortCriteria }, { $skip: skip }, { $limit: limit }],
    },
  });

  const result = await College.aggregate(pipeline);
  const total = result[0]?.metadata[0]?.total || 0;
  const colleges = result[0]?.colleges || [];
  const totalPages = Math.ceil(total / limit) || 1;

  return ApiResponse.success(res, 'Colleges retrieved successfully', {
    colleges,
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
 * @desc    Get single college by ID with rating breakdown aggregation and recent reviews
 * @route   GET /api/v1/colleges/:id
 * @access  Public
 */
const getCollegeById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(ApiError.badRequest('Invalid college ID format'));
  }

  const college = await College.findById(id).populate('createdBy', 'name email');
  if (!college) {
    return next(ApiError.notFound(`College not found with ID: ${id}`));
  }

  // Aggregate ratings distribution breakdown (counts of 1, 2, 3, 4, 5 stars)
  const ratingBreakdown = await Review.aggregate([
    { $match: { college: new mongoose.Types.ObjectId(id) } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  // Format breakdown map
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratingBreakdown.forEach((item) => {
    if (distribution[item._id] !== undefined) {
      distribution[item._id] = item.count;
    }
  });

  // Fetch 5 most recent reviews with author info
  const recentReviews = await Review.find({ college: id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('user', 'name role department');

  return ApiResponse.success(res, 'College details retrieved successfully', {
    college,
    ratingSummary: {
      averageRating: college.averageRating,
      totalReviews: college.totalReviews,
      breakdown: distribution,
    },
    recentReviews,
  });
});

/**
 * @desc    Update college details
 * @route   PUT /api/v1/colleges/:id
 * @access  Private (Admin only)
 */
const updateCollege = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(ApiError.badRequest('Invalid college ID format'));
  }

  const college = await College.findById(id);
  if (!college) {
    return next(ApiError.notFound(`College not found with ID: ${id}`));
  }

  // Check unique name constraint if name is updated
  if (req.body.name && req.body.name.toLowerCase() !== college.name.toLowerCase()) {
    const existing = await College.findOne({ name: { $regex: new RegExp(`^${req.body.name}$`, 'i') } });
    if (existing) {
      return next(ApiError.conflict(`College with name '${req.body.name}' already exists.`));
    }
  }

  const updatedCollege = await College.findByIdAndUpdate(id, { $set: req.body }, { new: true, runValidators: true });

  return ApiResponse.success(res, 'College updated successfully', {
    college: updatedCollege,
  });
});

/**
 * @desc    Delete college and cascade delete all associated reviews
 * @route   DELETE /api/v1/colleges/:id
 * @access  Private (Admin only)
 */
const deleteCollege = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(ApiError.badRequest('Invalid college ID format'));
  }

  const college = await College.findById(id);
  if (!college) {
    return next(ApiError.notFound(`College not found with ID: ${id}`));
  }

  // Delete college document
  await College.findByIdAndDelete(id);

  // Cascade delete all reviews belonging to this college
  const deletedReviews = await Review.deleteMany({ college: id });

  return ApiResponse.success(res, 'College and associated reviews deleted successfully', {
    deletedCollegeId: id,
    reviewsRemovedCount: deletedReviews.deletedCount,
  });
});

/**
 * @desc    Get aggregated overview statistics across colleges
 * @route   GET /api/v1/colleges/stats/summary
 * @access  Public
 */
const getCollegeStats = asyncHandler(async (req, res) => {
  const stats = await College.aggregate([
    {
      $facet: {
        totalOverview: [
          {
            $group: {
              _id: null,
              totalColleges: { $sum: 1 },
              overallAverageRating: { $avg: '$averageRating' },
              totalReviews: { $sum: '$totalReviews' },
            },
          },
        ],
        topRatedColleges: [
          { $match: { totalReviews: { $gt: 0 } } },
          { $sort: { averageRating: -1, totalReviews: -1 } },
          { $limit: 5 },
          {
            $project: {
              name: 1,
              averageRating: 1,
              totalReviews: 1,
              'location.city': 1,
              'location.state': 1,
            },
          },
        ],
        stateDistribution: [
          {
            $group: {
              _id: '$location.state',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ],
      },
    },
  ]);

  const overview = stats[0]?.totalOverview[0] || {
    totalColleges: 0,
    overallAverageRating: 0,
    totalReviews: 0,
  };

  return ApiResponse.success(res, 'College platform statistics retrieved successfully', {
    overview: {
      totalColleges: overview.totalColleges,
      overallAverageRating: Math.round(overview.overallAverageRating * 10) / 10 || 0,
      totalReviews: overview.totalReviews,
    },
    topRatedColleges: stats[0]?.topRatedColleges || [],
    stateDistribution: stats[0]?.stateDistribution || [],
  });
});

module.exports = {
  createCollege,
  getColleges,
  getCollegeById,
  updateCollege,
  deleteCollege,
  getCollegeStats,
};
