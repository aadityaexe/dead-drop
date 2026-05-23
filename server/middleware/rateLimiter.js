const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter.
 * Applied to all /api routes.
 * 100 requests per 15 minutes per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window per IP
  standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,      // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too many requests. Try again later.',
  },
});

/**
 * Stricter rate limiter for the drop read endpoint.
 * Slows brute-force attempts on password-protected drops.
 * 20 requests per 15 minutes per IP.
 */
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 read attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many read attempts. Try again later.',
  },
});

module.exports = { apiLimiter, readLimiter };
