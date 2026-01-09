const crypto = require('crypto');

/**
 * CSRF Protection Middleware
 * Implements Double-Submit Cookie Pattern
 */
exports.csrfProtection = (req, res, next) => {
    // 1. Check if we need to set a CSRF token (if missing)
    let csrfToken = req.cookies['csrf_token'];
    
    if (!csrfToken) {
        csrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie('csrf_token', csrfToken, {
            httpOnly: false, // Client needs to read this to send in header
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
        });
    }

    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // 3. Validate Token for UNSAFE methods (POST, PUT, DELETE, PATCH)
    const clientToken = req.headers['x-csrf-token'];

    if (!clientToken || clientToken !== csrfToken) {
        return res.status(403).json({ message: 'CSRF Token Mismatch' });
    }

    next();
};
