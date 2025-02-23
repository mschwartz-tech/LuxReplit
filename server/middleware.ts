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

// WAF configuration
const wafConfig = {
  suspiciousPatterns: [
    /\.\./,
    /(\%27)|(')/i,
    /<script>/i,
    /union\s+select/i,
    /(exec|system|eval)\(/i,
    /(base64_decode|eval|system|exec|passthru|shell_exec|phpinfo|chmod|mkdir|fopen|fclose|readfile)\(/i,
    /(onload|onerror|onmouseover|onclick|onmouseout|ondblclick)=/i,
    /(document\.cookie|document\.write|\.parentNode|\.innerHTML)/i,
    /<(iframe|object|embed|applet)/i,
    /javascript:/i,
    /vbscript:/i,
    /data:/i,
  ],
  suspiciousAgents: [
    'sqlmap', 'havij', 'acunetix', 'nikto', 'arachni', 'metasploit',
    'w3af', 'nessus', 'nmap', 'dirbuster', 'wget', 'curl', 'python-requests',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxRequestSize: 1024 * 1024 // 1MB
};

// WAF middleware
export const wafMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestUrl = req.url.toLowerCase();
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  const requestBody = req.body;
  const requestMethod = req.method;

  // Skip WAF for logout
  if (requestUrl.includes('/api/auth/logout')) return next();

  // URL pattern check
  if (wafConfig.suspiciousPatterns.some(pattern => pattern.test(requestUrl))) {
    logError('Suspicious request pattern detected', { feature: 'WAF', category: 'security', requestUrl });
    return res.status(403).json({ error: 'Forbidden request pattern detected' });
  }

  // User agent check
  if (wafConfig.suspiciousAgents.some(agent => userAgent.includes(agent))) {
    logError('Suspicious user agent detected', { feature: 'WAF', category: 'security', agent: userAgent });
    return res.status(403).json({ error: 'Forbidden user agent' });
  }

  // Method validation
  if (!wafConfig.allowedMethods.includes(requestMethod)) {
    logError('Invalid request method', { feature: 'WAF', category: 'security', requestMethod });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Request body validation
  if (requestBody && Object.keys(requestBody).length > 0) {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > wafConfig.maxRequestSize) {
      logError('Request entity too large', { feature: 'WAF', category: 'security', contentLength });
      return res.status(413).json({ error: 'Request entity too large' });
    }

    const contentType = req.headers['content-type'];
    if (!contentType?.includes('application/json')) {
      logError('Invalid content type', { feature: 'WAF', category: 'security', type: contentType });
      return res.status(415).json({ error: 'Unsupported Media Type' });
    }
  }

  next();
};