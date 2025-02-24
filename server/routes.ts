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
import memberRoutes from "./routes/members";

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

const requireRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !roles.includes((req.user as any)?.role)) {
    logError("Unauthorized access attempt", {
      userId: (req.user as any)?.id,
      role: (req.user as any)?.role,
      requiredRoles: roles
    });
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Register routes with authentication
  app.use('/api/members', requireAuth, memberRoutes);
  app.use('/api/meal-plans', requireAuth, mealPlanRoutes);
  app.use('/api', exerciseRoutes);

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