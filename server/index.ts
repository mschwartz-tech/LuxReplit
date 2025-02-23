import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { logError, logInfo } from "./services/logger";
import { registerRoutes } from "./routes";
import { ensureDatabaseInitialized } from "./db";
import { setupVite } from "./vite";
import { rateLimiter, securityHeaders, wafMiddleware } from "./middleware";
import { apiLimiter, authenticatedLimiter, getRouteLimiter } from "./middleware/rate-limit";
import { cacheMiddleware } from "./middleware/cache";
import { errorHandler } from "./middleware/error";
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
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security middleware
app.use(rateLimiter);  // Global rate limiting
app.use(securityHeaders);  // Security headers (CSP, CORS, etc.)
app.use(wafMiddleware);  // Web Application Firewall

// Route-specific rate limiting
app.use('/api', (req, res, next) => {
  const routeLimiter = getRouteLimiter(req.path);
  routeLimiter(req, res, next);
});

// Apply authenticated rate limiting to protected routes
app.use('/api/protected', authenticatedLimiter);

// Caching middleware
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
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Global error handler
app.use(errorHandler);

async function startServer() {
  try {
    // Initialize database
    logInfo("Initializing database connection...");
    await ensureDatabaseInitialized();
    logInfo("Database connection established successfully");

    // Register routes and get HTTP server
    logInfo("Registering routes...");
    let server;
    try {
      server = await registerRoutes(app);
      logInfo("Routes registered successfully");
    } catch (routeError) {
      logError("Failed to register routes", { 
        error: routeError,
        stack: routeError instanceof Error ? routeError.stack : undefined,
        message: routeError instanceof Error ? routeError.message : String(routeError)
      });
      throw routeError;
    }

    // Setup Vite in development
    if (process.env.NODE_ENV !== "production") {
      logInfo("Setting up Vite development server...");
      try {
        await setupVite(app, server);
        logInfo("Vite development server setup complete");
      } catch (viteError) {
        logError("Failed to setup Vite", { 
          error: viteError,
          stack: viteError instanceof Error ? viteError.stack : undefined 
        });
        throw viteError;
      }
    }

    // Start the server
    const port = Number(process.env.PORT) || 5000;
    server.listen(port, '0.0.0.0', () => {
      logInfo(`Server listening on port ${port}`, {
        port,
        env: process.env.NODE_ENV || 'development',
        time: new Date().toISOString(),
        address: '0.0.0.0'
      });
      console.log(`Server is running at http://0.0.0.0:${port}`);
    });

    // Handle server errors
    server.on("error", (error) => {
      logError("Server error occurred", { 
        error,
        stack: error instanceof Error ? error.stack : undefined 
      });
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logInfo("Received SIGTERM signal, initiating graceful shutdown");
      server.close(() => {
        logInfo("Server closed successfully");
        process.exit(0);
      });
    });

  } catch (error) {
    logError("Failed to start server", { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error("Unhandled error during server startup:", error);
  process.exit(1);
});