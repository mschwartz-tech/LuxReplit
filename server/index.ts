import express, { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupVite, serveStatic } from "./vite";
import { logInfo, logError } from "./services/logger";
import { registerRoutes } from "./routes";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Define __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ValidationError extends Error {
  constructor(public details: any[]) {
    super('Validation Error');
    this.name = 'ValidationError';
  }
}

class AuthorizationError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

const app = express();

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Vite HMR
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss:", // Required for WebSocket connections
  ].join('; '));

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api") || req.path === "/health") {
      const duration = Date.now() - start;
      const logData = {
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get("user-agent"),
        ip: req.ip,
        userId: (req.user as any)?.id
      };

      if (res.statusCode >= 400) {
        logError(`${req.method} ${req.path} failed with status ${res.statusCode}`, logData);
      } else {
        logInfo(`${req.method} ${req.path} completed`, logData);
      }
    }
  });
  next();
});

// Global error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const errorResponse = {
    message: err.message || "Internal Server Error",
    status: err.status || err.statusCode || 500,
    details: undefined as any
  };

  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    errorResponse.status = 400;
    errorResponse.message = "Validation Error";
    errorResponse.details = validationError.details;
  } else if (err instanceof ValidationError) {
    errorResponse.status = 400;
    errorResponse.details = err.details;
  } else if (err instanceof AuthorizationError) {
    errorResponse.status = 403;
  }

  logError(err.message || "Internal Server Error", {
    path: req.path,
    method: req.method,
    userId: (req.user as any)?.id,
    statusCode: errorResponse.status,
    details: errorResponse.details,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined
  });

  res.status(errorResponse.status).json(errorResponse);
});

(async () => {
  try {
    logInfo("Starting server initialization", {
      nodeEnv: process.env.NODE_ENV,
      processId: process.pid
    });

    // Register API routes first
    const server = await registerRoutes(app);
    logInfo("Routes registered successfully", {
      processId: process.pid
    });

    // Set up Vite middleware for development
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, { root: join(__dirname, '../client') });
    }

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      app.use(serveStatic(join(__dirname, '../client/dist')));
    }

    // Handle SPA routing - must be after static files
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(join(__dirname, '../client/dist/index.html'));
    });

    const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    logInfo(`Attempting to start server on port ${port}`, {
      port,
      env: process.env.NODE_ENV,
      host: '0.0.0.0'
    });

    server.listen(port, '0.0.0.0', () => {
      logInfo(`Server started successfully on port ${port}`, {
        env: process.env.NODE_ENV,
        port,
      });
    });

  } catch (error) {
    logError("Failed to initialize server", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
})();

process.on("uncaughtException", (error) => {
  logError("Uncaught Exception", { error });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logError("Unhandled Rejection", { reason });
  process.exit(1);
});