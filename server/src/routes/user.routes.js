const express = require('express');
const router = express.Router();
const { getFeed } = require('../controllers/user.controller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Feed is protected

router.get('/feed', getFeed);

module.exports = router;
