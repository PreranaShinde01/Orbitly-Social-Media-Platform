/**
 * Orbitly Database Abstraction Layer
 * All SQL queries are encapsulated here with parameterized statements.
 * Single-query JOINs and aggregations prevent N+1 issues.
 */

// ==========================================
// USER QUERIES
// ==========================================

function createUser(db, { username, email, password_hash, display_name }) {
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash)
    VALUES (?, ?, ?)
  `);
  const insertProfile = db.prepare(`
    INSERT INTO profiles (user_id, display_name, bio, avatar_path, cover_path, location, website)
    VALUES (?, ?, '', '', '', '', '')
  `);

  const runTx = db.transaction(() => {
    const res = insertUser.run(username, email, password_hash);
    const userId = res.lastInsertRowid;
    insertProfile.run(userId, display_name || username);
    return userId;
  });

  return runTx();
}

function findUserById(db, id) {
  return db.prepare(`
    SELECT id, username, email, created_at
    FROM users
    WHERE id = ?
  `).get(id);
}

function findUserByUsername(db, username) {
  return db.prepare(`
    SELECT id, username, email, password_hash, created_at
    FROM users
    WHERE username = ? COLLATE NOCASE
  `).get(username);
}

function findUserByEmail(db, email) {
  return db.prepare(`
    SELECT id, username, email, password_hash, created_at
    FROM users
    WHERE email = ? COLLATE NOCASE
  `).get(email);
}

function findUserByIdentifier(db, identifier) {
  return db.prepare(`
    SELECT id, username, email, password_hash, created_at
    FROM users
    WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE
  `).get(identifier, identifier);
}

function updateUserPassword(db, userId, newPasswordHash) {
  return db.prepare(`
    UPDATE users
    SET password_hash = ?
    WHERE id = ?
  `).run(newPasswordHash, userId);
}

// ==========================================
// PROFILE QUERIES
// ==========================================

function getUserProfile(db, username, currentUserId = null) {
  return db.prepare(`
    SELECT 
      u.id AS user_id,
      u.username,
      u.email,
      u.created_at,
      p.display_name,
      p.bio,
      p.avatar_path,
      p.cover_path,
      p.location,
      p.website,
      (SELECT COUNT(*) FROM posts WHERE author_id = u.id) AS posts_count,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
      CASE 
        WHEN ? IS NOT NULL AND EXISTS(
          SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id
        ) THEN 1 
        ELSE 0 
      END AS is_following
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    WHERE u.username = ? COLLATE NOCASE
  `).get(currentUserId, currentUserId, username);
}

function updateProfile(db, userId, { display_name, bio, avatar_path, cover_path, location, website }) {
  const current = db.prepare(`SELECT * FROM profiles WHERE user_id = ?`).get(userId);
  if (!current) return null;

  return db.prepare(`
    UPDATE profiles
    SET 
      display_name = COALESCE(?, display_name),
      bio = COALESCE(?, bio),
      avatar_path = COALESCE(?, avatar_path),
      cover_path = COALESCE(?, cover_path),
      location = COALESCE(?, location),
      website = COALESCE(?, website)
    WHERE user_id = ?
  `).run(
    display_name !== undefined ? display_name : null,
    bio !== undefined ? bio : null,
    avatar_path !== undefined ? avatar_path : null,
    cover_path !== undefined ? cover_path : null,
    location !== undefined ? location : null,
    website !== undefined ? website : null,
    userId
  );
}

// ==========================================
// FOLLOW QUERIES
// ==========================================

function followUser(db, followerId, followingId) {
  return db.prepare(`
    INSERT OR IGNORE INTO follows (follower_id, following_id)
    VALUES (?, ?)
  `).run(followerId, followingId);
}

function unfollowUser(db, followerId, followingId) {
  return db.prepare(`
    DELETE FROM follows
    WHERE follower_id = ? AND following_id = ?
  `).run(followerId, followingId);
}

function isFollowing(db, followerId, followingId) {
  const row = db.prepare(`
    SELECT 1 FROM follows
    WHERE follower_id = ? AND following_id = ?
  `).get(followerId, followingId);
  return Boolean(row);
}

function getFollowers(db, targetUserId, currentUserId = null) {
  return db.prepare(`
    SELECT 
      u.id AS user_id,
      u.username,
      p.display_name,
      p.bio,
      p.avatar_path,
      f.created_at AS followed_at,
      CASE 
        WHEN ? IS NOT NULL AND EXISTS(
          SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id
        ) THEN 1 
        ELSE 0 
      END AS is_following
    FROM follows f
    JOIN users u ON u.id = f.follower_id
    JOIN profiles p ON p.user_id = u.id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
  `).all(currentUserId, currentUserId, targetUserId);
}

function getFollowing(db, targetUserId, currentUserId = null) {
  return db.prepare(`
    SELECT 
      u.id AS user_id,
      u.username,
      p.display_name,
      p.bio,
      p.avatar_path,
      f.created_at AS followed_at,
      CASE 
        WHEN ? IS NOT NULL AND EXISTS(
          SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id
        ) THEN 1 
        ELSE 0 
      END AS is_following
    FROM follows f
    JOIN users u ON u.id = f.following_id
    JOIN profiles p ON p.user_id = u.id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
  `).all(currentUserId, currentUserId, targetUserId);
}

function getSuggestedUsers(db, currentUserId, limit = 5) {
  return db.prepare(`
    SELECT 
      u.id AS user_id,
      u.username,
      p.display_name,
      p.bio,
      p.avatar_path,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    WHERE u.id != ?
      AND u.id NOT IN (
        SELECT following_id FROM follows WHERE follower_id = ?
      )
    ORDER BY followers_count DESC, u.created_at DESC
    LIMIT ?
  `).all(currentUserId || 0, currentUserId || 0, limit);
}

// ==========================================
// POST QUERIES
// ==========================================

const POST_SELECT_FIELDS = `
  p.id,
  p.author_id,
  p.content,
  p.image_path,
  p.created_at,
  p.updated_at,
  p.is_edited,
  u.username,
  pr.display_name,
  pr.avatar_path,
  (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
  (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
  CASE 
    WHEN ? IS NOT NULL AND EXISTS(
      SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?
    ) THEN 1 
    ELSE 0 
  END AS is_liked
`;

function createPost(db, { author_id, content, image_path = null }) {
  const stmt = db.prepare(`
    INSERT INTO posts (author_id, content, image_path)
    VALUES (?, ?, ?)
  `);
  const res = stmt.run(author_id, content, image_path);
  return res.lastInsertRowid;
}

function getPostById(db, postId, currentUserId = null) {
  return db.prepare(`
    SELECT ${POST_SELECT_FIELDS}
    FROM posts p
    JOIN users u ON u.id = p.author_id
    JOIN profiles pr ON pr.user_id = u.id
    WHERE p.id = ?
  `).get(currentUserId, currentUserId, postId);
}

function updatePost(db, postId, authorId, content) {
  return db.prepare(`
    UPDATE posts
    SET content = ?, is_edited = 1, updated_at = DATETIME('now')
    WHERE id = ? AND author_id = ?
  `).run(content, postId, authorId);
}

function deletePost(db, postId, authorId) {
  return db.prepare(`
    DELETE FROM posts
    WHERE id = ? AND author_id = ?
  `).run(postId, authorId);
}

function getHomeFeed(db, userId, limit = 20, offset = 0) {
  return db.prepare(`
    SELECT ${POST_SELECT_FIELDS}
    FROM posts p
    JOIN users u ON u.id = p.author_id
    JOIN profiles pr ON pr.user_id = u.id
    WHERE p.author_id = ?
       OR p.author_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, userId, userId, userId, limit, offset);
}

function getExplorePosts(db, { sort = 'latest', limit = 20, offset = 0, currentUserId = null }) {
  if (sort === 'trending') {
    return db.prepare(`
      SELECT 
        ${POST_SELECT_FIELDS},
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND created_at >= DATETIME('now', '-7 days')) AS recent_likes
      FROM posts p
      JOIN users u ON u.id = p.author_id
      JOIN profiles pr ON pr.user_id = u.id
      ORDER BY recent_likes DESC, likes_count DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(currentUserId, currentUserId, limit, offset);
  }

  return db.prepare(`
    SELECT ${POST_SELECT_FIELDS}
    FROM posts p
    JOIN users u ON u.id = p.author_id
    JOIN profiles pr ON pr.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(currentUserId, currentUserId, limit, offset);
}

function getUserPosts(db, targetUserId, limit = 20, offset = 0, currentUserId = null) {
  return db.prepare(`
    SELECT ${POST_SELECT_FIELDS}
    FROM posts p
    JOIN users u ON u.id = p.author_id
    JOIN profiles pr ON pr.user_id = u.id
    WHERE p.author_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(currentUserId, currentUserId, targetUserId, limit, offset);
}

function getUserLikedPosts(db, targetUserId, limit = 20, offset = 0, currentUserId = null) {
  return db.prepare(`
    SELECT ${POST_SELECT_FIELDS}
    FROM post_likes pl
    JOIN posts p ON p.id = pl.post_id
    JOIN users u ON u.id = p.author_id
    JOIN profiles pr ON pr.user_id = u.id
    WHERE pl.user_id = ?
    ORDER BY pl.created_at DESC
    LIMIT ? OFFSET ?
  `).all(currentUserId, currentUserId, targetUserId, limit, offset);
}

function getPostsByHashtag(db, tagName, limit = 20, offset = 0, currentUserId = null) {
  return db.prepare(`
    SELECT ${POST_SELECT_FIELDS}
    FROM hashtags h
    JOIN post_hashtags ph ON ph.hashtag_id = h.id
    JOIN posts p ON p.id = ph.post_id
    JOIN users u ON u.id = p.author_id
    JOIN profiles pr ON pr.user_id = u.id
    WHERE h.name = ? COLLATE NOCASE
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(currentUserId, currentUserId, tagName, limit, offset);
}

// ==========================================
// LIKE QUERIES
// ==========================================

function likePost(db, userId, postId) {
  return db.prepare(`
    INSERT OR IGNORE INTO post_likes (user_id, post_id)
    VALUES (?, ?)
  `).run(userId, postId);
}

function unlikePost(db, userId, postId) {
  return db.prepare(`
    DELETE FROM post_likes
    WHERE user_id = ? AND post_id = ?
  `).run(userId, postId);
}

function getPostLikes(db, postId, currentUserId = null) {
  return db.prepare(`
    SELECT 
      u.id AS user_id,
      u.username,
      p.display_name,
      p.bio,
      p.avatar_path,
      pl.created_at AS liked_at,
      CASE 
        WHEN ? IS NOT NULL AND EXISTS(
          SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id
        ) THEN 1 
        ELSE 0 
      END AS is_following
    FROM post_likes pl
    JOIN users u ON u.id = pl.user_id
    JOIN profiles p ON p.user_id = u.id
    WHERE pl.post_id = ?
    ORDER BY pl.created_at DESC
  `).all(currentUserId, currentUserId, postId);
}

// ==========================================
// COMMENT QUERIES
// ==========================================

function createComment(db, { post_id, author_id, parent_id = null, content }) {
  const stmt = db.prepare(`
    INSERT INTO comments (post_id, author_id, parent_id, content)
    VALUES (?, ?, ?, ?)
  `);
  const res = stmt.run(post_id, author_id, parent_id, content);
  return res.lastInsertRowid;
}

function getCommentById(db, commentId) {
  return db.prepare(`
    SELECT 
      c.*,
      p.author_id AS post_author_id
    FROM comments c
    JOIN posts p ON p.id = c.post_id
    WHERE c.id = ?
  `).get(commentId);
}

function getPostComments(db, postId, currentUserId = null) {
  return db.prepare(`
    SELECT 
      c.id,
      c.post_id,
      c.author_id,
      c.parent_id,
      c.content,
      c.created_at,
      u.username,
      pr.display_name,
      pr.avatar_path,
      (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS likes_count,
      CASE 
        WHEN ? IS NOT NULL AND EXISTS(
          SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = ?
        ) THEN 1 
        ELSE 0 
      END AS is_liked
    FROM comments c
    JOIN users u ON u.id = c.author_id
    JOIN profiles pr ON pr.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(currentUserId, currentUserId, postId);
}

function deleteComment(db, commentId) {
  return db.prepare(`
    DELETE FROM comments
    WHERE id = ?
  `).run(commentId);
}

function likeComment(db, userId, commentId) {
  return db.prepare(`
    INSERT OR IGNORE INTO comment_likes (user_id, comment_id)
    VALUES (?, ?)
  `).run(userId, commentId);
}

function unlikeComment(db, userId, commentId) {
  return db.prepare(`
    DELETE FROM comment_likes
    WHERE user_id = ? AND comment_id = ?
  `).run(userId, commentId);
}

// ==========================================
// HASHTAG QUERIES
// ==========================================

function syncPostHashtags(db, postId, hashtagNames) {
  const deleteOld = db.prepare(`DELETE FROM post_hashtags WHERE post_id = ?`);
  const insertTag = db.prepare(`INSERT OR IGNORE INTO hashtags (name) VALUES (?)`);
  const getTagId = db.prepare(`SELECT id FROM hashtags WHERE name = ? COLLATE NOCASE`);
  const insertJunction = db.prepare(`INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)`);

  const runTx = db.transaction(() => {
    deleteOld.run(postId);
    for (const name of hashtagNames) {
      insertTag.run(name);
      const row = getTagId.get(name);
      if (row) {
        insertJunction.run(postId, row.id);
      }
    }
  });

  runTx();
}

// ==========================================
// NOTIFICATIONS QUERIES
// ==========================================

function createNotification(db, { recipient_id, sender_id, type, post_id = null, comment_id = null }) {
  if (recipient_id === sender_id) {
    return null; // Never notify user for their own actions
  }

  // Avoid spamming duplicate like/follow notifications if an unread one already exists
  const existing = db.prepare(`
    SELECT id FROM notifications 
    WHERE recipient_id = ? AND sender_id = ? AND type = ? 
      AND (post_id = ? OR (post_id IS NULL AND ? IS NULL))
      AND is_read = 0
  `).get(recipient_id, sender_id, type, post_id, post_id);

  if (existing) {
    return existing.id;
  }

  const stmt = db.prepare(`
    INSERT INTO notifications (recipient_id, sender_id, type, post_id, comment_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const res = stmt.run(recipient_id, sender_id, type, post_id, comment_id);
  return res.lastInsertRowid;
}

function getUserNotifications(db, userId, limit = 30, offset = 0) {
  return db.prepare(`
    SELECT 
      n.id,
      n.type,
      n.post_id,
      n.comment_id,
      n.is_read,
      n.created_at,
      u.username AS sender_username,
      pr.display_name AS sender_display_name,
      pr.avatar_path AS sender_avatar_path,
      p.content AS post_snippet
    FROM notifications n
    JOIN users u ON u.id = n.sender_id
    JOIN profiles pr ON pr.user_id = u.id
    LEFT JOIN posts p ON p.id = n.post_id
    WHERE n.recipient_id = ?
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);
}

function getUnreadNotificationCount(db, userId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM notifications
    WHERE recipient_id = ? AND is_read = 0
  `).get(userId);
  return row ? row.count : 0;
}

function markNotificationAsRead(db, notificationId, userId) {
  return db.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE id = ? AND recipient_id = ?
  `).run(notificationId, userId);
}

function markAllNotificationsAsRead(db, userId) {
  return db.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE recipient_id = ?
  `).run(userId);
}

// ==========================================
// SEARCH QUERIES
// ==========================================

function searchUsers(db, query, limit = 20, currentUserId = null) {
  const likeParam = `%${query}%`;
  return db.prepare(`
    SELECT 
      u.id AS user_id,
      u.username,
      p.display_name,
      p.bio,
      p.avatar_path,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
      CASE 
        WHEN ? IS NOT NULL AND EXISTS(
          SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id
        ) THEN 1 
        ELSE 0 
      END AS is_following
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    WHERE u.username LIKE ? OR p.display_name LIKE ?
    ORDER BY followers_count DESC
    LIMIT ?
  `).all(currentUserId, currentUserId, likeParam, likeParam, limit);
}

function searchPosts(db, query, limit = 20, currentUserId = null) {
  const cleanTag = query.startsWith('#') ? query.slice(1).toLowerCase() : null;
  const likeParam = `%${query}%`;

  if (cleanTag) {
    return getPostsByHashtag(db, cleanTag, limit, 0, currentUserId);
  }

  return db.prepare(`
    SELECT ${POST_SELECT_FIELDS}
    FROM posts p
    JOIN users u ON u.id = p.author_id
    JOIN profiles pr ON pr.user_id = u.id
    WHERE p.content LIKE ?
    ORDER BY p.created_at DESC
    LIMIT ?
  `).all(currentUserId, currentUserId, likeParam, limit);
}

module.exports = {
  createUser,
  findUserById,
  findUserByUsername,
  findUserByEmail,
  findUserByIdentifier,
  updateUserPassword,
  getUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  getSuggestedUsers,
  createPost,
  getPostById,
  updatePost,
  deletePost,
  getHomeFeed,
  getExplorePosts,
  getUserPosts,
  getUserLikedPosts,
  getPostsByHashtag,
  likePost,
  unlikePost,
  getPostLikes,
  createComment,
  getCommentById,
  getPostComments,
  deleteComment,
  likeComment,
  unlikeComment,
  syncPostHashtags,
  createNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  searchUsers,
  searchPosts
};
