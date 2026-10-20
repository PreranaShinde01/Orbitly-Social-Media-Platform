-- Orbitly Database Schema
PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (DATETIME('now'))
);

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_path TEXT DEFAULT '',
  cover_path TEXT DEFAULT '',
  location TEXT DEFAULT '',
  website TEXT DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  image_path TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT (DATETIME('now')),
  updated_at DATETIME NOT NULL DEFAULT (DATETIME('now')),
  is_edited INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments Table (supports 1-level deep nested replies)
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  parent_id INTEGER DEFAULT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Post Likes Table
CREATE TABLE IF NOT EXISTS post_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (DATETIME('now')),
  UNIQUE(user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Comment Likes Table
CREATE TABLE IF NOT EXISTS comment_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  comment_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (DATETIME('now')),
  UNIQUE(user_id, comment_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Follows Table (Prevent self-follow via CHECK constraint)
CREATE TABLE IF NOT EXISTS follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id INTEGER NOT NULL,
  following_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (DATETIME('now')),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Hashtags Table
CREATE TABLE IF NOT EXISTS hashtags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

-- Post Hashtags Junction Table
CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id INTEGER NOT NULL,
  hashtag_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, hashtag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (hashtag_id) REFERENCES hashtags(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('like', 'comment', 'reply', 'follow')),
  post_id INTEGER DEFAULT NULL,
  comment_id INTEGER DEFAULT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Sessions Table for persistent session storage
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired DATETIME NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);
