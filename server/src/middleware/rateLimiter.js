const { RateLimiterMemory } = require('rate-limiter-flexible');

const otpLimiter = new RateLimiterMemory({
    points: 100,
    duration: 60 
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
