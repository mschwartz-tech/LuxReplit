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

// Security middleware
app.use(rateLimiter);
app.use(securityHeaders);

// Route-specific rate limiting
app.use('/api', (req, res, next) => {
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

// Global error handler
app.use(errorHandler);

let server: any;

async function startServer() {
  try {
    // Initialize database with retry mechanism
    await startupManager.initPhase('database', async () => {
      await ensureDatabaseInitialized();
    });

    // Register cleanup for database
    startupManager.registerCleanup('database', async () => {
      await pool.end();
    });

    // Register routes with retry mechanism
    await startupManager.initPhase('routes', async () => {
      server = await registerRoutes(app);
    });

    // Setup Vite in development (non-critical)
    if (process.env.NODE_ENV !== "production" && process.env.DISABLE_VITE !== 'true') {
      await startupManager.initPhase('vite', async () => {
        await setupVite(app, server);
      });
    }

    // Start listening only after critical phases are complete
    const port = Number(process.env.PORT) || 5000;
    server.listen(port, '0.0.0.0', () => {
      logInfo(`Server listening on port ${port}`, {
        port,
        env: process.env.NODE_ENV || 'development',
        startupPhases: startupManager.getStartupSummary()
      });
    });

    // Handle server errors
    server.on("error", (error: Error) => {
      logError("Server error occurred", { 
        error: error.message,
        stack: error.stack,
        startupPhases: startupManager.getStartupSummary()
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

  } catch (error) {
    logError("Failed to start server", { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      startupPhases: startupManager.getStartupSummary()
    });
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error("Unhandled error during server startup:", error);
  process.exit(1);
});