const queries = require('../db/queries');
const { timeAgo } = require('../utils/time');

/**
 * Decorates post objects with relative time string
 */
function formatPost(post) {
  if (!post) return null;
  return {
    ...post,
    relative_time: timeAgo(post.created_at)
  };
}

function getHomeFeed(db, userId, { page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const posts = queries.getHomeFeed(db, userId, limitNum, offset);
  return posts.map(formatPost);
}

function getExploreFeed(db, { sort = 'latest', page = 1, limit = 20, currentUserId = null }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const posts = queries.getExplorePosts(db, {
    sort,
    limit: limitNum,
    offset,
    currentUserId
  });
  return posts.map(formatPost);
}

function getUserPosts(db, targetUserId, { page = 1, limit = 20, currentUserId = null }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const posts = queries.getUserPosts(db, targetUserId, limitNum, offset, currentUserId);
  return posts.map(formatPost);
}

function getUserLikedPosts(db, targetUserId, { page = 1, limit = 20, currentUserId = null }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const posts = queries.getUserLikedPosts(db, targetUserId, limitNum, offset, currentUserId);
  return posts.map(formatPost);
}

function getPostsByHashtag(db, tagName, { page = 1, limit = 20, currentUserId = null }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const posts = queries.getPostsByHashtag(db, tagName, limitNum, offset, currentUserId);
  return posts.map(formatPost);
}

module.exports = {
  formatPost,
  getHomeFeed,
  getExploreFeed,
  getUserPosts,
  getUserLikedPosts,
  getPostsByHashtag
};
