import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { logError, logInfo } from "./services/logger";
import { registerRoutes } from "./routes";
import { ensureDatabaseInitialized } from "./db";
import { setupVite } from "./vite";
import { securityHeaders } from "./middleware";
import { apiLimiter, authenticatedLimiter, getRouteLimiter } from "./middleware/rate-limit";
import { cacheMiddleware } from "./middleware/cache";
import { errorHandler } from "./middleware/error";
import { startupManager } from "./services/startup-manager";
import cors from "cors";
import { setupAuth } from "./auth";

try {
  logInfo("Starting server initialization");
  const app = express();
  const pgSession = connectPgSimple(session);

  // Enable trust proxy - needed for rate limiting behind a proxy
  app.set('trust proxy', 1);

  // Basic middleware setup
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        logError('Invalid JSON payload received', { error: e });
        res.status(400).json({ message: 'Invalid JSON payload' });
        throw new Error('Invalid JSON');
      }
    }
  }));

  // CORS configuration
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Route']
  }));

  // API route handler - must be before Vite middleware
  app.use('/api', (req, res, next) => {
    // Always set JSON response type for API routes
    res.type('application/json');
    // Add custom header to identify API routes
    res.setHeader('X-Custom-Route', 'api');
    next();
  });

  // Session middleware setup
  app.use(
    session({
      store: new pgSession({
        conObject: {
          connectionString: process.env.DATABASE_URL,
        },
        createTableIfMissing: true,
        errorLog: (err) => logError('Session store error:', err)
      }),
      secret: process.env.SESSION_SECRET || "dev_secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      },
      name: 'sid'
    })
  );

  // Setup authentication after session middleware
  setupAuth(app);

  const startServer = async () => {
    try {
      logInfo("Initializing database");
      await ensureDatabaseInitialized();

      logInfo("Registering API routes");
      const server = await registerRoutes(app);

      // Apply security headers for non-API routes
      app.use((req, res, next) => {
        if (!req.path.startsWith('/api')) {
          securityHeaders(req, res, next);
        } else {
          next();
        }
      });

      // Handle Vite middleware last, after all API routes
      if (process.env.NODE_ENV !== "production" && process.env.DISABLE_VITE !== 'true') {
        logInfo("Setting up Vite development server");
        // Custom middleware to ensure API routes don't reach Vite
        app.use((req, res, next) => {
          // Check both path and custom header
          if (req.path.startsWith('/api') || req.headers['x-custom-route'] === 'api') {
            return next('route');
          }
          next();
        });

        await setupVite(app, server);
      }

      // Error handler should be last
      app.use(errorHandler);

      const port = Number(process.env.PORT) || 5000;
      server.listen(port, '0.0.0.0', () => {
        logInfo(`Server listening on port ${port}`, {
          port,
          env: process.env.NODE_ENV || 'development',
          viteEnabled: process.env.NODE_ENV !== "production" && process.env.DISABLE_VITE !== 'true'
        });
      });

      return server;
    } catch (error) {
      logError("Failed to start server", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        phase: "server_startup"
      });
      throw error;
    }
  };

  startServer().catch((error) => {
    logError("Unhandled error during server startup:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      phase: "unhandled_startup_error"
    });
    process.exit(1);
  });

} catch (error) {
  logError("Critical error during initial server setup:", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    phase: "initial_setup"
  });
  process.exit(1);
}

export default app;