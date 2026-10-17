const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const { swaggerSpec } = require('./config/swagger');
const routes = require('./routes');
const apiRateLimiter = require('./middlewares/rateLimiter');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(cors());

// Body parser
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// HTTP request logging (disabled in testing)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting on API routes
app.use('/api/', apiRateLimiter);

// Interactive Swagger UI documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'College Review System API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// Raw Swagger JSON endpoint
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Root landing endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the College Review System REST API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      colleges: '/api/v1/colleges',
      reviews: '/api/v1/reviews',
    },
  });
});

// API v1 routes
app.use('/api/v1', routes);

// 404 Catch-all handler
app.use(notFound);

// Centralized error handling
app.use(errorHandler);

module.exports = app;
