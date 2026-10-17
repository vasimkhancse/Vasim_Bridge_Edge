const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College reference is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Review title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    courseTaken: {
      type: String,
      trim: true,
      default: '',
    },
    pros: {
      type: [String],
      default: [],
    },
    cons: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent user from submitting multiple reviews for the same college
reviewSchema.index({ college: 1, user: 1 }, { unique: true });

// Text index for search functionality on reviews
reviewSchema.index({ title: 'text', comment: 'text' });

// Static method to calculate average rating and review count per college via Aggregation Pipeline
reviewSchema.statics.calcAverageRating = async function (collegeId) {
  const stats = await this.aggregate([
    {
      $match: { college: new mongoose.Types.ObjectId(collegeId) },
    },
    {
      $group: {
        _id: '$college',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const College = mongoose.model('College');
  if (stats.length > 0) {
    await College.findByIdAndUpdate(collegeId, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalReviews: stats[0].totalReviews,
    });
  } else {
    await College.findByIdAndUpdate(collegeId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }

  return stats.length > 0 ? stats[0] : { averageRating: 0, totalReviews: 0 };
};

// Post-save hook to re-aggregate rating
reviewSchema.post('save', async function () {
  await this.constructor.calcAverageRating(this.college);
});

// Post-remove/delete hooks to re-aggregate rating
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRating(doc.college);
  }
});

reviewSchema.post('deleteOne', { document: true, query: false }, async function () {
  await this.constructor.calcAverageRating(this.college);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
