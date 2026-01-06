const express = require('express');
const router = express.Router();
const { googleAuth, sendOtp, verifyOtp, registerDetails, logout, refreshToken, getMe, getUserByUsername } = require('../controllers/auth.controller');
const { getAvatarUploadUrl, saveAvatar } = require('../controllers/avatars.controller');
const { protect } = require('../middleware/authMiddleware');
const { csrfProtection } = require('../middleware/csrfMiddleware');
const rateLimiterMiddleware = require('../middleware/rateLimiter');

// Public
router.post('/google', googleAuth);
router.post('/send-otp', rateLimiterMiddleware, sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/refresh', refreshToken); // New endpoint for rotation
router.get('/users/:username', getUserByUsername);

// Protected
router.post('/register-details', protect, csrfProtection, registerDetails);
router.post('/logout', logout); // Logout does not need CSRF strictly if it just clears cookies, but good practice.
router.get('/me', protect, getMe);

router.get("/avatar/upload-url", protect, getAvatarUploadUrl);
router.post("/avatar/save", protect, saveAvatar);


module.exports = router;
