const { getDb } = require('../db/connection');
const queries = require('../db/queries');
const { timeAgo } = require('../utils/time');
const { notifyComment } = require('../services/notificationService');

function getComments(req, res, next) {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.session ? req.session.userId : null;
    const db = getDb();

    const post = queries.getPostById(db, postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const rawComments = queries.getPostComments(db, postId, currentUserId);

    // Structure raw comments into top-level comments and 1-level nested replies
    const topLevel = [];
    const replyMap = new Map();

    for (const comment of rawComments) {
      const formatted = {
        ...comment,
        relative_time: timeAgo(comment.created_at),
        can_delete: currentUserId && (currentUserId === comment.author_id || currentUserId === post.author_id),
        replies: []
      };

      if (!comment.parent_id) {
        topLevel.push(formatted);
      } else {
        if (!replyMap.has(comment.parent_id)) {
          replyMap.set(comment.parent_id, []);
        }
        replyMap.get(comment.parent_id).push(formatted);
      }
    }

    // Attach nested replies to top-level comments
    for (const comment of topLevel) {
      if (replyMap.has(comment.id)) {
        comment.replies = replyMap.get(comment.id);
      }
    }

    res.json({ comments: topLevel, total_count: rawComments.length });
  } catch (err) {
    next(err);
  }
}

function createComment(req, res, next) {
  try {
    const postId = parseInt(req.params.id, 10);
    const authorId = req.session.userId;
    const { content, parent_id } = req.body;
    const db = getDb();

    const post = queries.getPostById(db, postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    let validParentId = null;
    if (parent_id) {
      const parentComment = queries.getCommentById(db, parseInt(parent_id, 10));
      if (!parentComment || parentComment.post_id !== postId) {
        return res.status(400).json({ error: 'Invalid parent comment.' });
      }
      // Restrict nesting to one level deep (if parent already has a parent, attach to root parent)
      validParentId = parentComment.parent_id ? parentComment.parent_id : parentComment.id;
    }

    const commentId = queries.createComment(db, {
      post_id: postId,
      author_id: authorId,
      parent_id: validParentId,
      content: content.trim()
    });

    // Notify post owner and/or parent comment author
    notifyComment(db, {
      senderId: authorId,
      postId,
      commentId,
      parentId: validParentId
    });

    const authorProfile = queries.getUserProfile(db, req.session.username, authorId);

    const newComment = {
      id: commentId,
      post_id: postId,
      author_id: authorId,
      parent_id: validParentId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      relative_time: 'just now',
      username: req.session.username,
      display_name: authorProfile ? authorProfile.display_name : req.session.username,
      avatar_path: authorProfile ? authorProfile.avatar_path : '',
      likes_count: 0,
      is_liked: 0,
      can_delete: true,
      replies: []
    };

    res.status(201).json({
      message: 'Comment posted successfully',
      comment: newComment
    });
  } catch (err) {
    next(err);
  }
}

function deleteComment(req, res, next) {
  try {
    const commentId = parseInt(req.params.id, 10);
    const currentUserId = req.session.userId;
    const db = getDb();

    const comment = queries.getCommentById(db, commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    // Permission check: either comment author or post owner
    if (comment.author_id !== currentUserId && comment.post_author_id !== currentUserId) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this comment.' });
    }

    queries.deleteComment(db, commentId);

    res.json({ message: 'Comment deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

function likeComment(req, res, next) {
  try {
    const commentId = parseInt(req.params.id, 10);
    const userId = req.session.userId;
    const db = getDb();

    const comment = queries.getCommentById(db, commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    queries.likeComment(db, userId, commentId);

    const row = db.prepare(`SELECT COUNT(*) AS count FROM comment_likes WHERE comment_id = ?`).get(commentId);

    res.json({
      message: 'Comment liked',
      is_liked: true,
      likes_count: row ? row.count : 0
    });
  } catch (err) {
    next(err);
  }
}

function unlikeComment(req, res, next) {
  try {
    const commentId = parseInt(req.params.id, 10);
    const userId = req.session.userId;
    const db = getDb();

    const comment = queries.getCommentById(db, commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    queries.unlikeComment(db, userId, commentId);

    const row = db.prepare(`SELECT COUNT(*) AS count FROM comment_likes WHERE comment_id = ?`).get(commentId);

    res.json({
      message: 'Comment unliked',
      is_liked: false,
      likes_count: row ? row.count : 0
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getComments,
  createComment,
  deleteComment,
  likeComment,
  unlikeComment
};
