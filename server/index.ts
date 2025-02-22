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
import cors from "cors";

const app = express();
const pgSession = connectPgSimple(session);

// Enable trust proxy - needed for rate limiting behind a proxy
app.set('trust proxy', 1);

// Basic middleware setup
app.use(express.json());

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));

// Security middleware but with relaxed settings for development
app.use(rateLimiter);  // Global rate limiting
app.use(securityHeaders);  // Security headers (CSP, CORS, etc.)
app.use(wafMiddleware);  // Web Application Firewall

// Apply route-specific rate limiting
app.use('/api', (req, res, next) => {
  const routeLimiter = getRouteLimiter(req.path);
  routeLimiter(req, res, next);
});

// Apply authenticated rate limiting to protected routes
app.use('/api/protected', authenticatedLimiter);

app.use(cacheMiddleware);  // Caching

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

async function startServer() {
  try {
    // Initialize database
    logInfo("Initializing database connection...");
    await ensureDatabaseInitialized();
    logInfo("Database connection established successfully");

    // Register routes and get HTTP server
    logInfo("Registering routes...");
    const server = await registerRoutes(app);
    logInfo("Routes registered successfully");

    // Setup Vite in development
    if (process.env.NODE_ENV !== "production") {
      logInfo("Setting up Vite development server...");
      await setupVite(app, server);
      logInfo("Vite development server setup complete");
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
      logError("Server error occurred", { error });
      process.exit(1);
    });

  } catch (error) {
    logError("Failed to start server", { error });
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error("Unhandled error during server startup:", error);
  process.exit(1);
});