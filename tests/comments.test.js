const { getAgent } = require('./testHelper');

describe('Comments & Nested Replies', () => {
  const rand = Math.floor(Math.random() * 900000 + 100000);
  let postOwnerAgent;
  let commenterAgent;
  let bystanderAgent;
  let postId;

  beforeAll(async () => {
    postOwnerAgent = getAgent();
    commenterAgent = getAgent();
    bystanderAgent = getAgent();

    await postOwnerAgent.post('/api/auth/register').send({
      username: `own_${rand}`,
      email: `own_${rand}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
      display_name: 'Post Owner'
    });

    await commenterAgent.post('/api/auth/register').send({
      username: `com_${rand}`,
      email: `com_${rand}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
      display_name: 'Commenter'
    });

    await bystanderAgent.post('/api/auth/register').send({
      username: `bys_${rand}`,
      email: `bys_${rand}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
      display_name: 'Bystander'
    });

    // Create a post
    const postRes = await postOwnerAgent.post('/api/posts').send({
      content: 'Discussion post for comments test'
    });
    postId = postRes.body.post.id;
  });

  it('should allow adding a comment to a post', async () => {
    const res = await commenterAgent
      .post(`/api/posts/${postId}/comments`)
      .send({ content: 'This is a top-level comment' });

    expect(res.status).toBe(201);
    expect(res.body.comment).toBeDefined();
    expect(res.body.comment.content).toBe('This is a top-level comment');
  });

  it('should allow adding a nested reply to a comment', async () => {
    // Get comment id
    const commentsList = await postOwnerAgent.get(`/api/posts/${postId}/comments`);
    const parentCommentId = commentsList.body.comments[0].id;

    const replyRes = await postOwnerAgent
      .post(`/api/posts/${postId}/comments`)
      .send({
        content: 'This is a nested reply from the post owner',
        parent_id: parentCommentId
      });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.comment.parent_id).toBe(parentCommentId);

    // Verify structured comments return nested replies
    const updatedComments = await postOwnerAgent.get(`/api/posts/${postId}/comments`);
    expect(updatedComments.body.comments[0].replies.length).toBe(1);
    expect(updatedComments.body.comments[0].replies[0].content).toContain('nested reply');
  });

  it('should allow liking and unliking a comment', async () => {
    const commentsList = await postOwnerAgent.get(`/api/posts/${postId}/comments`);
    const commentId = commentsList.body.comments[0].id;

    // Like comment
    const likeRes = await bystanderAgent.post(`/api/comments/${commentId}/like`);
    expect(likeRes.status).toBe(200);
    expect(likeRes.body.is_liked).toBe(true);
    expect(likeRes.body.likes_count).toBe(1);

    // Unlike comment
    const unlikeRes = await bystanderAgent.delete(`/api/comments/${commentId}/like`);
    expect(unlikeRes.status).toBe(200);
    expect(unlikeRes.body.is_liked).toBe(false);
    expect(unlikeRes.body.likes_count).toBe(0);
  });

  it('should reject deleting a comment by an unrelated bystander with 403', async () => {
    const commentsList = await postOwnerAgent.get(`/api/posts/${postId}/comments`);
    const commentId = commentsList.body.comments[0].id;

    const res = await bystanderAgent.delete(`/api/comments/${commentId}`);
    expect(res.status).toBe(403);
  });

  it('should allow post owner to delete comments on their own post', async () => {
    const commentsList = await postOwnerAgent.get(`/api/posts/${postId}/comments`);
    const replyId = commentsList.body.comments[0].replies[0].id;

    const res = await postOwnerAgent.delete(`/api/comments/${replyId}`);
    expect(res.status).toBe(200);
  });

  it('should allow comment author to delete their own comment', async () => {
    const commentsList = await postOwnerAgent.get(`/api/posts/${postId}/comments`);
    const commentId = commentsList.body.comments[0].id;

    const res = await commenterAgent.delete(`/api/comments/${commentId}`);
    expect(res.status).toBe(200);
  });
});
