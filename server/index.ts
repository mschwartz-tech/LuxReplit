import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { logError, logInfo } from "./services/logger";
import { registerRoutes } from "./routes";
import { ensureDatabaseInitialized, pool } from "./db";
import { setupVite } from "./vite";
import { rateLimiter, securityHeaders } from "./middleware";
import { apiLimiter, authenticatedLimiter, getRouteLimiter } from "./middleware/rate-limit";
import { cacheMiddleware } from "./middleware/cache";
import { errorHandler } from "./middleware/error";
import { startupManager } from "./services/startup-manager";
import cors from "cors";

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
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Set default content type for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Security middleware
app.use(securityHeaders);

// Route-specific rate limiting - but exclude AI routes from standard limits
app.use('/api', (req, res, next) => {
  // Skip rate limiting for AI endpoints
  if (req.path.includes('/api/exercises/predict')) {
    return next();
  }
  const routeLimiter = getRouteLimiter(req.path);
  routeLimiter(req, res, next);
});

app.use('/api/protected', authenticatedLimiter);
app.use(cacheMiddleware);

// Session middleware setup
app.use(
  session({
    store: new pgSession({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
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
  })
);

// Initialize the server
async function startServer() {
  try {
    // Initialize database
    await ensureDatabaseInitialized();

    // Register routes and get the HTTP server
    const server = await registerRoutes(app);

    // Setup Vite in development
    if (process.env.NODE_ENV !== "production" && process.env.DISABLE_VITE !== 'true') {
      await setupVite(app, server);
    }

    // Global error handler - must be after routes
    app.use(errorHandler);

    // Start listening
    const port = Number(process.env.PORT) || 5000;
    server.listen(port, '0.0.0.0', () => {
      logInfo(`Server listening on port ${port}`, {
        port,
        env: process.env.NODE_ENV || 'development'
      });
    });

    // Handle server errors
    server.on("error", (error: Error) => {
      logError("Server error occurred", {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logInfo("Received SIGTERM signal, initiating graceful shutdown");
      if (server) {
        server.close(async () => {
          try {
            // Run cleanup handlers
            for (const phase of ['vite', 'routes', 'database'] as const) {
              if (startupManager.isPhaseComplete(phase)) {
                await Promise.all((startupManager as any).cleanupHandlers.get(phase)?.map((h: () => Promise<void>) => h()) || []);
              }
            }
            logInfo("Server closed successfully");
          } catch (error) {
            logError("Error during cleanup", {
              error: error instanceof Error ? error.message : String(error)
            });
          } finally {
            process.exit(0);
          }
        });
      } else {
        process.exit(0);
      }
    });
    return server;
  } catch (error) {
    logError("Failed to start server", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Start the server
startServer().catch((error) => {
  logError("Unhandled error during server startup:", error);
  process.exit(1);
});

export default app;