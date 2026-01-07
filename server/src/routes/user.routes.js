const express = require('express');
const router = express.Router();
const { getFeed } = require('../controllers/user.controller');
const { getUserByUsername } = require('../controllers/auth.controller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Feed is protected

router.get('/feed', getFeed);
router.get('/:username', getUserByUsername);

module.exports = router;
