const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/models/User');
const College = require('../src/models/College');
const Review = require('../src/models/Review');
const { ROLES } = require('../src/constants/roles');

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Clear existing collections
    console.log('Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      College.deleteMany({}),
      Review.deleteMany({}),
    ]);
    console.log('Collections cleared.');

    // 1. Create Seed Users
    console.log('Seeding Users...');
    const users = await User.create([
      {
        name: 'System Administrator',
        email: 'admin@collegereviews.com',
        password: 'AdminPass123!',
        role: ROLES.ADMIN,
        department: 'Administration',
      },
      {
        name: 'Dr. Sarah Mukherjee',
        email: 'teacher@collegereviews.com',
        password: 'TeacherPass123!',
        role: ROLES.TEACHER,
        department: 'Computer Science & Engineering',
      },
      {
        name: 'Aarav Sharma',
        email: 'student1@collegereviews.com',
        password: 'StudentPass123!',
        role: ROLES.STUDENT,
        department: 'Mechanical Engineering',
      },
      {
        name: 'Priya Patel',
        email: 'student2@collegereviews.com',
        password: 'StudentPass123!',
        role: ROLES.STUDENT,
        department: 'Information Technology',
      },
      {
        name: 'Rohan Verma',
        email: 'student3@collegereviews.com',
        password: 'StudentPass123!',
        role: ROLES.STUDENT,
        department: 'Electrical Engineering',
      },
    ]);

    const [admin, teacher, student1, student2, student3] = users;
    console.log(`Created ${users.length} users.`);

    // 2. Create Seed Colleges
    console.log('Seeding Colleges...');
    const colleges = await College.create([
      {
        name: 'Indian Institute of Technology Bombay',
        description:
          'Premier engineering institute renowned worldwide for cutting-edge research, outstanding faculty, and top-tier placements.',
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        },
        website: 'https://www.iitb.ac.in',
        establishedYear: 1958,
        contactEmail: 'admissions@iitb.ac.in',
        coursesOffered: ['B.Tech Computer Science', 'B.Tech Electrical', 'M.Tech AI & Data Science', 'Ph.D.'],
        createdBy: admin._id,
      },
      {
        name: 'Indian Institute of Technology Delhi',
        description:
          'Top technological institution in the capital, excelling in scientific research, innovation incubation, and global industry partnerships.',
        location: {
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
        },
        website: 'https://home.iitd.ac.in',
        establishedYear: 1961,
        contactEmail: 'info@admin.iitd.ac.in',
        coursesOffered: ['B.Tech CSE', 'B.Tech Mechanical', 'M.Sc Physics', 'MBA Telecommunication'],
        createdBy: admin._id,
      },
      {
        name: 'Birla Institute of Technology and Science, Pilani',
        description:
          'Eminent deemed private university focusing on science, engineering, and digital entrepreneurship with world-class labs.',
        location: {
          city: 'Pilani',
          state: 'Rajasthan',
          country: 'India',
        },
        website: 'https://www.bits-pilani.ac.in',
        establishedYear: 1964,
        contactEmail: 'admissions@pilani.bits-pilani.ac.in',
        coursesOffered: ['B.E. Computer Science', 'B.E. Electronics', 'M.Sc Economics', 'B.Pharm'],
        createdBy: admin._id,
      },
      {
        name: 'National Institute of Technology Tiruchirappalli',
        description:
          'Leading National Institute of Technology distinguished for academic excellence, inclusive campus culture, and strong alumni network.',
        location: {
          city: 'Tiruchirappalli',
          state: 'Tamil Nadu',
          country: 'India',
        },
        website: 'https://www.nitt.edu',
        establishedYear: 1964,
        contactEmail: 'dean_ac@nitt.edu',
        coursesOffered: ['B.Tech Production', 'B.Tech Chemical', 'M.C.A.', 'M.Tech VLSI'],
        createdBy: admin._id,
      },
      {
        name: "St. Xavier's College",
        description:
          'Historic autonomous arts, science, and commerce college acclaimed for vibrant student life, holistic education, and liberal arts tradition.',
        location: {
          city: 'Kolkata',
          state: 'West Bengal',
          country: 'India',
        },
        website: 'https://www.sxccal.edu',
        establishedYear: 1860,
        contactEmail: 'principal@sxccal.edu',
        coursesOffered: ['B.Sc Economics', 'B.Com Honours', 'B.A. English Literature', 'M.Sc Computer Science'],
        createdBy: admin._id,
      },
    ]);

    const [iitb, iitd, bits, nitt, sxc] = colleges;
    console.log(`Created ${colleges.length} colleges.`);

    // 3. Create Seed Reviews
    console.log('Seeding Reviews...');
    const reviewsData = [
      // IIT Bombay reviews
      {
        college: iitb._id,
        user: student1._id,
        rating: 5,
        title: 'Unmatched peer group and infinite career opportunities',
        comment:
          'Studying here has transformed my problem solving skills. Campus festivals like Mood Indigo and tech fests are incredible.',
        courseTaken: 'B.Tech Computer Science',
        pros: ['World-class professors', 'Highest placement packages', 'Active alumni community'],
        cons: ['High academic rigor and competition'],
      },
      {
        college: iitb._id,
        user: teacher._id,
        rating: 5,
        title: 'Excellence in research infrastructure and funding',
        comment:
          'As a visiting faculty, I was immensely impressed by the laboratory facilities and research motivation among students.',
        courseTaken: 'M.Tech AI & Data Science',
        pros: ['Generous research grants', 'Global collaborations'],
        cons: ['Administrative processes could be faster'],
      },
      {
        college: iitb._id,
        user: student2._id,
        rating: 4,
        title: 'Great campus life with lush green surroundings in Powai',
        comment:
          'The hostel culture and 24/7 library are fantastic. Food options could be improved slightly.',
        courseTaken: 'B.Tech Electrical',
        pros: ['Powai lake view', '24x7 facilities', 'Student clubs'],
        cons: ['Hostel rooms are somewhat small for freshmen'],
      },

      // IIT Delhi reviews
      {
        college: iitd._id,
        user: student3._id,
        rating: 5,
        title: 'Prime location and unparalleled startup ecosystem',
        comment:
          'Being in the heart of Delhi gives immense exposure to industry leaders, tech conferences, and funding incubators.',
        courseTaken: 'B.Tech CSE',
        pros: ['Location advantage', 'Top research mentors', 'Entrepreneurship cell'],
        cons: ['Delhi pollution during winter'],
      },
      {
        college: iitd._id,
        user: student1._id,
        rating: 4,
        title: 'Intense academics with top quality placements',
        comment:
          'The curriculum is updated regularly and tests true conceptual understanding rather than rote memorization.',
        courseTaken: 'B.Tech Mechanical',
        pros: ['Industry-aligned curriculum', 'Great placement statistics'],
        cons: ['Continuous evaluation can get hectic'],
      },

      // BITS Pilani reviews
      {
        college: bits._id,
        user: student2._id,
        rating: 5,
        title: 'Zero attendance policy and merit-first culture',
        comment:
          'The flexible curriculum and Practice School (internship) program are truly ahead of their time.',
        courseTaken: 'B.E. Computer Science',
        pros: ['No compulsory attendance', 'Practice School semester internships', 'Great coding culture'],
        cons: ['Relatively high tuition fees'],
      },
      {
        college: bits._id,
        user: teacher._id,
        rating: 4,
        title: 'Supportive academic leadership and freedom to innovate',
        comment:
          'Teaching students at BITS is a joy due to their independent thinking and high self-motivation.',
        courseTaken: 'B.E. Electronics',
        pros: ['Academic freedom', 'Focus on innovation'],
        cons: ['Remote campus location'],
      },

      // NIT Trichy reviews
      {
        college: nitt._id,
        user: student3._id,
        rating: 4,
        title: 'Best NIT in India with tremendous core engineering placements',
        comment:
          'Superb balance between technical education, sports, and cultural festivals like Festember.',
        courseTaken: 'B.Tech Production',
        pros: ['Affordable fees', 'Strong placement record', 'Festember festival'],
        cons: ['Hot climate for most of the year'],
      },

      // St. Xavier's College reviews
      {
        college: sxc._id,
        user: student1._id,
        rating: 4,
        title: 'Vibrant arts and commerce heritage',
        comment:
          'Rich culture of debate, literature, and holistic development. The faculty are extremely caring.',
        courseTaken: 'B.Sc Economics',
        pros: ['Heritage campus', 'Compassionate teachers', 'Strong alumni'],
        cons: ['Limited engineering and technical infrastructure'],
      },
    ];

    await Review.create(reviewsData);
    console.log(`Created ${reviewsData.length} reviews.`);

    // Recalculate aggregation metrics for each college
    console.log('Calculating and syncing average rating aggregations for all colleges...');
    for (const college of colleges) {
      const stats = await Review.calcAverageRating(college._id);
      console.log(`  -> ${college.name}: Avg Rating = ${stats.averageRating}, Total Reviews = ${stats.totalReviews}`);
    }

    console.log('\n==========================================');
    console.log(' SEED DATA GENERATED SUCCESSFULLY');
    console.log('==========================================');
    console.log('Demo Credentials for Testing:');
    console.log('  Admin:   admin@collegereviews.com    | AdminPass123!');
    console.log('  Teacher: teacher@collegereviews.com  | TeacherPass123!');
    console.log('  Student: student1@collegereviews.com | StudentPass123!');
    console.log('  Student: student2@collegereviews.com | StudentPass123!');
    console.log('==========================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedData();
