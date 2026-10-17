const express = require('express');
const collegeController = require('../controllers/collegeController');
const reviewRoutes = require('./reviewRoutes');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { ROLES } = require('../constants/roles');
const {
  createCollegeSchema,
  updateCollegeSchema,
  collegeQuerySchema,
} = require('../validations/collegeValidation');

const router = express.Router();

// Mount nested review routes: /api/v1/colleges/:collegeId/reviews
router.use('/:collegeId/reviews', reviewRoutes);

// Specific routes before param :id routes
router.get('/stats/summary', collegeController.getCollegeStats);

router
  .route('/')
  .get(validate(collegeQuerySchema, 'query'), collegeController.getColleges)
  .post(
    authenticate,
    authorize(ROLES.ADMIN),
    validate(createCollegeSchema),
    collegeController.createCollege
  );

router
  .route('/:id')
  .get(collegeController.getCollegeById)
  .put(
    authenticate,
    authorize(ROLES.ADMIN),
    validate(updateCollegeSchema),
    collegeController.updateCollege
  )
  .delete(authenticate, authorize(ROLES.ADMIN), collegeController.deleteCollege);

module.exports = router;
