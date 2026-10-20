const { getDb } = require('../db/connection');
const queries = require('../db/queries');
const feedService = require('../services/feedService');

function search(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    const type = req.query.type; // 'users', 'posts', or undefined (both)
    const currentUserId = req.session ? req.session.userId : null;
    const db = getDb();

    if (!q) {
      return res.json({ users: [], posts: [] });
    }

    let users = [];
    let posts = [];

    if (!type || type === 'users') {
      users = queries.searchUsers(db, q, 10, currentUserId);
    }

    if (!type || type === 'posts') {
      const rawPosts = queries.searchPosts(db, q, 20, currentUserId);
      posts = rawPosts.map(feedService.formatPost);
    }

    res.json({ users, posts, query: q });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  search
};
