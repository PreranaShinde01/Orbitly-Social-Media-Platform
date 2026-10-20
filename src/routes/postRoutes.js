const express = require('express');
const { body } = require('express-validator');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload } = require('../config/multer');

const router = express.Router();

const postValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Post content cannot be empty.')
    .isLength({ max: 500 })
    .withMessage('Post content cannot exceed 500 characters.')
];

const commentValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content cannot be empty.')
    .isLength({ max: 280 })
    .withMessage('Comment cannot exceed 280 characters.')
];

// Feeds and discovery routes
router.get('/feed', requireAuth, postController.getFeed);
router.get('/explore', optionalAuth, postController.getExplore);
router.get('/tag/:name', optionalAuth, postController.getByTag);

// Post creation
router.post('/', requireAuth, upload.single('image'), postValidation, validate, postController.createPost);

// Specific post routes
router.get('/:id', optionalAuth, postController.getPost);
router.put('/:id', requireAuth, postValidation, validate, postController.updatePost);
router.delete('/:id', requireAuth, postController.deletePost);

// Post likes
router.post('/:id/like', requireAuth, postController.likePost);
router.delete('/:id/like', requireAuth, postController.unlikePost);
router.get('/:id/likes', optionalAuth, postController.getPostLikes);

// Comments on posts
router.get('/:id/comments', optionalAuth, commentController.getComments);
router.post('/:id/comments', requireAuth, commentValidation, validate, commentController.createComment);

module.exports = router;
