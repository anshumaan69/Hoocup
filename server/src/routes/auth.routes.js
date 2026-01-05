const express = require('express');
const router = express.Router();
const { googleAuth, sendOtp, verifyOtp, registerDetails, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/authMiddleware'); // Need to create this
const rateLimiterMiddleware = require('../middleware/rateLimiter');

router.post('/google', googleAuth);
router.post('/send-otp', rateLimiterMiddleware, sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register-details', protect, registerDetails);
router.get('/me', protect, (req, res) => {
    // Determine which controller to use or inline it temporarily if getMe isn't exported yet
    // To stay clean, I'll update controller first or rely on hoisting if I use function reference
    // But since I'm editing routes first, I'll update imports.
    const { getMe } = require('../controllers/auth.controller');
    getMe(req, res);
}); 
router.post('/logout', logout);

module.exports = router;
