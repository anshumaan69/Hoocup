const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
    // 1. Strict Cookie Check (Access Token)
    const token = req.cookies.access_token;

    if (!token) {
        // Frontend should catch 401 and try /refresh
        return res.status(401).json({ message: 'No access token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id: ... }
        next();
    } catch (error) {
        // Token expired or invalid
        return res.status(401).json({ message: 'Token invalid or expired' });
    }
};
