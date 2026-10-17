const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { ROLES } = require('../src/constants/roles');

describe('Auth Integration Tests (POST /api/v1/auth/*, GET /api/v1/auth/me)', () => {
  const testUser = {
    name: 'Vasim FullStack',
    email: 'vasim.test@example.com',
    password: 'Password123!',
    role: ROLES.STUDENT,
    department: 'Computer Science',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return 201 with JWT token', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.role).toBe(ROLES.STUDENT);
      expect(res.body.data.user.password).toBeUndefined();

      // Verify in DB
      const dbUser = await User.findOne({ email: testUser.email });
      expect(dbUser).not.toBeNull();
      expect(dbUser.password).not.toBe(testUser.password); // Verify hashed
    });

    it('should fail with 409 Conflict if email is already registered', async () => {
      await request(app).post('/api/v1/auth/register').send(testUser);

      const duplicateRes = await request(app).post('/api/v1/auth/register').send(testUser);

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.message).toMatch(/already exists/i);
    });

    it('should fail with 422 if required fields are missing or invalid', async () => {
      const invalidPayload = {
        name: 'V', // too short
        email: 'not-an-email',
        password: '123', // too short
      };

      const res = await request(app).post('/api/v1/auth/register').send(invalidPayload);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(testUser);
    });

    it('should authenticate user and return 200 with JWT token for valid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should fail with 401 Unauthorized for incorrect password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid.*credentials/i);
    });

    it('should fail with 401 Unauthorized for unregistered email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken;

    beforeEach(async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(testUser);
      authToken = reg.body.data.token;
    });

    it('should return user profile when authenticated with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should fail with 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with 401 when token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    let authToken;

    beforeEach(async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(testUser);
      authToken = reg.body.data.token;
    });

    it('should update user name and department', async () => {
      const res = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Vasim Updated',
          department: 'Data Science',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.name).toBe('Vasim Updated');
      expect(res.body.data.user.department).toBe('Data Science');
    });
  });
});
