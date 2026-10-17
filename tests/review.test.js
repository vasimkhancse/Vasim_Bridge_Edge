const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const College = require('../src/models/College');
const Review = require('../src/models/Review');
const { ROLES } = require('../src/constants/roles');

describe('Reviews Integration Tests (CRUD, RBAC & Aggregations)', () => {
  let adminUser, student1User, student2User, teacherUser;
  let adminToken, student1Token, student2Token, teacherToken;
  let college;

  beforeEach(async () => {
    // Create Users
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin.rev@example.com',
      password: 'Password123!',
      role: ROLES.ADMIN,
    });
    adminToken = adminUser.generateAuthToken();

    student1User = await User.create({
      name: 'Student One',
      email: 'student1.rev@example.com',
      password: 'Password123!',
      role: ROLES.STUDENT,
    });
    student1Token = student1User.generateAuthToken();

    student2User = await User.create({
      name: 'Student Two',
      email: 'student2.rev@example.com',
      password: 'Password123!',
      role: ROLES.STUDENT,
    });
    student2Token = student2User.generateAuthToken();

    teacherUser = await User.create({
      name: 'Teacher One',
      email: 'teacher1.rev@example.com',
      password: 'Password123!',
      role: ROLES.TEACHER,
    });
    teacherToken = teacherUser.generateAuthToken();

    // Create College
    college = await College.create({
      name: 'Birla Institute of Technology and Science',
      description: 'Premier private technology institute.',
      location: { city: 'Pilani', state: 'Rajasthan', country: 'India' },
      createdBy: adminUser._id,
    });
  });

  describe('POST /api/v1/colleges/:collegeId/reviews (Create Review)', () => {
    const validReview = {
      rating: 5,
      title: 'Remarkable research environment and coding culture',
      comment: 'Top professors and excellent peer collaboration across departments.',
      courseTaken: 'B.E. Computer Science',
      pros: ['No attendance policy', 'Strong coding clubs'],
      cons: ['Hostel wifi speed can fluctuate'],
    };

    it('should allow STUDENT to submit a review and update college average rating', async () => {
      const res = await request(app)
        .post(`/api/v1/colleges/${college._id}/reviews`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send(validReview);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.review.rating).toBe(5);
      expect(res.body.data.review.college.name).toBe(college.name);

      // Verify college aggregated stats updated
      const updatedCollege = await College.findById(college._id);
      expect(updatedCollege.totalReviews).toBe(1);
      expect(updatedCollege.averageRating).toBe(5);
    });

    it('should allow TEACHER to submit a review', async () => {
      const res = await request(app)
        .post(`/api/v1/colleges/${college._id}/reviews`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(validReview);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject duplicate review for the same college by the same user with 409 Conflict', async () => {
      // First submission
      await request(app)
        .post(`/api/v1/colleges/${college._id}/reviews`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send(validReview);

      // Duplicate submission
      const duplicateRes = await request(app)
        .post(`/api/v1/colleges/${college._id}/reviews`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send(validReview);

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.message).toMatch(/already submitted a review/i);
    });

    it('should reject invalid rating value (e.g. 6) with 422 Unprocessable Entity', async () => {
      const res = await request(app)
        .post(`/api/v1/colleges/${college._id}/reviews`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ ...validReview, rating: 6 });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should reject review for non-existent college ID with 404', async () => {
      const nonExistentId = '652f10b8e2193b21849ad999';
      const res = await request(app)
        .post(`/api/v1/colleges/${nonExistentId}/reviews`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send(validReview);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/reviews (List, Search & Pagination)', () => {
    beforeEach(async () => {
      await Review.create([
        {
          college: college._id,
          user: student1User._id,
          rating: 4,
          title: 'Great campus experience',
          comment: 'Very nice labs and sports infrastructure.',
        },
        {
          college: college._id,
          user: student2User._id,
          rating: 2,
          title: 'Needs improvement in mess food',
          comment: 'The cafeteria options are not up to mark.',
        },
      ]);
    });

    it('should list all reviews with pagination metadata', async () => {
      const res = await request(app).get('/api/v1/reviews');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviews.length).toBe(2);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('should filter reviews by college ID', async () => {
      const res = await request(app).get(`/api/v1/colleges/${college._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.data.reviews.length).toBe(2);
    });

    it('should filter reviews by specific rating', async () => {
      const res = await request(app).get('/api/v1/reviews?rating=4');

      expect(res.status).toBe(200);
      expect(res.body.data.reviews.length).toBe(1);
      expect(res.body.data.reviews[0].rating).toBe(4);
    });

    it('should search reviews by text keyword', async () => {
      const res = await request(app).get('/api/v1/reviews?search=cafeteria');

      expect(res.status).toBe(200);
      expect(res.body.data.reviews.length).toBe(1);
      expect(res.body.data.reviews[0].title).toMatch(/mess food/i);
    });
  });

  describe('PUT /api/v1/reviews/:id (Update Review & RBAC Ownership)', () => {
    let review;

    beforeEach(async () => {
      review = await Review.create({
        college: college._id,
        user: student1User._id,
        rating: 3,
        title: 'Average experience initially',
        comment: 'Faculty was decent but campus needed renovation.',
      });
      await Review.calcAverageRating(college._id);
    });

    it('should allow author (student1) to update review and recalculate college rating', async () => {
      const res = await request(app)
        .put(`/api/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          rating: 5,
          title: 'Significantly improved experience after renovation',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.review.rating).toBe(5);

      // Verify college rating re-aggregated from 3 to 5
      const updatedCollege = await College.findById(college._id);
      expect(updatedCollege.averageRating).toBe(5);
    });

    it('should forbid student2 from updating student1 review (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ rating: 1 });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should allow ADMIN to update any review', async () => {
      const res = await request(app)
        .put(`/api/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Moderated title by Admin' });

      expect(res.status).toBe(200);
      expect(res.body.data.review.title).toBe('Moderated title by Admin');
    });
  });

  describe('DELETE /api/v1/reviews/:id (Delete Review & RBAC Ownership)', () => {
    let review;

    beforeEach(async () => {
      review = await Review.create({
        college: college._id,
        user: student1User._id,
        rating: 4,
        title: 'Review to be deleted',
        comment: 'Sample comment.',
      });
      await Review.calcAverageRating(college._id);
    });

    it('should forbid student2 from deleting student1 review (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
    });

    it('should allow author (student1) to delete own review and recompute college rating to 0', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify review removed
      const checkRev = await Review.findById(review._id);
      expect(checkRev).toBeNull();

      // Verify college rating recomputed to 0 reviews
      const updatedCollege = await College.findById(college._id);
      expect(updatedCollege.totalReviews).toBe(0);
      expect(updatedCollege.averageRating).toBe(0);
    });

    it('should allow ADMIN to delete any review', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });
});
