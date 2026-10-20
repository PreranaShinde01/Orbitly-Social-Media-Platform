const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload } = require('../config/multer');

const router = express.Router();

const profileUpload = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

const updateProfileValidation = [
  body('display_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Display name must be between 1 and 50 characters.'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 280 })
    .withMessage('Bio cannot exceed 280 characters.'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('Location cannot exceed 60 characters.'),
  body('website')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Website URL cannot exceed 120 characters.')
];

// Specific non-param routes first
router.get('/suggestions', requireAuth, userController.getSuggestions);
router.put('/me', requireAuth, profileUpload, updateProfileValidation, validate, userController.updateProfile);

// Dynamic username routes
router.get('/:username', optionalAuth, userController.getProfile);
router.get('/:username/posts', optionalAuth, userController.getUserPosts);
router.get('/:username/liked', optionalAuth, userController.getUserLikedPosts);
router.get('/:username/followers', optionalAuth, userController.getFollowers);
router.get('/:username/following', optionalAuth, userController.getFollowing);
router.post('/:username/follow', requireAuth, userController.followUser);
router.delete('/:username/follow', requireAuth, userController.unfollowUser);

module.exports = router;
