const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const College = require('../src/models/College');
const Review = require('../src/models/Review');
const { ROLES } = require('../src/constants/roles');

describe('MongoDB Aggregation Pipeline Tests (Ratings & Review Counts)', () => {
  let adminUser, student1, student2, student3;
  let collegeA, collegeB;

  beforeEach(async () => {
    adminUser = await User.create({
      name: 'Admin Agg',
      email: 'admin.agg@example.com',
      password: 'Password123!',
      role: ROLES.ADMIN,
    });

    student1 = await User.create({
      name: 'Student One',
      email: 's1.agg@example.com',
      password: 'Password123!',
      role: ROLES.STUDENT,
    });

    student2 = await User.create({
      name: 'Student Two',
      email: 's2.agg@example.com',
      password: 'Password123!',
      role: ROLES.STUDENT,
    });

    student3 = await User.create({
      name: 'Student Three',
      email: 's3.agg@example.com',
      password: 'Password123!',
      role: ROLES.STUDENT,
    });

    collegeA = await College.create({
      name: 'College Alpha',
      description: 'First test college.',
      location: { city: 'Pune', state: 'Maharashtra', country: 'India' },
      createdBy: adminUser._id,
    });

    collegeB = await College.create({
      name: 'College Beta',
      description: 'Second test college.',
      location: { city: 'Bengaluru', state: 'Karnataka', country: 'India' },
      createdBy: adminUser._id,
    });
  });

  it('should accurately compute real-time average rating and review counts through sequential reviews', async () => {
    // Initial state: 0 reviews
    let college = await College.findById(collegeA._id);
    expect(college.averageRating).toBe(0);
    expect(college.totalReviews).toBe(0);

    // 1st review: rating 4
    const r1 = await Review.create({
      college: collegeA._id,
      user: student1._id,
      rating: 4,
      title: 'Solid institution',
      comment: 'Very good courses.',
    });
    await Review.calcAverageRating(collegeA._id);

    college = await College.findById(collegeA._id);
    expect(college.averageRating).toBe(4);
    expect(college.totalReviews).toBe(1);

    // 2nd review: rating 5
    const r2 = await Review.create({
      college: collegeA._id,
      user: student2._id,
      rating: 5,
      title: 'Top tier university',
      comment: 'Excellent faculty.',
    });
    await Review.calcAverageRating(collegeA._id);

    college = await College.findById(collegeA._id);
    expect(college.averageRating).toBe(4.5);
    expect(college.totalReviews).toBe(2);

    // 3rd review: rating 2 (average should be (4+5+2)/3 = 3.666 -> 3.7)
    const r3 = await Review.create({
      college: collegeA._id,
      user: student3._id,
      rating: 2,
      title: 'Disappointing facilities',
      comment: 'Needs better labs.',
    });
    await Review.calcAverageRating(collegeA._id);

    college = await College.findById(collegeA._id);
    expect(college.averageRating).toBe(3.7);
    expect(college.totalReviews).toBe(3);

    // Delete review r3: should return to average 4.5 and total 2
    await Review.findByIdAndDelete(r3._id);
    await Review.calcAverageRating(collegeA._id);

    college = await College.findById(collegeA._id);
    expect(college.averageRating).toBe(4.5);
    expect(college.totalReviews).toBe(2);
  });

  it('should rank colleges by averageRating descending in the aggregation pipeline query', async () => {
    // College A gets 5 rating
    await Review.create({
      college: collegeA._id,
      user: student1._id,
      rating: 5,
      title: 'Best',
      comment: 'Awesome',
    });
    await Review.calcAverageRating(collegeA._id);

    // College B gets 3 rating
    await Review.create({
      college: collegeB._id,
      user: student1._id,
      rating: 3,
      title: 'Average',
      comment: 'Decent',
    });
    await Review.calcAverageRating(collegeB._id);

    const res = await request(app).get('/api/v1/colleges?sort=rating_desc');

    expect(res.status).toBe(200);
    const colleges = res.body.data.colleges;
    expect(colleges.length).toBe(2);
    expect(colleges[0].name).toBe('College Alpha');
    expect(colleges[0].averageRating).toBe(5);
    expect(colleges[1].name).toBe('College Beta');
    expect(colleges[1].averageRating).toBe(3);
  });
});
