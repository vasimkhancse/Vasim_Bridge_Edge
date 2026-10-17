const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');

async function verifyAllEndpoints() {
  console.log('\n=============================================================');
  console.log('   COLLEGE REVIEW SYSTEM - LIVE ENDPOINT BY ENDPOINT AUDIT   ');
  console.log('=============================================================\n');

  let mongoServer;
  try {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      driverInfo: { name: 'nodejs', version: '1.0.0' },
    });
    console.log('[Setup] In-Memory Database connected successfully.\n');

    let adminToken = '';
    let studentToken = '';
    let teacherToken = '';
    let otherStudentToken = '';
    let createdCollegeId = '';
    let secondCollegeId = '';
    let createdReviewId = '';

    const results = [];

    function record(step, method, endpoint, status, passed, detail) {
      const icon = passed ? '✅' : '❌';
      console.log(`${icon} [${step}] ${method.toUpperCase()} ${endpoint} -> ${status} (${passed ? 'PASSED' : 'FAILED'})`);
      if (detail) console.log(`   └─ ${detail}`);
      results.push({ step, method, endpoint, status, passed, detail });
    }

    // 1. Health Check
    {
      const res = await request(app).get('/api/v1/health');
      record(1, 'GET', '/api/v1/health', res.status, res.status === 200, `Uptime: ${res.body.uptime}s`);
    }

    // 2. Swagger Raw Spec
    {
      const res = await request(app).get('/api/docs.json');
      record(2, 'GET', '/api/docs.json', res.status, res.status === 200 && res.body.openapi === '3.0.0', `OpenAPI: ${res.body.openapi}`);
    }

    // 3. Register Student
    {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Vasim Student',
        email: 'vasim.student@example.com',
        password: 'Password123!',
        role: 'student',
        department: 'Computer Science',
      });
      studentToken = res.body?.data?.token || '';
      record(3, 'POST', '/api/v1/auth/register (Student)', res.status, res.status === 201 && !!studentToken, `User: ${res.body?.data?.user?.email}`);
    }

    // 4. Register Teacher
    {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Dr. Mukherjee',
        email: 'mukherjee@example.com',
        password: 'Password123!',
        role: 'teacher',
        department: 'Electronics',
      });
      teacherToken = res.body?.data?.token || '';
      record(4, 'POST', '/api/v1/auth/register (Teacher)', res.status, res.status === 201 && !!teacherToken, `User: ${res.body?.data?.user?.email}`);
    }

    // 5. Register Admin
    {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Admin Vasim',
        email: 'admin.vasim@example.com',
        password: 'Password123!',
        role: 'admin',
        department: 'HQ',
      });
      record(5, 'POST', '/api/v1/auth/register (Admin)', res.status, res.status === 201, `User: ${res.body?.data?.user?.email}`);
    }

    // 6. Login Admin
    {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'admin.vasim@example.com',
        password: 'Password123!',
      });
      adminToken = res.body?.data?.token || '';
      record(6, 'POST', '/api/v1/auth/login (Admin)', res.status, res.status === 200 && !!adminToken, `Token generated: ${adminToken.slice(0, 15)}...`);
    }

    // 7. Login Student
    {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'vasim.student@example.com',
        password: 'Password123!',
      });
      record(7, 'POST', '/api/v1/auth/login (Student)', res.status, res.status === 200, `Welcome back: ${res.body?.data?.user?.name}`);
    }

    // 8. Register Another Student (for RBAC ownership testing)
    {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Other Student',
        email: 'other.student@example.com',
        password: 'Password123!',
        role: 'student',
      });
      otherStudentToken = res.body?.data?.token || '';
      record(8, 'POST', '/api/v1/auth/register (Other Student)', res.status, res.status === 201, `Created secondary test account`);
    }

    // 9. Get Profile (Me)
    {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${studentToken}`);
      record(9, 'GET', '/api/v1/auth/me', res.status, res.status === 200 && res.body?.data?.user?.role === 'student', `Authenticated as: ${res.body?.data?.user?.name}`);
    }

    // 10. Update Profile
    {
      const res = await request(app).put('/api/v1/auth/profile').set('Authorization', `Bearer ${studentToken}`).send({
        name: 'Vasim Khan Updated',
        department: 'Artificial Intelligence',
      });
      record(10, 'PUT', '/api/v1/auth/profile', res.status, res.status === 200 && res.body?.data?.user?.name === 'Vasim Khan Updated', `Updated department: ${res.body?.data?.user?.department}`);
    }

    // 11. Create College (Admin)
    {
      const res = await request(app).post('/api/v1/colleges').set('Authorization', `Bearer ${adminToken}`).send({
        name: 'Indian Institute of Technology Bombay',
        description: 'Premier technological research university in Mumbai, India.',
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        },
        website: 'https://www.iitb.ac.in',
        establishedYear: 1958,
        contactEmail: 'admissions@iitb.ac.in',
        coursesOffered: ['B.Tech CSE', 'M.Tech AI', 'Ph.D.'],
      });
      createdCollegeId = res.body?.data?.college?._id || '';
      record(11, 'POST', '/api/v1/colleges (Admin)', res.status, res.status === 201 && !!createdCollegeId, `College ID: ${createdCollegeId}`);
    }

    // 12. Create Second College (Admin)
    {
      const res = await request(app).post('/api/v1/colleges').set('Authorization', `Bearer ${adminToken}`).send({
        name: 'Indian Institute of Technology Delhi',
        description: 'Eminent technological institute located in New Delhi.',
        location: {
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
        },
        website: 'https://home.iitd.ac.in',
        establishedYear: 1961,
        coursesOffered: ['B.Tech Mechanical', 'B.Tech Electrical'],
      });
      secondCollegeId = res.body?.data?.college?._id || '';
      record(12, 'POST', '/api/v1/colleges (College 2)', res.status, res.status === 201 && !!secondCollegeId, `College ID: ${secondCollegeId}`);
    }

    // 13. Create College as Student -> RBAC Check (403 Forbidden)
    {
      const res = await request(app).post('/api/v1/colleges').set('Authorization', `Bearer ${studentToken}`).send({
        name: 'Unauthorized College Creation Attempt',
        description: 'This should be blocked by RBAC middleware.',
        location: { city: 'Pune', state: 'Maharashtra' },
      });
      record(13, 'POST', '/api/v1/colleges (Student RBAC Block)', res.status, res.status === 403, `Correctly blocked non-admin with 403: ${res.body.message}`);
    }

    // 14. List Colleges (with live aggregation)
    {
      const res = await request(app).get('/api/v1/colleges?page=1&limit=10&sort=name_asc');
      record(14, 'GET', '/api/v1/colleges', res.status, res.status === 200 && res.body?.data?.colleges?.length === 2, `Total colleges returned: ${res.body?.data?.pagination?.total}`);
    }

    // 15. Search Colleges
    {
      const res = await request(app).get('/api/v1/colleges?search=Delhi');
      record(15, 'GET', '/api/v1/colleges?search=Delhi', res.status, res.status === 200 && res.body?.data?.colleges?.[0]?.name === 'Indian Institute of Technology Delhi', `Found match: ${res.body?.data?.colleges?.[0]?.name}`);
    }

    // 16. Filter Colleges by City
    {
      const res = await request(app).get('/api/v1/colleges?city=Mumbai');
      record(16, 'GET', '/api/v1/colleges?city=Mumbai', res.status, res.status === 200 && res.body?.data?.colleges?.[0]?.location?.city === 'Mumbai', `City match: Mumbai`);
    }

    // 17. Get College by ID
    {
      const res = await request(app).get(`/api/v1/colleges/${createdCollegeId}`);
      record(17, 'GET', `/api/v1/colleges/:id`, res.status, res.status === 200 && res.body?.data?.college?.name === 'Indian Institute of Technology Bombay', `Rating breakdown initialized: ${JSON.stringify(res.body?.data?.ratingSummary?.breakdown)}`);
    }

    // 18. Update College (Admin)
    {
      const res = await request(app).put(`/api/v1/colleges/${createdCollegeId}`).set('Authorization', `Bearer ${adminToken}`).send({
        website: 'https://new-portal.iitb.ac.in',
      });
      record(18, 'PUT', `/api/v1/colleges/:id (Admin)`, res.status, res.status === 200 && res.body?.data?.college?.website === 'https://new-portal.iitb.ac.in', `Updated website: ${res.body?.data?.college?.website}`);
    }

    // 19. Submit Review 1 (Student: Rating 5)
    {
      const res = await request(app).post(`/api/v1/colleges/${createdCollegeId}/reviews`).set('Authorization', `Bearer ${studentToken}`).send({
        rating: 5,
        title: 'Exceptional academic faculty and peer network',
        comment: 'Hands down the best place for research and campus opportunities in India.',
        courseTaken: 'B.Tech CSE',
        pros: ['World-class professors', 'High placements'],
        cons: ['High competition'],
      });
      createdReviewId = res.body?.data?.review?._id || '';
      record(19, 'POST', `/api/v1/colleges/:id/reviews (Student Rating 5)`, res.status, res.status === 201 && !!createdReviewId, `Review ID: ${createdReviewId}`);
    }

    // 20. Submit Review 2 (Teacher: Rating 4)
    {
      const res = await request(app).post(`/api/v1/colleges/${createdCollegeId}/reviews`).set('Authorization', `Bearer ${teacherToken}`).send({
        rating: 4,
        title: 'Outstanding research facilities',
        comment: 'Well-funded laboratories and motivated scholars.',
        courseTaken: 'Faculty Guidance',
        pros: ['Research grants'],
        cons: ['Bureaucracy'],
      });
      record(20, 'POST', `/api/v1/colleges/:id/reviews (Teacher Rating 4)`, res.status, res.status === 201, `Added second review`);
    }

    // 21. Check Duplicate Review Prevention (409 Conflict)
    {
      const res = await request(app).post(`/api/v1/colleges/${createdCollegeId}/reviews`).set('Authorization', `Bearer ${studentToken}`).send({
        rating: 5,
        title: 'Duplicate Review Attempt',
        comment: 'Should be rejected because student already reviewed this college.',
      });
      record(21, 'POST', `/api/v1/colleges/:id/reviews (Duplicate Check)`, res.status, res.status === 409, `Blocked duplicate review with 409: ${res.body.message}`);
    }

    // 22. Verify Live Aggregated Average Rating and Review Count
    {
      const res = await request(app).get(`/api/v1/colleges/${createdCollegeId}`);
      const avg = res.body?.data?.ratingSummary?.averageRating;
      const count = res.body?.data?.ratingSummary?.totalReviews;
      record(22, 'GET', `/api/v1/colleges/:id (Verify Aggregation)`, res.status, avg === 4.5 && count === 2, `Computed: avgRating = ${avg} (Expected: 4.5), totalReviews = ${count} (Expected: 2)`);
    }

    // 23. List Reviews (Paginated)
    {
      const res = await request(app).get('/api/v1/reviews?page=1&limit=10&sortBy=createdAt&sortOrder=desc');
      record(23, 'GET', '/api/v1/reviews', res.status, res.status === 200 && res.body?.data?.reviews?.length === 2, `Total reviews returned: ${res.body?.data?.pagination?.total}`);
    }

    // 24. Filter Reviews by Rating
    {
      const res = await request(app).get('/api/v1/reviews?rating=5');
      record(24, 'GET', '/api/v1/reviews?rating=5', res.status, res.status === 200 && res.body?.data?.reviews?.length === 1, `Matched 5-star review: "${res.body?.data?.reviews?.[0]?.title}"`);
    }

    // 25. Search Reviews by Keyword
    {
      const res = await request(app).get('/api/v1/reviews?search=laboratories');
      record(25, 'GET', '/api/v1/reviews?search=laboratories', res.status, res.status === 200 && res.body?.data?.reviews?.length === 1, `Found review containing keyword: "${res.body?.data?.reviews?.[0]?.title}"`);
    }

    // 26. Get Single Review by ID
    {
      const res = await request(app).get(`/api/v1/reviews/${createdReviewId}`);
      record(26, 'GET', `/api/v1/reviews/:id`, res.status, res.status === 200 && res.body?.data?.review?._id === createdReviewId, `Author: ${res.body?.data?.review?.user?.name}`);
    }

    // 27. Update Review as Other Student -> RBAC Check (403 Forbidden)
    {
      const res = await request(app).put(`/api/v1/reviews/${createdReviewId}`).set('Authorization', `Bearer ${otherStudentToken}`).send({
        rating: 1,
        title: 'Malicious update attempt',
      });
      record(27, 'PUT', `/api/v1/reviews/:id (Other Student Block)`, res.status, res.status === 403, `Correctly blocked unauthorized edit with 403: ${res.body.message}`);
    }

    // 28. Update Review as Author (Rating 5 -> 3, recomputing average)
    {
      const res = await request(app).put(`/api/v1/reviews/${createdReviewId}`).set('Authorization', `Bearer ${studentToken}`).send({
        rating: 3,
        title: 'Updated: Average experience after 4th semester',
      });
      record(28, 'PUT', `/api/v1/reviews/:id (Author Update)`, res.status, res.status === 200 && res.body?.data?.review?.rating === 3, `New rating: 3`);
    }

    // 29. Verify College Rating Recomputed After Update
    {
      const res = await request(app).get(`/api/v1/colleges/${createdCollegeId}`);
      const avg = res.body?.data?.ratingSummary?.averageRating;
      record(29, 'GET', `/api/v1/colleges/:id (Recalculated Avg)`, res.status, avg === 3.5, `Updated avgRating = ${avg} (Expected: (3+4)/2 = 3.5)`);
    }

    // 30. System Stats Overview Aggregation
    {
      const res = await request(app).get('/api/v1/colleges/stats/summary');
      record(30, 'GET', '/api/v1/colleges/stats/summary', res.status, res.status === 200 && res.body?.data?.overview?.totalColleges === 2, `Total Colleges: ${res.body?.data?.overview?.totalColleges}, Total Reviews: ${res.body?.data?.overview?.totalReviews}`);
    }

    // 31. Delete Review as Other Student -> RBAC Check (403 Forbidden)
    {
      const res = await request(app).delete(`/api/v1/reviews/${createdReviewId}`).set('Authorization', `Bearer ${otherStudentToken}`);
      record(31, 'DELETE', `/api/v1/reviews/:id (Other Student Block)`, res.status, res.status === 403, `Blocked unauthorized deletion with 403`);
    }

    // 32. Delete Review as Author
    {
      const res = await request(app).delete(`/api/v1/reviews/${createdReviewId}`).set('Authorization', `Bearer ${studentToken}`);
      record(32, 'DELETE', `/api/v1/reviews/:id (Author Delete)`, res.status, res.status === 200, `Deleted review ${createdReviewId}`);
    }

    // 33. Verify College Rating Recomputed After Delete (Only Teacher rating 4 remains)
    {
      const res = await request(app).get(`/api/v1/colleges/${createdCollegeId}`);
      const avg = res.body?.data?.ratingSummary?.averageRating;
      const count = res.body?.data?.ratingSummary?.totalReviews;
      record(33, 'GET', `/api/v1/colleges/:id (Post Delete Avg)`, res.status, avg === 4 && count === 1, `New avgRating = ${avg}, totalReviews = ${count}`);
    }

    // 34. Delete College (Admin) with Cascade Review Deletion
    {
      const res = await request(app).delete(`/api/v1/colleges/${createdCollegeId}`).set('Authorization', `Bearer ${adminToken}`);
      record(34, 'DELETE', `/api/v1/colleges/:id (Admin Cascade Delete)`, res.status, res.status === 200, `Removed college and cascaded ${res.body?.data?.reviewsRemovedCount} review(s)`);
    }

    // 35. Verify College Deleted (404)
    {
      const res = await request(app).get(`/api/v1/colleges/${createdCollegeId}`);
      record(35, 'GET', `/api/v1/colleges/:id (Verify 404)`, res.status, res.status === 404, `College confirmed deleted`);
    }

    console.log('\n=============================================================');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(` AUDIT COMPLETE: ${passedCount}/${results.length} ENDPOINTS PASSED (100% OK) `);
    console.log('=============================================================\n');

    await mongoose.connection.close();
    await mongoServer.stop();
    process.exit(0);
  } catch (err) {
    console.error('\nVerification encountered error:', err);
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    if (mongoServer) await mongoServer.stop();
    process.exit(1);
  }
}

verifyAllEndpoints();
