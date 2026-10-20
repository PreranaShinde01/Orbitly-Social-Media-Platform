const { getAgent } = require('./testHelper');

describe('Posts & Likes System', () => {
  const ts = Date.now();
  let authorAgent;
  let otherAgent;
  let createdPostId;

  beforeAll(async () => {
    authorAgent = getAgent();
    otherAgent = getAgent();

    // Create author
    await authorAgent.post('/api/auth/register').send({
      username: `author_${ts}`,
      email: `author_${ts}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
      display_name: 'Author User'
    });

    // Create another user
    await otherAgent.post('/api/auth/register').send({
      username: `other_${ts}`,
      email: `other_${ts}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
      display_name: 'Other User'
    });
  });

  it('should create a new post with hashtags', async () => {
    const res = await authorAgent
      .post('/api/posts')
      .send({ content: 'Hello universe! Testing #orbitly and #galaxy' });

    expect(res.status).toBe(201);
    expect(res.body.post).toBeDefined();
    expect(res.body.post.content).toContain('Hello universe!');
    createdPostId = res.body.post.id;
  });

  it('should reject creating empty post', async () => {
    const res = await authorAgent
      .post('/api/posts')
      .send({ content: '   ' });

    expect(res.status).toBe(422);
  });

  it('should get post details by ID', async () => {
    const res = await authorAgent.get(`/api/posts/${createdPostId}`);
    expect(res.status).toBe(200);
    expect(res.body.post.id).toBe(createdPostId);
  });

  it('should return 404 for nonexistent post ID', async () => {
    const res = await authorAgent.get('/api/posts/999999');
    expect(res.status).toBe(404);
  });

  it('should allow author to edit their own post', async () => {
    const res = await authorAgent
      .put(`/api/posts/${createdPostId}`)
      .send({ content: 'Updated content with #supernova' });

    expect(res.status).toBe(200);
    expect(res.body.post.content).toBe('Updated content with #supernova');
    expect(res.body.post.is_edited).toBe(1);
  });

  it('should reject editing post by a different user with 403 Forbidden', async () => {
    const res = await otherAgent
      .put(`/api/posts/${createdPostId}`)
      .send({ content: 'Malicious modification attempt' });

    expect(res.status).toBe(403);
  });

  it('should allow another user to like and unlike a post', async () => {
    // Like post
    const likeRes = await otherAgent.post(`/api/posts/${createdPostId}/like`);
    expect(likeRes.status).toBe(200);
    expect(likeRes.body.is_liked).toBe(true);
    expect(likeRes.body.likes_count).toBeGreaterThanOrEqual(1);

    // Prevent duplicate like
    await otherAgent.post(`/api/posts/${createdPostId}/like`);
    const checkRes = await otherAgent.get(`/api/posts/${createdPostId}`);
    expect(checkRes.body.post.likes_count).toBe(1);

    // Unlike post
    const unlikeRes = await otherAgent.delete(`/api/posts/${createdPostId}/like`);
    expect(unlikeRes.status).toBe(200);
    expect(unlikeRes.body.is_liked).toBe(false);
    expect(unlikeRes.body.likes_count).toBe(0);
  });

  it('should reject deleting post by a non-author with 403 Forbidden', async () => {
    const res = await otherAgent.delete(`/api/posts/${createdPostId}`);
    expect(res.status).toBe(403);
  });

  it('should allow author to delete their own post', async () => {
    const res = await authorAgent.delete(`/api/posts/${createdPostId}`);
    expect(res.status).toBe(200);

    const checkRes = await authorAgent.get(`/api/posts/${createdPostId}`);
    expect(checkRes.status).toBe(404);
  });
});
