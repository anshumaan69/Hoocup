const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
    let token;

    if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id: ... }
        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
