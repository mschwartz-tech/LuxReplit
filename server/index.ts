import express, { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupVite, serveStatic } from "./vite";
import { logInfo, logError } from "./services/logger";
import { registerRoutes } from "./routes";

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

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
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

// Error handler
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

// Initialize server
(async () => {
  const server = await registerRoutes(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;
  const HOST = '0.0.0.0';

  server.listen(Number(PORT), HOST, () => {
    logInfo(`Server started on port ${PORT}`, {
      env: process.env.NODE_ENV,
      port: PORT,
    });
  });
})();

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logError("Uncaught Exception", { error });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logError("Unhandled Rejection", { reason });
  process.exit(1);
});