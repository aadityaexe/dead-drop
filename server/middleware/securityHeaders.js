const helmet = require('helmet');

/**
 * Security headers middleware powered by helmet.
 * 
 * Helmet sets 15+ HTTP response headers including:
 *   - Strict-Transport-Security (HSTS)
 *   - Content-Security-Policy (CSP)
 *   - X-Frame-Options
 *   - X-Content-Type-Options
 *   - Referrer-Policy
 *   - Cross-Origin-Opener-Policy
 *   - Cross-Origin-Resource-Policy
 *   - Origin-Agent-Cluster
 *   - X-DNS-Prefetch-Control
 *   - X-Download-Options
 *   - X-Permitted-Cross-Domain-Policies
 *   - Permissions-Policy
 */
const securityHeaders = helmet({
  // Enforce HTTPS for 2 years
  strictTransportSecurity: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true,
  },

  // Strict Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],                          // No unsafe-inline
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },

  // Prevent clickjacking
  frameguard: { action: 'deny' },

  // Prevent MIME-type sniffing
  noSniff: true,

  // Disable referrer for privacy
  referrerPolicy: { policy: 'no-referrer' },

  // Restrict browser features
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // Isolate browsing context for side-channel attack protection
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
});

module.exports = securityHeaders;
