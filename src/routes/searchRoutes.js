const express = require('express');
const searchController = require('../controllers/searchController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, searchController.search);

module.exports = router;
