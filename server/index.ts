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
  try {
    logInfo("Starting server initialization");

    const server = await registerRoutes(app);
    logInfo("Routes registered successfully");

    if (app.get("env") === "development") {
      logInfo("Setting up Vite for development");
      await setupVite(app, server);
      logInfo("Vite setup completed");
    } else {
      serveStatic(app);
      logInfo("Static serving configured");
    }

    // Try ports starting from 5000
    const findAvailablePort = async (startPort: number): Promise<number> => {
      const tryPort = (port: number): Promise<number> => {
        return new Promise((resolve, reject) => {
          logInfo(`Attempting to bind to port ${port}`);

          const testServer = server.listen(port, '0.0.0.0');

          testServer.once('listening', () => {
            testServer.close(() => {
              logInfo(`Successfully found available port ${port}`);
              resolve(port);
            });
          });

          testServer.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              logInfo(`Port ${port} is in use, trying next port`);
              // Add a small delay before trying the next port
              setTimeout(() => {
                tryPort(port + 1).then(resolve).catch(reject);
              }, 100);
            } else {
              reject(err);
            }
          });
        });
      };

      return tryPort(startPort);
    };

    const port = await findAvailablePort(5000);

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

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logError("Uncaught Exception", { error });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logError("Unhandled Rejection", { reason });
  process.exit(1);
});