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

  // CORS headers - more permissive for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  next();
};

// Enhanced WAF middleware
export const wafMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestUrl = req.url.toLowerCase();
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  const requestBody = req.body;
  const requestMethod = req.method;

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
    return res.status(403).json({ error: 'Forbidden user agent' });
  }

  // Request method validation
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
  if (!allowedMethods.includes(requestMethod)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Request body size validation for POST/PUT requests
  if (['POST', 'PUT'].includes(requestMethod) && requestBody) {
    const maxSize = 1024 * 1024; // 1MB
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > maxSize) {
      return res.status(413).json({ error: 'Request entity too large' });
    }
  }

  // Content-Type validation for POST/PUT requests
  if (['POST', 'PUT'].includes(requestMethod)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({ error: 'Unsupported Media Type' });
    }
  }

  // Rate limiting by IP (additional to global rate limiting)
  const clientIp = req.ip;
  const requestKey = `${clientIp}:${requestMethod}:${requestUrl}`;
  const maxRequestsPerMinute = 60;

  // Simple in-memory request tracking (in production, use Redis)
  if (global.requestCounts === undefined) {
    global.requestCounts = new Map();
  }

  const now = Date.now();
  const requestCount = global.requestCounts.get(requestKey) || { count: 0, timestamp: now };

  if (now - requestCount.timestamp > 60000) {
    // Reset if more than a minute has passed
    requestCount.count = 1;
    requestCount.timestamp = now;
  } else {
    requestCount.count++;
  }

  global.requestCounts.set(requestKey, requestCount);

  if (requestCount.count > maxRequestsPerMinute) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  next();
};