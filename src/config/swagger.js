const swaggerJsdoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'College Review System API',
    version: '1.0.0',
    description:
      'Production-ready Express.js REST API with MongoDB for a College Review System. Implements JWT Authentication, Role-based Access Control (Admin, Teacher, Student), MongoDB aggregation pipelines, pagination, and robust validation.',
    contact: {
      name: 'Vasim (Full-Stack MERN Developer)',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server',
    },
    {
      url: '/api/v1',
      description: 'Current Host Relative Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token in Authorization header: Bearer <token>',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '652f10b8e2193b21849ad101' },
          name: { type: 'string', example: 'Vasim Khan' },
          email: { type: 'string', example: 'vasim@example.com' },
          role: { type: 'string', enum: ['admin', 'teacher', 'student'], example: 'student' },
          department: { type: 'string', example: 'Computer Science' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      College: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '652f10b8e2193b21849ad102' },
          name: { type: 'string', example: 'Indian Institute of Technology Bombay' },
          description: { type: 'string', example: 'Premier technical and research university in Mumbai.' },
          location: {
            type: 'object',
            properties: {
              city: { type: 'string', example: 'Mumbai' },
              state: { type: 'string', example: 'Maharashtra' },
              country: { type: 'string', example: 'India' },
            },
          },
          website: { type: 'string', example: 'https://www.iitb.ac.in' },
          establishedYear: { type: 'integer', example: 1958 },
          contactEmail: { type: 'string', example: 'admissions@iitb.ac.in' },
          coursesOffered: {
            type: 'array',
            items: { type: 'string' },
            example: ['B.Tech CSE', 'M.Tech AI', 'Ph.D.'],
          },
          averageRating: { type: 'number', example: 4.8 },
          totalReviews: { type: 'integer', example: 45 },
          createdBy: { type: 'string', example: '652f10b8e2193b21849ad101' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '652f10b8e2193b21849ad103' },
          college: { type: 'string', example: '652f10b8e2193b21849ad102' },
          user: { type: 'string', example: '652f10b8e2193b21849ad101' },
          rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          title: { type: 'string', example: 'Outstanding academic exposure and campus' },
          comment: {
            type: 'string',
            example: 'World class faculty and placement opportunities with brilliant peers.',
          },
          courseTaken: { type: 'string', example: 'B.Tech CSE' },
          pros: { type: 'array', items: { type: 'string' }, example: ['Great faculty', 'Top placements'] },
          cons: { type: 'array', items: { type: 'string' }, example: ['Intense academic pressure'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'integer', example: 400 },
          message: { type: 'string', example: 'Validation error or invalid request' },
          errors: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Returns API health, uptime and server status',
        responses: {
          200: { description: 'Server is healthy' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register new user account',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Vasim Khan' },
                  email: { type: 'string', example: 'vasim@example.com' },
                  password: { type: 'string', example: 'SecurePassword123!' },
                  role: { type: 'string', enum: ['student', 'teacher', 'admin'], default: 'student' },
                  department: { type: 'string', example: 'Computer Science' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          409: { description: 'Email already exists' },
          422: { description: 'Validation error' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login and obtain JWT token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@collegereviews.com' },
                  password: { type: 'string', example: 'AdminPass123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful with JWT token' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Profile data retrieved' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/colleges': {
      get: {
        summary: 'List colleges with aggregated average ratings, review counts, filtering, and pagination',
        tags: ['Colleges'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['rating_desc', 'rating_asc', 'name_asc', 'name_desc', 'reviews_desc', 'newest'],
              default: 'rating_desc',
            },
          },
        ],
        responses: {
          200: { description: 'List of colleges with aggregated rating metrics' },
        },
      },
      post: {
        summary: 'Create a new college (Admin only)',
        tags: ['Colleges'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'description', 'location'],
                properties: {
                  name: { type: 'string', example: 'IIT Bombay' },
                  description: { type: 'string', example: 'Leading technical university in India' },
                  location: {
                    type: 'object',
                    required: ['city', 'state'],
                    properties: {
                      city: { type: 'string', example: 'Mumbai' },
                      state: { type: 'string', example: 'Maharashtra' },
                      country: { type: 'string', example: 'India' },
                    },
                  },
                  website: { type: 'string', example: 'https://www.iitb.ac.in' },
                  establishedYear: { type: 'integer', example: 1958 },
                  contactEmail: { type: 'string', example: 'contact@iitb.ac.in' },
                  coursesOffered: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'College created' },
          403: { description: 'Forbidden - Admin only' },
        },
      },
    },
    '/colleges/stats/summary': {
      get: {
        summary: 'Get system-wide college and rating summary statistics (Aggregation)',
        tags: ['Colleges'],
        responses: {
          200: { description: 'Aggregated platform metrics' },
        },
      },
    },
    '/colleges/{id}': {
      get: {
        summary: 'Get college detail with rating breakdown aggregation',
        tags: ['Colleges'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'College details and rating distribution breakdown' },
          404: { description: 'College not found' },
        },
      },
      put: {
        summary: 'Update college (Admin only)',
        tags: ['Colleges'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  website: { type: 'string' },
                  contactEmail: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'College updated' },
          403: { description: 'Forbidden - Admin only' },
          404: { description: 'College not found' },
        },
      },
      delete: {
        summary: 'Delete college & cascade remove all reviews (Admin only)',
        tags: ['Colleges'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'College and reviews deleted' },
          403: { description: 'Forbidden - Admin only' },
          404: { description: 'College not found' },
        },
      },
    },
    '/reviews': {
      get: {
        summary: 'List reviews with search, filter, and pagination',
        tags: ['Reviews'],
        parameters: [
          { name: 'collegeId', in: 'query', schema: { type: 'string' } },
          { name: 'rating', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', default: 'createdAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          200: { description: 'List of reviews' },
        },
      },
      post: {
        summary: 'Create a review for a college (Student, Teacher, Admin)',
        tags: ['Reviews'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['collegeId', 'rating', 'title', 'comment'],
                properties: {
                  collegeId: { type: 'string', example: '652f10b8e2193b21849ad102' },
                  rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                  title: { type: 'string', example: 'Best campus life and professors' },
                  comment: { type: 'string', example: 'The academic curriculum is rigorous and modern.' },
                  courseTaken: { type: 'string', example: 'B.Tech Computer Science' },
                  pros: { type: 'array', items: { type: 'string' }, example: ['Great peers'] },
                  cons: { type: 'array', items: { type: 'string' }, example: ['Competitive'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Review submitted successfully' },
          409: { description: 'Conflict: user has already reviewed this college' },
        },
      },
    },
    '/reviews/{id}': {
      get: {
        summary: 'Get review by ID',
        tags: ['Reviews'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Review detail' },
          404: { description: 'Review not found' },
        },
      },
      put: {
        summary: 'Update review (Review Author or Admin)',
        tags: ['Reviews'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  title: { type: 'string' },
                  comment: { type: 'string' },
                  pros: { type: 'array', items: { type: 'string' } },
                  cons: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Review updated' },
          403: { description: 'Forbidden - not author or admin' },
          404: { description: 'Review not found' },
        },
      },
      delete: {
        summary: 'Delete review (Review Author or Admin)',
        tags: ['Reviews'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Review deleted successfully' },
          403: { description: 'Forbidden - not author or admin' },
          404: { description: 'Review not found' },
        },
      },
    },
  },
};

const swaggerOptions = {
  swaggerDefinition,
  apis: [],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = {
  swaggerSpec,
  swaggerDefinition,
};
