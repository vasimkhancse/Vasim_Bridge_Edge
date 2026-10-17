const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'College name is required'],
      unique: true,
      trim: true,
      maxlength: [150, 'College name cannot exceed 150 characters'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    location: {
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
        index: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
        index: true,
      },
      country: {
        type: String,
        default: 'India',
        trim: true,
      },
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    establishedYear: {
      type: Number,
      min: [1800, 'Established year must be valid'],
      max: [new Date().getFullYear(), 'Established year cannot be in the future'],
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid contact email',
      ],
    },
    coursesOffered: {
      type: [String],
      default: [],
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
      index: true,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: [0, 'Total reviews cannot be negative'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate for reviews
collegeSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'college',
  justOne: false,
});

// Indexes for text search and sorting
collegeSchema.index({ name: 'text', description: 'text', 'location.city': 'text', 'location.state': 'text' });
collegeSchema.index({ 'location.city': 1, 'location.state': 1 });

const College = mongoose.model('College', collegeSchema);

module.exports = College;
