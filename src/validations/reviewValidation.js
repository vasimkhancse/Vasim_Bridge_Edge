const Joi = require('joi');

const createReviewSchema = Joi.object({
  collegeId: Joi.string().hex().length(24).optional().messages({
    'string.length': 'Invalid college ID format',
    'string.hex': 'Invalid college ID format',
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be between 1 and 5',
    'number.max': 'Rating must be between 1 and 5',
    'any.required': 'Rating is required',
  }),
  title: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'Review title cannot be empty',
    'string.min': 'Review title must have at least 3 characters',
    'string.max': 'Review title cannot exceed 100 characters',
    'any.required': 'Review title is required',
  }),
  comment: Joi.string().trim().min(10).max(2000).required().messages({
    'string.empty': 'Review comment cannot be empty',
    'string.min': 'Review comment must be at least 10 characters long',
    'string.max': 'Review comment cannot exceed 2000 characters',
    'any.required': 'Review comment is required',
  }),
  courseTaken: Joi.string().trim().allow('').optional(),
  pros: Joi.array().items(Joi.string().trim()).default([]),
  cons: Joi.array().items(Joi.string().trim()).default([]),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string().trim().min(3).max(100).optional(),
  comment: Joi.string().trim().min(10).max(2000).optional(),
  courseTaken: Joi.string().trim().allow('').optional(),
  pros: Joi.array().items(Joi.string().trim()).optional(),
  cons: Joi.array().items(Joi.string().trim()).optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

const reviewQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  collegeId: Joi.string().hex().length(24).optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  search: Joi.string().trim().allow('').optional(),
  sortBy: Joi.string().valid('createdAt', 'rating', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
};
