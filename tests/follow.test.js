const { getAgent } = require('./testHelper');

describe('Follow System & Feed Integration', () => {
  const ts = Date.now();
  let userA;
  let userB;
  let usernameA = `usera_${ts}`;
  let usernameB = `userb_${ts}`;

  beforeAll(async () => {
    userA = getAgent();
    userB = getAgent();

    await userA.post('/api/auth/register').send({
      username: usernameA,
      email: `${usernameA}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
      display_name: 'User Alpha'
    });

    await userB.post('/api/auth/register').send({
      username: usernameB,
      email: `${usernameB}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
      display_name: 'User Beta'
    });

    // User B creates a post
    await userB.post('/api/posts').send({
      content: 'Hello from User Beta in the cosmos!'
    });
  });

  it('should block self-following with 400 Bad Request', async () => {
    const res = await userA.post(`/api/users/${usernameA}/follow`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot follow yourself/i);
  });

  it('should allow user A to follow user B', async () => {
    const res = await userA.post(`/api/users/${usernameB}/follow`);
    expect(res.status).toBe(200);
    expect(res.body.is_following).toBe(true);
    expect(res.body.followers_count).toBe(1);

    // Verify profile shows is_following: true
    const profileRes = await userA.get(`/api/users/${usernameB}`);
    expect(profileRes.body.user.is_following).toBe(true);
  });

  it('should include followed user posts in home feed', async () => {
    const feedRes = await userA.get('/api/posts/feed');
    expect(feedRes.status).toBe(200);
    expect(feedRes.body.posts.length).toBeGreaterThanOrEqual(1);
    const postFromB = feedRes.body.posts.find(p => p.username === usernameB);
    expect(postFromB).toBeDefined();
    expect(postFromB.content).toContain('User Beta in the cosmos');
  });

  it('should allow user A to unfollow user B', async () => {
    const res = await userA.delete(`/api/users/${usernameB}/follow`);
    expect(res.status).toBe(200);
    expect(res.body.is_following).toBe(false);

    // Verify profile shows is_following: false
    const profileRes = await userA.get(`/api/users/${usernameB}`);
    expect(profileRes.body.user.is_following).toBe(false);
  });

  it('should return suggested users that are not yet followed', async () => {
    const res = await userA.get('/api/users/suggestions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });
});
