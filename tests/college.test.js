const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const College = require('../src/models/College');
const Review = require('../src/models/Review');
const { ROLES } = require('../src/constants/roles');

describe('Colleges Integration Tests (CRUD, Aggregation & RBAC)', () => {
  let adminToken;
  let teacherToken;
  let studentToken;
  let adminUser;
  let testCollege;

  beforeEach(async () => {
    // Create Admin
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin.test@collegereviews.com',
      password: 'AdminPassword123!',
      role: ROLES.ADMIN,
    });
    adminToken = adminUser.generateAuthToken();

    // Create Teacher
    const teacherUser = await User.create({
      name: 'Teacher User',
      email: 'teacher.test@collegereviews.com',
      password: 'TeacherPassword123!',
      role: ROLES.TEACHER,
    });
    teacherToken = teacherUser.generateAuthToken();

    // Create Student
    const studentUser = await User.create({
      name: 'Student User',
      email: 'student.test@collegereviews.com',
      password: 'StudentPassword123!',
      role: ROLES.STUDENT,
    });
    studentToken = studentUser.generateAuthToken();

    // Create a base college for testing
    testCollege = await College.create({
      name: 'Indian Institute of Technology Bombay',
      description: 'Premier public engineering research institution located in Powai, Mumbai.',
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      },
      website: 'https://www.iitb.ac.in',
      establishedYear: 1958,
      contactEmail: 'admissions@iitb.ac.in',
      coursesOffered: ['B.Tech CSE', 'M.Tech AI'],
      createdBy: adminUser._id,
    });
  });

  describe('POST /api/v1/colleges (Create College)', () => {
    const newCollegeData = {
      name: 'National Institute of Technology Trichy',
      description: 'Leading technical university in Tamil Nadu known for high placements.',
      location: {
        city: 'Tiruchirappalli',
        state: 'Tamil Nadu',
        country: 'India',
      },
      website: 'https://www.nitt.edu',
      establishedYear: 1964,
      contactEmail: 'admissions@nitt.edu',
      coursesOffered: ['B.Tech Mech', 'B.Tech Chem'],
    };

    it('should allow ADMIN to create a new college', async () => {
      const res = await request(app)
        .post('/api/v1/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCollegeData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.college.name).toBe(newCollegeData.name);
      expect(res.body.data.college.createdBy).toBe(adminUser._id.toString());
    });

    it('should forbid TEACHER from creating a college (403)', async () => {
      const res = await request(app)
        .post('/api/v1/colleges')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(newCollegeData);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should forbid STUDENT from creating a college (403)', async () => {
      const res = await request(app)
        .post('/api/v1/colleges')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(newCollegeData);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated request (401)', async () => {
      const res = await request(app).post('/api/v1/colleges').send(newCollegeData);

      expect(res.status).toBe(401);
    });

    it('should reject duplicate college name with 409 Conflict', async () => {
      const duplicateData = {
        ...newCollegeData,
        name: testCollege.name,
      };

      const res = await request(app)
        .post('/api/v1/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateData);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe('GET /api/v1/colleges (List with Aggregated Rating & Search)', () => {
    beforeEach(async () => {
      await College.create([
        {
          name: 'IIT Delhi',
          description: 'Technological institute located in Hauz Khas, New Delhi.',
          location: { city: 'New Delhi', state: 'Delhi', country: 'India' },
          createdBy: adminUser._id,
        },
        {
          name: 'BITS Pilani',
          description: 'Private institute in Pilani, Rajasthan.',
          location: { city: 'Pilani', state: 'Rajasthan', country: 'India' },
          createdBy: adminUser._id,
        },
      ]);
    });

    it('should return list of colleges with pagination and aggregated rating metrics', async () => {
      const res = await request(app).get('/api/v1/colleges');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.colleges.length).toBe(3);
      expect(res.body.data.pagination.total).toBe(3);
      expect(res.body.data.colleges[0].averageRating).toBeDefined();
      expect(res.body.data.colleges[0].reviewCount).toBeDefined();
    });

    it('should filter colleges by search query keyword', async () => {
      const res = await request(app).get('/api/v1/colleges?search=Delhi');

      expect(res.status).toBe(200);
      expect(res.body.data.colleges.length).toBe(1);
      expect(res.body.data.colleges[0].name).toBe('IIT Delhi');
    });

    it('should filter colleges by city', async () => {
      const res = await request(app).get('/api/v1/colleges?city=Mumbai');

      expect(res.status).toBe(200);
      expect(res.body.data.colleges.length).toBe(1);
      expect(res.body.data.colleges[0].name).toBe(testCollege.name);
    });

    it('should filter colleges by state', async () => {
      const res = await request(app).get('/api/v1/colleges?state=Rajasthan');

      expect(res.status).toBe(200);
      expect(res.body.data.colleges.length).toBe(1);
      expect(res.body.data.colleges[0].name).toBe('BITS Pilani');
    });
  });

  describe('GET /api/v1/colleges/:id (College Details & Rating Breakdown)', () => {
    it('should return college details with rating summary breakdown', async () => {
      const res = await request(app).get(`/api/v1/colleges/${testCollege._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.college._id).toBe(testCollege._id.toString());
      expect(res.body.data.ratingSummary.breakdown).toBeDefined();
    });

    it('should return 404 for non-existent college ID', async () => {
      const nonExistentId = '652f10b8e2193b21849ad999';
      const res = await request(app).get(`/api/v1/colleges/${nonExistentId}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid ObjectId format', async () => {
      const res = await request(app).get('/api/v1/colleges/invalid-id-123');

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/v1/colleges/:id (Update College)', () => {
    it('should allow ADMIN to update college details', async () => {
      const res = await request(app)
        .put(`/api/v1/colleges/${testCollege._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          website: 'https://new-iitb-portal.ac.in',
          description: 'Updated comprehensive description for IIT Bombay.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.college.website).toBe('https://new-iitb-portal.ac.in');
    });

    it('should forbid non-admin from updating college (403)', async () => {
      const res = await request(app)
        .put(`/api/v1/colleges/${testCollege._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ website: 'https://hacked.com' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/colleges/:id (Delete College & Cascade Reviews)', () => {
    beforeEach(async () => {
      // Add a review attached to this college
      await Review.create({
        college: testCollege._id,
        user: adminUser._id,
        rating: 5,
        title: 'Great campus',
        comment: 'Very impressive infrastructure.',
      });
    });

    it('should allow ADMIN to delete college and cascade delete its reviews', async () => {
      const res = await request(app)
        .delete(`/api/v1/colleges/${testCollege._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deletedCollegeId).toBe(testCollege._id.toString());

      // Verify college deleted
      const checkCollege = await College.findById(testCollege._id);
      expect(checkCollege).toBeNull();

      // Verify cascaded review deletion
      const checkReviews = await Review.find({ college: testCollege._id });
      expect(checkReviews.length).toBe(0);
    });

    it('should forbid STUDENT from deleting a college (403)', async () => {
      const res = await request(app)
        .delete(`/api/v1/colleges/${testCollege._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/colleges/stats/summary (Platform Summary Aggregation)', () => {
    it('should return aggregated platform stats', async () => {
      const res = await request(app).get('/api/v1/colleges/stats/summary');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview.totalColleges).toBe(1);
      expect(Array.isArray(res.body.data.topRatedColleges)).toBe(true);
    });
  });
});
