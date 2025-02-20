import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { logInfo, logError } from "./services/logger";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture JSON responses for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log API requests on completion
  res.on("finish", () => {
    if (path.startsWith("/api")) {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;
      const method = req.method;

      const logData = {
        path,
        method,
        statusCode,
        duration,
        userAgent: req.get("user-agent"),
        ip: req.ip,
        userId: (req.user as any)?.id,
        response: capturedJsonResponse,
      };

      if (statusCode >= 400) {
        logError(`${method} ${path} failed with status ${statusCode}`, logData);
      } else {
        logInfo(`${method} ${path} completed`, logData);
      }
    }
  });

  next();
});

// Custom error types
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

// Global error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const errorResponse: any = {
    message: err.message || "Internal Server Error",
    status: err.status || err.statusCode || 500,
  };

  // Handle specific error types
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

  // Log error with context
  logError(err.message || "Internal Server Error", {
    path: req.path,
    method: req.method,
    userId: (req.user as any)?.id,
    statusCode: errorResponse.status,
    details: errorResponse.details,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined
  });

  // Send error response
  res.status(errorResponse.status).json({
    message: errorResponse.message,
    details: errorResponse.details,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

// Initialize server
(async () => {
  const server = await registerRoutes(app);

  // Setup Vite or static serving based on environment
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const PORT = process.env.PORT || 5000;
  const HOST = '0.0.0.0';
  const MAX_RETRIES = 3;
  let currentRetry = 0;

  const startServer = () => {
    server.listen(Number(PORT), HOST, () => {
      logInfo(`Server started on port ${PORT}`, {
        env: process.env.NODE_ENV,
        port: PORT,
      });
    }).on('error', (err: Error) => {
      if ((err as any).code === 'EADDRINUSE') {
        if (currentRetry < MAX_RETRIES) {
          currentRetry++;
          logError(`Port ${PORT} is in use, attempting to reconnect... (${currentRetry}/${MAX_RETRIES})`);
          setTimeout(startServer, 1000);
        } else {
          logError(`Failed to start server after ${MAX_RETRIES} retries`);
          process.exit(1);
        }
      } else {
        logError('Server error', { error: err });
        throw err;
      }
    });
  };

  startServer();
})();

// Handle uncaught exceptions and rejections
process.on("uncaughtException", (error) => {
  logError("Uncaught Exception", { error });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logError("Unhandled Rejection", { reason });
  process.exit(1);
});