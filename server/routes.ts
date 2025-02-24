import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { logError, logInfo } from "./services/logger";
import { asyncHandler } from "./middleware/async";
import { errorHandler } from "./middleware/error";
import { Router } from "express";
import mealPlanRoutes from "./routes/meal-plans";
import exerciseRoutes from "./routes/exercises";

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  next();
};

const requireRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !roles.includes((req.user as any)?.role)) {
    logError("Unauthorized access attempt", {
      userId: (req.user as any)?.id,
      role: (req.user as any)?.role,
      requiredRoles: roles
    });
    return res.sendStatus(403);
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create router instances
  const memberRouter = Router();
  const workoutRouter = Router();
  const invoiceRouter = Router();
  const paymentRouter = Router();
  const marketingRouter = Router();
  const scheduleRouter = Router();
  const placeRouter = Router();
  const strengthMetricRouter = Router();

  // Register exercise routes first (already a Router instance)
  app.use('/api', exerciseRoutes);

  // Register other route handlers
  app.use('/api/meal-plans', requireAuth, mealPlanRoutes);
  app.use('/api', memberRouter);
  app.use('/api', workoutRouter);
  app.use('/api', invoiceRouter);
  app.use('/api', paymentRouter);
  app.use('/api', marketingRouter);
  app.use('/api', scheduleRouter);
  app.use('/api', placeRouter);
  app.use('/api', strengthMetricRouter);

  // Health check
  app.get("/health", asyncHandler(async (req: Request, res: Response) => {
    logInfo("Health check requested");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  }));

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          logError("Error destroying session during logout", { error: err });
          return next(err);
        }
        res.clearCookie('connect.sid');
        logInfo("User logged out successfully", { userId: (req.user as any)?.id });
        req.logout((err) => {
          if (err) {
            logError("Error during logout", { error: err });
            return next(err);
          }
          res.sendStatus(200);
        });
      });
    } else {
      res.sendStatus(200);
    }
  });

  // Error handler should be last
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}