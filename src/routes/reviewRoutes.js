const express = require('express');
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { ROLES } = require('../constants/roles');
const {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
} = require('../validations/reviewValidation');

// mergeParams: true allows accessing :collegeId from parent college router
const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(validate(reviewQuerySchema, 'query'), reviewController.getReviews)
  .post(
    authenticate,
    authorize(ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN),
    validate(createReviewSchema),
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReviewById)
  .put(authenticate, validate(updateReviewSchema), reviewController.updateReview)
  .delete(authenticate, reviewController.deleteReview);

module.exports = router;
