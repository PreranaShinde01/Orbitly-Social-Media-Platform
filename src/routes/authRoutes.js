const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
});

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username may only contain letters, numbers, and underscores.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password.');
      }
      return true;
    }),
  body('display_name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name cannot exceed 50 characters.')
];

const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required.'),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long.'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New password confirmation does not match.');
      }
      return true;
    })
];

router.post('/register', authLimiter, registerValidation, validate, authController.register);
router.post('/login', authLimiter, loginValidation, validate, authController.login);
router.post('/logout', authController.logout);
router.post('/change-password', requireAuth, changePasswordValidation, validate, authController.changePassword);
router.get('/me', authController.getMe);

module.exports = router;
