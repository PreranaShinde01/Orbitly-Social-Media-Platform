const queries = require('../db/queries');

/**
 * Notification service for handling user event notifications
 */
function notifyPostLike(db, { senderId, postId }) {
  const post = queries.getPostById(db, postId);
  if (!post) return null;
  if (post.author_id === senderId) return null; // Never notify own action

  return queries.createNotification(db, {
    recipient_id: post.author_id,
    sender_id: senderId,
    type: 'like',
    post_id: postId
  });
}

function notifyComment(db, { senderId, postId, commentId, parentId = null }) {
  const post = queries.getPostById(db, postId);
  if (!post) return null;

  // If this is a nested reply, notify the author of the parent comment
  if (parentId) {
    const parentComment = queries.getCommentById(db, parentId);
    if (parentComment && parentComment.author_id !== senderId) {
      queries.createNotification(db, {
        recipient_id: parentComment.author_id,
        sender_id: senderId,
        type: 'reply',
        post_id: postId,
        comment_id: commentId
      });
    }
  }

  // Also notify the post author (if not the sender and not already notified as parent author)
  if (post.author_id !== senderId) {
    queries.createNotification(db, {
      recipient_id: post.author_id,
      sender_id: senderId,
      type: 'comment',
      post_id: postId,
      comment_id: commentId
    });
  }
}

function notifyFollow(db, { followerId, followingId }) {
  if (followerId === followingId) return null;
  return queries.createNotification(db, {
    recipient_id: followingId,
    sender_id: followerId,
    type: 'follow'
  });
}

module.exports = {
  notifyPostLike,
  notifyComment,
  notifyFollow
};
