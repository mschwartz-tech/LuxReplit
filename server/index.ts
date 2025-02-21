import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { logError, logInfo } from "./services/logger";
import { registerRoutes } from "./routes";
import { ensureDatabaseInitialized } from "./db";
import { setupVite } from "./vite";
import { apiLimiter } from "./middleware/rate-limit";
import { cacheMiddleware } from "./middleware/cache";

const app = express();
const pgSession = connectPgSimple(session);

// Enable trust proxy - needed for rate limiting behind a proxy
app.set('trust proxy', 1);

// Basic middleware setup
app.use(express.json());
app.use(apiLimiter);
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
    const port = Number(process.env.PORT) || 3000;
    server.listen(port, () => {
      logInfo(`Server listening on port ${port}`, {
        port,
        env: process.env.NODE_ENV || 'development',
        time: new Date().toISOString()
      });
      console.log(`Server is running on port ${port}`);
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