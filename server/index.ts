import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { logError, logInfo } from "./services/logger";
import { registerRoutes } from "./routes";
import { ensureDatabaseInitialized, pool } from "./db";
import { setupVite } from "./vite";
import { securityHeaders } from "./middleware";
import { apiLimiter, authenticatedLimiter, getRouteLimiter } from "./middleware/rate-limit";
import { cacheMiddleware } from "./middleware/cache";
import { errorHandler } from "./middleware/error";
import { startupManager } from "./services/startup-manager";
import cors from "cors";
import { setupAuth } from "./auth";

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

// Set JSON content type for all API routes early in the middleware chain
app.use('/api', (req, res, next) => {
  res.type('application/json');
  next();
});

// Apply security headers middleware after content type is set
app.use(securityHeaders);

// Session middleware setup with improved error handling
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

// API routes should be excluded from standard rate limiting
app.use('/api', (req, res, next) => {
  // Skip rate limiting for OpenAI routes
  if (req.path.includes('/api/exercises/analyze')) {
    return next();
  }
  const routeLimiter = getRouteLimiter(req.path);
  routeLimiter(req, res, next);
});

// Error handler should be last
app.use(errorHandler);

// Initialize the server
async function startServer() {
  try {
    await ensureDatabaseInitialized();
    const server = await registerRoutes(app);

    if (process.env.NODE_ENV !== "production" && process.env.DISABLE_VITE !== 'true') {
      await setupVite(app, server);
    }

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

    return server;
  } catch (error) {
    logError("Failed to start server", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

startServer().catch((error) => {
  logError("Unhandled error during server startup:", error);
  process.exit(1);
});

export default app;