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

async function initializeDatabase() {
  try {
    logInfo("Starting database initialization", { phase: "db_init_start" });
    await ensureDatabaseInitialized();
    logInfo("Database initialization completed successfully", { phase: "db_init_complete" });
  } catch (error) {
    logError("Database initialization failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      phase: "db_init_error",
      context: {
        dbUrl: process.env.DATABASE_URL ? 'present' : 'missing'
      }
    });
    throw error;
  }
}

async function initializeServer(app: express.Express) {
  try {
    logInfo("Starting API routes registration", { phase: "routes_init_start" });
    const server = await registerRoutes(app);
    logInfo("API routes registration completed", { phase: "routes_init_complete" });

    logInfo("Setting up security headers", { phase: "security_setup_start" });
    app.use((req, res, next) => {
      if (!req.path.startsWith('/api')) {
        securityHeaders(req, res, next);
      } else {
        next();
      }
    });
    logInfo("Security headers setup completed", { phase: "security_setup_complete" });

    if (process.env.NODE_ENV !== "production" && process.env.DISABLE_VITE !== 'true') {
      logInfo("Starting Vite setup", { phase: "vite_setup_start" });
      try {
        await setupVite(app, server);
        logInfo("Vite setup completed successfully", { phase: "vite_setup_complete" });
      } catch (viteError) {
        logError("Vite setup failed", {
          error: viteError instanceof Error ? viteError.message : String(viteError),
          stack: viteError instanceof Error ? viteError.stack : undefined,
          phase: "vite_setup_error"
        });
        throw viteError;
      }
    }

    app.use(errorHandler);
    return server;
  } catch (error) {
    logError("Server initialization failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      phase: "server_init_error"
    });
    throw error;
  }
}

async function startApplication() {
  try {
    logInfo("Starting application initialization", { phase: "app_init_start" });
    const app = express();

    logInfo("Setting up session store", { phase: "session_setup_start" });
    const pgSession = connectPgSimple(session);
    app.set('trust proxy', 1);

    app.use(express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        try {
          JSON.parse(buf.toString());
        } catch (e) {
          logError('Invalid JSON payload received', { 
            error: e,
            body: buf.toString().substring(0, 200),
            phase: "json_parse_error"
          });
          res.status(400).json({ message: 'Invalid JSON payload' });
          throw new Error('Invalid JSON');
        }
      }
    }));

    logInfo("Setting up CORS", { phase: "cors_setup_start" });
    app.use(cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Route']
    }));
    logInfo("CORS setup completed", { phase: "cors_setup_complete" });

    app.use('/api', (req, res, next) => {
      res.type('application/json');
      res.setHeader('X-Custom-Route', 'api');
      next();
    });

    logInfo("Setting up session middleware", { phase: "session_middleware_start" });
    app.use(
      session({
        store: new pgSession({
          conObject: {
            connectionString: process.env.DATABASE_URL,
          },
          createTableIfMissing: true,
          errorLog: (err) => logError('Session store error:', { 
            error: err,
            phase: "session_store_error"
          })
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
    logInfo("Session middleware setup completed", { phase: "session_middleware_complete" });

    logInfo("Setting up authentication", { phase: "auth_setup_start" });
    setupAuth(app);
    logInfo("Authentication setup completed", { phase: "auth_setup_complete" });

    await initializeDatabase();
    const server = await initializeServer(app);

    const port = Number(process.env.PORT) || 5000;
    logInfo("Starting server listen", { 
      phase: "server_listen_start",
      port: port
    });

    server.listen(port, '0.0.0.0', () => {
      logInfo(`Server listening on port ${port}`, {
        port,
        env: process.env.NODE_ENV || 'development',
        viteEnabled: process.env.NODE_ENV !== "production" && process.env.DISABLE_VITE !== 'true',
        phase: "server_listen_complete"
      });
    });

    return server;
  } catch (error) {
    logError("Critical application startup error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      phase: "application_startup_error",
      context: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        hasDbUrl: !!process.env.DATABASE_URL
      }
    });
    throw error;
  }
}

startApplication().catch((error) => {
  logError("Unhandled error during startup:", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    phase: "unhandled_startup_error"
  });
  process.exit(1);
});

export const app = express();