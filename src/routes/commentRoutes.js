const express = require('express');
const commentController = require('../controllers/commentController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.delete('/:id', requireAuth, commentController.deleteComment);
router.post('/:id/like', requireAuth, commentController.likeComment);
router.delete('/:id/like', requireAuth, commentController.unlikeComment);

module.exports = router;
