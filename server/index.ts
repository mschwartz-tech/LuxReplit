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

// Initialize server
(async () => {
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      logError("Validation Error", {
        path: req.path,
        method: req.method,
        errors: validationError.details,
      });
      return res.status(400).json({
        message: "Validation Error",
        errors: validationError.details,
      });
    }

    // Log the error with additional context
    logError(err, {
      path: req.path,
      method: req.method,
      userId: (req.user as any)?.id,
      body: req.body,
      query: req.query,
      statusCode: status,
    });

    // Send error response
    res.status(status).json({ 
      message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
  });

  // Setup Vite or static serving based on environment
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const PORT = process.env.PORT || 3000;
  const MAX_RETRIES = 3;
  let currentRetry = 0;

  const startServer = () => {
    server.listen(PORT, "0.0.0.0", () => {
      logInfo(`Server started on port ${PORT}`, {
        env: process.env.NODE_ENV,
        port: PORT,
      });
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
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