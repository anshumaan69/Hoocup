const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Assuming User model is located here

const protect = async (req, res, next) => {
    let token;
    
    if (req.cookies.access_token) {
        token = req.cookies.access_token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        
        if (!req.user) {
             return res.status(401).json({ message: 'User not found' });
        }

        // Check Status
        if (req.user.status === 'suspended') {
            return res.status(403).json({ message: 'Your account has been suspended by admin until further notice' });
        }

        if (req.user.status === 'banned') {
            if (req.user.banExpiresAt && req.user.banExpiresAt > new Date()) {
                const daysLeft = Math.ceil((req.user.banExpiresAt - new Date()) / (1000 * 60 * 60 * 24));
                return res.status(403).json({ message: `You have been banned for next ${daysLeft} days` });
            } else {
                // Ban expired, auto-activate (optional, or just allow login)
                // Let's auto-activate for better UX
                req.user.status = 'active';
                req.user.banExpiresAt = undefined;
                await req.user.save();
            }
        }

        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `User role ${req.user.role} is not authorized to access this route` 
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
