const Joi = require('joi');

const createCollegeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required().messages({
    'string.empty': 'College name cannot be empty',
    'string.min': 'College name must have at least 2 characters',
    'any.required': 'College name is required',
  }),
  description: Joi.string().trim().min(10).max(2000).required().messages({
    'string.empty': 'Description cannot be empty',
    'string.min': 'Description must be at least 10 characters long',
    'any.required': 'Description is required',
  }),
  location: Joi.object({
    city: Joi.string().trim().required().messages({
      'any.required': 'Location city is required',
      'string.empty': 'City cannot be empty',
    }),
    state: Joi.string().trim().required().messages({
      'any.required': 'Location state is required',
      'string.empty': 'State cannot be empty',
    }),
    country: Joi.string().trim().default('India'),
  }).required().messages({
    'any.required': 'Location details are required',
  }),
  website: Joi.string().trim().uri({ scheme: [/https?/] }).allow('').optional().messages({
    'string.uri': 'Website must be a valid URL starting with http:// or https://',
  }),
  establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional().messages({
    'number.min': 'Established year must be 1800 or later',
    'number.max': 'Established year cannot be in the future',
  }),
  contactEmail: Joi.string().trim().email().allow('').optional().messages({
    'string.email': 'Please provide a valid contact email',
  }),
  coursesOffered: Joi.array().items(Joi.string().trim()).default([]),
});

const updateCollegeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  description: Joi.string().trim().min(10).max(2000).optional(),
  location: Joi.object({
    city: Joi.string().trim().optional(),
    state: Joi.string().trim().optional(),
    country: Joi.string().trim().optional(),
  }).optional(),
  website: Joi.string().trim().uri({ scheme: [/https?/] }).allow('').optional(),
  establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional(),
  contactEmail: Joi.string().trim().email().allow('').optional(),
  coursesOffered: Joi.array().items(Joi.string().trim()).optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

const collegeQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().allow('').optional(),
  city: Joi.string().trim().allow('').optional(),
  state: Joi.string().trim().allow('').optional(),
  sort: Joi.string().valid('rating_desc', 'rating_asc', 'name_asc', 'name_desc', 'reviews_desc', 'newest').default('rating_desc'),
});

module.exports = {
  createCollegeSchema,
  updateCollegeSchema,
  collegeQuerySchema,
};
