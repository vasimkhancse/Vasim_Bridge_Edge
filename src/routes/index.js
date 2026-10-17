const express = require('express');
const authRoutes = require('./authRoutes');
const collegeRoutes = require('./collegeRoutes');
const reviewRoutes = require('./reviewRoutes');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/colleges', collegeRoutes);
router.use('/reviews', reviewRoutes);

module.exports = router;
