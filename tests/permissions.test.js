const request = require('supertest');
const { app } = require('./testHelper');

describe('Security & Permission Controls', () => {
  it('should return 401 Unauthorized when accessing feed without session', async () => {
    const res = await request(app).get('/api/posts/feed');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it('should return 401 Unauthorized when creating post without session', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ content: 'Unauthenticated post' });
    expect(res.status).toBe(401);
  });

  it('should return 401 Unauthorized when accessing notifications without session', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('should return 401 Unauthorized when updating profile without session', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .send({ bio: 'Hacker bio' });
    expect(res.status).toBe(401);
  });

  it('should return 404 JSON for nonexistent API routes', async () => {
    const res = await request(app).get('/api/some-undefined-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not found');
  });
});
