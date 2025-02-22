import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from "express";
import { logError } from "./services/logger";

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
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  res.setHeader('Content-Security-Policy', `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data:;
    connect-src 'self' *;
    worker-src 'self' blob:;
    frame-ancestors 'self';
    form-action 'self';
  `.replace(/\s+/g, ' ').trim());

  next();
};

// Enhanced WAF middleware
export const wafMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestUrl = req.url.toLowerCase();
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  const requestBody = req.body;
  const requestMethod = req.method;

  // Skip WAF checks for logout requests
  if (requestUrl.includes('/api/auth/logout')) {
    return next();
  }

  // Block suspicious URL patterns
  const suspiciousPatterns = [
    /\.\./,             // Directory traversal
    /(\%27)|(')/i,     // SQL injection attempts
    /<script>/i,        // XSS attempts
    /union\s+select/i,  // SQL injection
    /(exec|system|eval)\(/i,  // Command injection
    /(base64_decode|eval|system|exec|passthru|shell_exec|phpinfo|chmod|mkdir|fopen|fclose|readfile)\(/i,  // PHP injection
    /(onload|onerror|onmouseover|onclick|onmouseout|ondblclick)=/i,  // JavaScript event handlers
    /(document\.cookie|document\.write|\.parentNode|\.innerHTML)/i,  // DOM manipulation
    /<(iframe|object|embed|applet)/i,  // Dangerous HTML tags
    /javascript:/i,     // JavaScript protocol
    /vbscript:/i,      // VBScript protocol
    /data:/i,          // Data protocol
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(requestUrl))) {
    logError('Suspicious request pattern detected', { url: requestUrl });
    return res.status(403).json({ error: 'Forbidden request pattern detected' });
  }

  // Block suspicious user agents
  const suspiciousAgents = [
    'sqlmap',
    'havij',
    'acunetix',
    'nikto',
    'arachni',
    'metasploit',
    'w3af',
    'nessus',
    'nmap',
    'dirbuster',
    'wget',
    'curl',
    'python-requests',
  ];

  if (suspiciousAgents.some(agent => userAgent.includes(agent))) {
    logError('Suspicious user agent detected', { userAgent });
    return res.status(403).json({ error: 'Forbidden user agent' });
  }

  // Request method validation
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
  if (!allowedMethods.includes(requestMethod)) {
    logError('Invalid request method', { method: requestMethod });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Skip content validation for requests without body
  if (!requestBody || Object.keys(requestBody).length === 0) {
    return next();
  }

  // Request body size validation
  const maxSize = 1024 * 1024; // 1MB
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > maxSize) {
    logError('Request entity too large', { size: contentLength });
    return res.status(413).json({ error: 'Request entity too large' });
  }

  // Content-Type validation only for requests with body
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    logError('Invalid content type', { contentType });
    return res.status(415).json({ error: 'Unsupported Media Type' });
  }

  next();
};