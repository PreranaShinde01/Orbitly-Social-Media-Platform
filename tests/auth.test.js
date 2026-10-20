const { getAgent } = require('./testHelper');

describe('Authentication & User Management', () => {
  const rand = Math.floor(Math.random() * 900000 + 100000);
  const testUser = {
    username: `usr_${rand}`,
    email: `usr_${rand}@example.com`,
    password: 'password123',
    confirmPassword: 'password123',
    display_name: 'Test Pilot'
  };

  it('should register a new user successfully and return user data', async () => {
    const agent = getAgent();
    const res = await agent
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe(testUser.username);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('should reject registration with duplicate username', async () => {
    const agent = getAgent();
    const res = await agent
      .post('/api/auth/register')
      .send({
        ...testUser,
        email: `diff_${rand}@example.com`
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username is already taken/i);
  });

  it('should reject registration with duplicate email', async () => {
    const agent = getAgent();
    const res = await agent
      .post('/api/auth/register')
      .send({
        ...testUser,
        username: `diff_${rand}`
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email is already registered/i);
  });

  it('should validate password length and confirmation match', async () => {
    const agent = getAgent();
    const res = await agent
      .post('/api/auth/register')
      .send({
        username: 'shortpwd',
        email: 'short@example.com',
        password: '123',
        confirmPassword: '456'
      });

    expect(res.status).toBe(422);
  });

  it('should login with valid credentials and establish session', async () => {
    const agent = getAgent();
    const res = await agent
      .post('/api/auth/login')
      .send({
        identifier: testUser.username,
        password: testUser.password,
        rememberMe: true
      });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(testUser.username);

    // Verify session via /api/auth/me
    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.username).toBe(testUser.username);
  });

  it('should reject login with wrong password', async () => {
    const agent = getAgent();
    const res = await agent
      .post('/api/auth/login')
      .send({
        identifier: testUser.username,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
  });

  it('should allow changing password and logging in with new password', async () => {
    const agent = getAgent();
    await agent
      .post('/api/auth/login')
      .send({
        identifier: testUser.username,
        password: testUser.password
      });

    const changeRes = await agent
      .post('/api/auth/change-password')
      .send({
        currentPassword: testUser.password,
        newPassword: 'newsecurepassword123',
        confirmPassword: 'newsecurepassword123'
      });

    expect(changeRes.status).toBe(200);

    // Logout
    await agent.post('/api/auth/logout');

    // Login with new password
    const newLoginRes = await agent
      .post('/api/auth/login')
      .send({
        identifier: testUser.username,
        password: 'newsecurepassword123'
      });

    expect(newLoginRes.status).toBe(200);
  });
});
