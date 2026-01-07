const express = require('express');
const router = express.Router();
const { uploadAvatar } = require('../controllers/avatars.controller');
const upload = require('../config/multer');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
