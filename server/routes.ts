import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { logError, logInfo } from "./services/logger";
import { asyncHandler } from "./middleware/async";
import { errorHandler } from "./middleware/error";
import { memberRoutes } from "./routes/member.routes";
import { workoutRoutes } from "./routes/workout.routes";
import { mealPlanRoutes } from "./routes/mealPlan.routes";
import { strengthMetricRoutes } from "./routes/strengthMetric.routes";
import { invoiceRoutes } from "./routes/invoice.routes";
import { paymentRoutes } from "./routes/payment.routes";
import { marketingCampaignRoutes } from "./routes/marketingCampaign.routes";
import { scheduleRoutes } from "./routes/schedule.routes";
import { placeRoutes } from "./routes/place.routes";


const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  next();
};

const requireRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !roles.includes((req.user as any).role)) {
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
  app.use(errorHandler);
  setupAuth(app);

  // Health check
  app.get("/health", asyncHandler(async (req: Request, res: Response) => {
    logInfo("Health check requested");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  }));

  // Member routes
  app.get("/api/members", requireAuth, memberRoutes.getAll);
  app.post("/api/members", requireRole(["admin", "trainer"]), memberRoutes.create);
  app.get("/api/members/:id", requireAuth, memberRoutes.getOne);
  app.get("/api/members/:id/assessments", requireAuth, memberRoutes.getAssessments);
  app.post("/api/members/:id/assessments", requireRole(["admin", "trainer"]), memberRoutes.createAssessment);
  app.get("/api/members/:id/assessments/:assessmentId", requireAuth, memberRoutes.getAssessment);
  app.get("/api/members/:id/progress-photos", requireAuth, memberRoutes.getProgressPhotos);
  app.get("/api/members/:id/progress-photos/:photoId", requireAuth, memberRoutes.getProgressPhoto);
  app.post("/api/members/:id/progress-photos", requireRole(["admin", "trainer"]), memberRoutes.createProgressPhoto);
  app.get("/api/members/:id/meal-plans", requireAuth, memberRoutes.getMealPlans);
  app.post("/api/members/:id/meal-plans", requireRole(["admin", "trainer"]), memberRoutes.createMealPlan);
  app.patch("/api/members/:memberId/meal-plans/:planId", requireRole(["admin", "trainer"]), memberRoutes.updateMealPlan);
  app.get("/api/members/:id/profile", requireAuth, memberRoutes.getProfile);
  app.patch("/api/members/:id/profile", requireRole(["admin", "trainer"]), memberRoutes.updateProfile);
  app.post("/api/members/:id/profile", requireRole(["admin", "trainer"]), memberRoutes.createProfile);
  app.get("/api/members/:id/progress", requireAuth, memberRoutes.getProgress);
  app.get("/api/members/:id/strength-metrics", requireAuth, strengthMetricRoutes.getMetrics);
  app.post("/api/progress/:progressId/strength-metrics", requireRole(["admin", "trainer"]), strengthMetricRoutes.createMetric);
  app.get("/api/progress/:progressId/strength-metrics", requireAuth, strengthMetricRoutes.getProgressMetrics);


  // Workout routes
  app.get("/api/workout-plans", requireAuth, workoutRoutes.getPlans);
  app.post("/api/workout-plans", requireRole(["admin", "trainer"]), workoutRoutes.createPlan);
  app.patch("/api/workout-plans/:id/completion", requireRole(["admin", "trainer"]), workoutRoutes.updatePlanCompletion);
  app.get("/api/workout-plans/member/:memberId", requireAuth, workoutRoutes.getPlansByMember);
  app.get("/api/workout-logs/plan/:planId", requireAuth, workoutRoutes.getLogsByPlan);
  app.get("/api/workout-logs/member/:memberId", requireAuth, workoutRoutes.getLogsByMember);
  app.post("/api/workout-logs", requireAuth, workoutRoutes.createLog);


  //Meal plan routes
  app.get("/api/meal-plans", requireAuth, mealPlanRoutes.getAll);
  app.get("/api/meal-plans/:id", requireAuth, mealPlanRoutes.getOne);
  app.post("/api/meal-plans", requireRole(["admin", "trainer"]), mealPlanRoutes.create);
  app.patch("/api/meal-plans/:id", requireRole(["admin", "trainer"]), mealPlanRoutes.update);
  app.delete("/api/meal-plans/:id", requireRole(["admin", "trainer"]), mealPlanRoutes.delete);

  //Invoices Routes
  app.get("/api/invoices", requireRole(["admin"]), invoiceRoutes.getAll);
  app.get("/api/invoices/:id", requireRole(["admin"]), invoiceRoutes.getOne);
  app.post("/api/invoices", requireRole(["admin"]), invoiceRoutes.create);


  //Payments Routes
  app.post("/api/payments", requireRole(["admin"]), paymentRoutes.create);
  app.get("/api/payments", requireRole(["admin"]), paymentRoutes.getAll);

  //Marketing Campaign Routes
  app.get("/api/marketing-campaigns", requireRole(["admin"]), marketingCampaignRoutes.getAll);
  app.get("/api/marketing-campaigns/:id", requireRole(["admin"]), marketingCampaignRoutes.getOne);
  app.post("/api/marketing-campaigns", requireRole(["admin"]), marketingCampaignRoutes.create);

  //Schedule Management Routes
  app.get("/api/schedules", requireAuth, scheduleRoutes.getAll);
  app.post("/api/schedules", requireAuth, scheduleRoutes.create);

  //Place Search Routes
  app.get("/api/places/search", requireAuth, placeRoutes.search);
  app.get("/api/places/:placeId/details", requireAuth, placeRoutes.getDetails);

  // Authentication Routes
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

  const httpServer = createServer(app);
  return httpServer;
}