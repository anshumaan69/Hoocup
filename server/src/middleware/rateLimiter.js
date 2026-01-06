const { RateLimiterMemory } = require('rate-limiter-flexible');

const otpLimiter = new RateLimiterMemory({
    points: 3, // Strict limit: 3 requests
    duration: 24 * 60 * 60 // per 24 hours
});

const rateLimiterMiddleware = async (req, res, next) => {
    const key = req.body.phone || req.ip; 
    try {
        await otpLimiter.consume(key);
        next();
    } catch (rejRes) {
        return res.status(429).json({ message: "Too many requests. Try after 24 hrs" });
    }
};

module.exports = rateLimiterMiddleware;
