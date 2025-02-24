import rateLimit from 'express-rate-limit';

// Special rate limiter for AI endpoints
export const aiEndpointLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { message: 'Too many AI prediction requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many AI prediction requests, please try again later' });
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/health'), // Skip health check endpoints
});

// Stricter limits for user management endpoints
export const userManagementLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 requests per hour
  message: 'Too many user management requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limits for public endpoints
export const publicEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 45, // 45 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for authenticated users (more permissive)
export const authenticatedLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // More permissive limits for admin users
    if (req.user?.role === 'admin') return 300;
    // Standard limit for authenticated users
    return 150;
  },
  message: 'Rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.isAuthenticated(), // Only apply to authenticated users
});

export const loginLimiter = authLimiter;

// Export a function to get the appropriate limiter based on the route
export const getRouteLimiter = (route: string) => {
  if (route.startsWith('/api/exercises/predict')) return aiEndpointLimiter;
  if (route.startsWith('/api/auth')) return authLimiter;
  if (route.startsWith('/api/users')) return userManagementLimiter;
  if (route.startsWith('/api/public')) return publicEndpointLimiter;
  // Default to API limiter
  return apiLimiter;
};