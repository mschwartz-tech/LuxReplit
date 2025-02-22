import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader('Content-Security-Policy', `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data:;
    connect-src 'self' *;
    worker-src 'self' blob:;
  `.replace(/\s+/g, ' ').trim());

  // CORS headers - more permissive for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  next();
};

// Basic WAF middleware
export const wafMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestUrl = req.url.toLowerCase();
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';

  // Block suspicious URL patterns
  const suspiciousPatterns = [
    /\.\./,             // Directory traversal
    /(\%27)|(')/i,     // SQL injection attempts
    /<script>/i,        // XSS attempts
    /union\s+select/i,  // SQL injection
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(requestUrl))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Block suspicious user agents
  const suspiciousAgents = [
    'sqlmap',
    'havij',
    'acunetix',
    'nikto',
  ];

  if (suspiciousAgents.some(agent => userAgent.includes(agent))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
};