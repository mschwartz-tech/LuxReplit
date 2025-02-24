import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from "express";
import { logError } from "./services/logger";

// Rate limiting configuration
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers configuration
const securityHeadersConfig = {
  basic: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },
  csp: `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data:;
    connect-src 'self' *;
    worker-src 'self' blob:;
    frame-ancestors 'self';
    form-action 'self';
  `.replace(/\s+/g, ' ').trim()
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  Object.entries(securityHeadersConfig.basic).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  res.setHeader('Content-Security-Policy', securityHeadersConfig.csp);
  next();
};