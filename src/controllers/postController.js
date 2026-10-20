const { getDb } = require('../db/connection');
const queries = require('../db/queries');
const feedService = require('../services/feedService');
const { processPostHashtags } = require('../services/hashtagService');
const { notifyPostLike } = require('../services/notificationService');

function getFeed(req, res, next) {
  try {
    const userId = req.session.userId;
    const { page, limit } = req.query;
    const db = getDb();

    const posts = feedService.getHomeFeed(db, userId, { page, limit });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

function getExplore(req, res, next) {
  try {
    const currentUserId = req.session ? req.session.userId : null;
    const { sort, page, limit } = req.query;
    const db = getDb();

    const posts = feedService.getExploreFeed(db, { sort, page, limit, currentUserId });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

function getPost(req, res, next) {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.session ? req.session.userId : null;
    const db = getDb();

    const post = queries.getPostById(db, postId, currentUserId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json({ post: feedService.formatPost(post) });
  } catch (err) {
    next(err);
  }
}

function getByTag(req, res, next) {
  try {
    const tagName = req.params.name;
    const currentUserId = req.session ? req.session.userId : null;
    const { page, limit } = req.query;
    const db = getDb();

    const posts = feedService.getPostsByHashtag(db, tagName, { page, limit, currentUserId });
    res.json({ tag: tagName, posts });
  } catch (err) {
    next(err);
  }
}

function createPost(req, res, next) {
  try {
    const authorId = req.session.userId;
    const { content } = req.body;
    const db = getDb();

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const postId = queries.createPost(db, {
      author_id: authorId,
      content: content.trim(),
      image_path: imagePath
    });

    // Extract & sync hashtags
    processPostHashtags(db, postId, content);

    const post = queries.getPostById(db, postId, authorId);

    res.status(201).json({
      message: 'Post created successfully',
      post: feedService.formatPost(post)
    });
  } catch (err) {
    next(err);
  }
}

function updatePost(req, res, next) {
  try {
    const postId = parseInt(req.params.id, 10);
    const authorId = req.session.userId;
    const { content } = req.body;
    const db = getDb();

    const existingPost = queries.getPostById(db, postId);
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (existingPost.author_id !== authorId) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own posts.' });
    }

    queries.updatePost(db, postId, authorId, content.trim());
    processPostHashtags(db, postId, content);

    const updated = queries.getPostById(db, postId, authorId);

    res.json({
      message: 'Post updated successfully',
      post: feedService.formatPost(updated)
    });
  } catch (err) {
    next(err);
  }
}

function deletePost(req, res, next) {
  try {
    const postId = parseInt(req.params.id, 10);
    const authorId = req.session.userId;
    const db = getDb();

    const existingPost = queries.getPostById(db, postId);
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (existingPost.author_id !== authorId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own posts.' });
    }

    queries.deletePost(db, postId, authorId);

    res.json({ message: 'Post deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

function likePost(req, res, next) {
  try {
    const postId = parseInt(req.params.id, 10);
    const userId = req.session.userId;
    const db = getDb();

    const post = queries.getPostById(db, postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    queries.likePost(db, userId, postId);
    notifyPostLike(db, { senderId: userId, postId });

    const updatedPost = queries.getPostById(db, postId, userId);

    res.json({
      message: 'Post liked',
      is_liked: true,
      likes_count: updatedPost.likes_count
    });
  } catch (err) {
    next(err);
  }
}

function unlikePost(req, res, next) {
  try {
    const postId = parseInt(req.params.id, 10);
    const userId = req.session.userId;
    const db = getDb();

    const post = queries.getPostById(db, postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    queries.unlikePost(db, userId, postId);
    const updatedPost = queries.getPostById(db, postId, userId);

    res.json({
      message: 'Post unliked',
      is_liked: false,
      likes_count: updatedPost.likes_count
    });
  } catch (err) {
    next(err);
  }
}

function getPostLikes(req, res, next) {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.session ? req.session.userId : null;
    const db = getDb();

    const post = queries.getPostById(db, postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const likes = queries.getPostLikes(db, postId, currentUserId);
    res.json({ likes });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFeed,
  getExplore,
  getPost,
  getByTag,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getPostLikes
};
