import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertMemberSchema,
  insertMemberAssessmentSchema,
  insertMarketingCampaignSchema,
  insertPricingPlanSchema,
  insertGymMembershipPricingSchema,
  insertMealPlanSchema,
  insertMemberMealPlanSchema,
  insertProgressSchema,
  insertStrengthMetricSchema,
  insertWorkoutPlanSchema,
  insertWorkoutLogSchema,
  insertScheduleSchema,
  insertInvoiceSchema,
  insertPaymentSchema
} from "../shared/schema";
import { logError, logInfo } from "./services/logger";
import { asyncHandler } from "./middleware/async";
import { errorHandler } from "./middleware/error";
import { searchAddresses, getPlaceDetails } from "./services/places";

// Authentication middleware
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
  // Setup middleware
  app.use(errorHandler);
  setupAuth(app);

  // Health check
  app.get("/health", asyncHandler(async (req: Request, res: Response) => {
    logInfo("Health check requested", { path: req.path });
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  }));

  // User Management Routes
  app.post("/api/users", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("User creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }

    const existingUser = await storage.getUserByUsername(parsed.data.username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const user = await storage.createUser(parsed.data);
    logInfo("New user created", { userId: user.id });
    res.status(201).json(user);
  }));

  // Member Management Routes
  const memberRoutes = {
    getAll: asyncHandler(async (req: Request, res: Response) => {
      const members = await storage.getMembers();
      logInfo("Members retrieved", { count: members.length });
      res.json(members);
    }),

    create: asyncHandler(async (req: Request, res: Response) => {
      const parsed = insertMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        logError("Member creation validation failed", { errors: parsed.error.errors });
        return res.status(400).json(parsed.error);
      }
      const member = await storage.createMember(parsed.data);
      logInfo("New member created", { memberId: member.id });
      res.status(201).json(member);
    }),

    getOne: asyncHandler(async (req: Request, res: Response) => {
      const member = await storage.getMember(parseInt(req.params.id));
      if (!member) return res.sendStatus(404);
      logInfo("Member retrieved", { memberId: member.id });
      res.json(member);
    }),
        
    getAssessments: asyncHandler(async (req: Request, res: Response) => {
      const assessments = await storage.getMemberAssessments(parseInt(req.params.id));
      logInfo("Assessments retrieved", { memberId: req.params.id, count: assessments.length });
      res.json(assessments);
    }),
    createAssessment: asyncHandler(async (req: Request, res: Response) => {
      const parsed = insertMemberAssessmentSchema.safeParse({ ...req.body, memberId: parseInt(req.params.id) });
      if (!parsed.success) {
        logError("Assessment creation validation failed", { errors: parsed.error.errors });
        return res.status(400).json(parsed.error);
      }
      const assessment = await storage.createMemberAssessment(parsed.data);
      logInfo("New assessment created", { assessmentId: assessment.id });
      res.status(201).json(assessment);
    }),
    getAssessment: asyncHandler(async (req: Request, res: Response) => {
      const assessment = await storage.getMemberAssessment(parseInt(req.params.assessmentId));
      if (!assessment) return res.sendStatus(404);
      if (assessment.memberId !== parseInt(req.params.id)) return res.sendStatus(403);
      logInfo("Member assessment retrieved", { assessmentId: req.params.assessmentId });
      res.json(assessment);
    }),
    getProgressPhotos: asyncHandler(async (req: Request, res: Response) => {
      const photos = await storage.getMemberProgressPhotos(parseInt(req.params.id));
      logInfo("Member progress photos retrieved", { memberId: req.params.id, count: photos.length });
      res.json(photos);
    }),
    getProgressPhoto: asyncHandler(async (req: Request, res: Response) => {
      const photo = await storage.getMemberProgressPhoto(parseInt(req.params.photoId));
      if (!photo) return res.sendStatus(404);
      if (photo.memberId !== parseInt(req.params.id)) return res.sendStatus(403);
      logInfo("Member progress photo retrieved", { photoId: req.params.photoId });
      res.json(photo);
    }),
    createProgressPhoto: asyncHandler(async (req: Request, res: Response) => {
      const parsed = insertMemberProgressPhotoSchema.safeParse({ ...req.body, memberId: parseInt(req.params.id) });
      if (!parsed.success) {
        logError("Member progress photo creation validation failed", { errors: parsed.error.errors });
        return res.status(400).json(parsed.error);
      }
      const photo = await storage.createMemberProgressPhoto(parsed.data);
      logInfo("New member progress photo created", { photoId: photo.id });
      res.status(201).json(photo);
    }),
    getMealPlans: asyncHandler(async (req: Request, res: Response) => {
      const plans = await storage.getMemberMealPlans(parseInt(req.params.id));
      logInfo("Member meal plans retrieved", { memberId: req.params.id, count: plans.length });
      res.json(plans);
    }),
    createMealPlan: asyncHandler(async (req: Request, res: Response) => {
      const parsed = insertMemberMealPlanSchema.safeParse({
        ...req.body,
        memberId: parseInt(req.params.id)
      });
      if (!parsed.success) {
        logError("Member meal plan creation validation failed", { errors: parsed.error.errors });
        return res.status(400).json(parsed.error);
      }
      const plan = await storage.createMemberMealPlan(parsed.data);
      logInfo("New member meal plan created", { planId: plan.id });
      res.status(201).json(plan);
    }),
    updateMealPlan: asyncHandler(async (req: Request, res: Response) => {
      const plan = await storage.getMemberMealPlan(parseInt(req.params.planId));
      if (!plan || plan.memberId !== parseInt(req.params.memberId)) return res.sendStatus(404);

      const parsed = insertMemberMealPlanSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        logError("Member meal plan update validation failed", { errors: parsed.error.errors });
        return res.status(400).json(parsed.error);
      }
      const updatedPlan = await storage.updateMemberMealPlan(parseInt(req.params.planId), parsed.data);
      logInfo("Member meal plan updated", { planId: updatedPlan.id });
      res.json(updatedPlan);
    }),
    getProfile: asyncHandler(async (req: Request, res: Response) => {
      const profile = await storage.getMemberProfile(parseInt(req.params.id));
      if (!profile) return res.sendStatus(404);
      logInfo("Member profile retrieved", { memberId: req.params.id });
      res.json(profile);
    }),
    updateProfile: asyncHandler(async (req: Request, res: Response) => {
      const memberId = parseInt(req.params.id);
      const profile = await storage.getMemberProfile(memberId);
      if (!profile) return res.sendStatus(404);

      const parsed = insertMemberProfileSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        logError("Member profile update validation failed", { errors: parsed.error.errors });
        return res.status(400).json(parsed.error);
      }
      const updatedProfile = await storage.updateMemberProfile(memberId, parsed.data);
      logInfo("Member profile updated", { profileId: updatedProfile.id });
      res.json(updatedProfile);
    }),
    createProfile: asyncHandler(async (req: Request, res: Response) => {
      const parsed = insertMemberProfileSchema.safeParse({ ...req.body, memberId: parseInt(req.params.id) });
      if (!parsed.success) {
        logError("Profile creation validation failed", { errors: parsed.error.errors });
        return res.status(400).json(parsed.error);
      }
      const profile = await storage.createMemberProfile(parsed.data);
      logInfo("New profile created", { profileId: profile.id });
      res.status(201).json(profile);
    })
  };

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


  // Progress Tracking Routes
  app.get("/api/members/:id/progress", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const progressRecords = await storage.getMemberProgress(parseInt(req.params.id));
    logInfo("Progress records retrieved", { memberId: req.params.id, count: progressRecords.length });
    res.json(progressRecords);
  }));

  // Workout Management Routes
  app.get("/api/workout-plans", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const plans = await storage.getWorkoutPlans();
    logInfo("Workout plans retrieved", { count: plans.length });
    res.json(plans);
  }));
  app.get("/api/workout-plans/member/:memberId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const plans = await storage.getWorkoutPlansByMember(parseInt(req.params.memberId));
    logInfo("Workout plans by member retrieved", { memberId: req.params.memberId, count: plans.length });
    res.json(plans);
  }));
  app.post("/api/workout-plans", requireRole(["admin", "trainer"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertWorkoutPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Workout plan creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const plan = await storage.createWorkoutPlan(parsed.data);
    logInfo("New workout plan created", { planId: plan.id });
    res.status(201).json(plan);
  }));
  app.patch("/api/workout-plans/:id/completion", requireRole(["admin", "trainer"]), asyncHandler(async (req: Request, res: Response) => {
    const { completionRate } = req.body;
    if (typeof completionRate !== 'number' || completionRate < 0 || completionRate > 100) {
      logError("Invalid completion rate provided", { completionRate });
      return res.status(400).json({ error: "Invalid completion rate" });
    }
    const plan = await storage.updateWorkoutPlanCompletionRate(parseInt(req.params.id), completionRate);
    logInfo("Workout plan completion updated", { planId: req.params.id, completionRate });
    res.json(plan);
  }));
  app.get("/api/workout-logs/plan/:planId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const logs = await storage.getWorkoutLogs(parseInt(req.params.planId));
    logInfo("Workout logs retrieved for plan", { planId: req.params.planId, count: logs.length });
    res.json(logs);
  }));
  app.get("/api/workout-logs/member/:memberId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const logs = await storage.getMemberWorkoutLogs(parseInt(req.params.memberId));
    logInfo("Workout logs retrieved for member", { memberId: req.params.memberId, count: logs.length });
    res.json(logs);
  }));
  app.post("/api/workout-logs", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertWorkoutLogSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Workout log creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const log = await storage.createWorkoutLog(parsed.data);
    logInfo("New workout log created", { logId: log.id });
    res.status(201).json(log);
  }));

  // Payment and Billing Routes
  app.get("/api/invoices", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const invoices = await storage.getInvoices();
    logInfo("Invoices retrieved", { count: invoices.length });
    res.json(invoices);
  }));
  app.get("/api/invoices/:id", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const invoice = await storage.getInvoice(parseInt(req.params.id));
    if (!invoice) return res.sendStatus(404);
    logInfo("Invoice retrieved", { invoiceId: req.params.id });
    res.json(invoice);
  }));
  app.post("/api/invoices", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Invoice creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const invoice = await storage.createInvoice(parsed.data);
    logInfo("New invoice created", { invoiceId: invoice.id });
    res.status(201).json(invoice);
  }));
  app.post("/api/payments", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Payment creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json({ error: parsed.error.errors });
    }

    try {
      const payment = await storage.createPayment(parsed.data);
      logInfo("New payment created", { paymentId: payment.id });
      res.status(201).json(payment);
    } catch (error) {
      logError("Payment creation failed", { error });
      res.status(500).json({ error: "Failed to create payment" });
    }
  }));
  app.get("/api/payments", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const payments = await storage.getPayments();
    logInfo("Payments retrieved", { count: payments.length });
    res.json(payments);
  }));

  // Marketing Campaign Routes
  app.get("/api/marketing-campaigns", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const campaigns = await storage.getMarketingCampaigns();
    logInfo("Marketing campaigns retrieved", { count: campaigns.length });
    res.json(campaigns);
  }));
  app.get("/api/marketing-campaigns/:id", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const campaign = await storage.getMarketingCampaign(parseInt(req.params.id));
    if (!campaign) return res.sendStatus(404);
    logInfo("Marketing campaign retrieved", { campaignId: req.params.id });
    res.json(campaign);
  }));
  app.post("/api/marketing-campaigns", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertMarketingCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Marketing campaign creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const campaign = await storage.createMarketingCampaign(parsed.data);
    logInfo("New marketing campaign created", { campaignId: campaign.id });
    res.status(201).json(campaign);
  }));

  // Schedule Management Routes
  app.get("/api/schedules", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const schedules = await storage.getSchedules();
    logInfo("Schedules retrieved", { count: schedules.length });
    res.json(schedules);
  }));
  app.post("/api/schedules", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Schedule creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const schedule = await storage.createSchedule(parsed.data);
    logInfo("New schedule created", { scheduleId: schedule.id });
    res.status(201).json(schedule);
  }));

  // Place Search Routes
  app.get("/api/places/search", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: "Search query is required" });

    try {
      const results = await searchAddresses(query);
      res.json(results);
    } catch (error) {
      logError("Address search failed", { error: error.message });
      res.status(500).json({ error: "Failed to search addresses" });
    }
  }));
  app.get("/api/places/:placeId/details", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { placeId } = req.params;
    try {
      const details = await getPlaceDetails(placeId);
      res.json(details);
    } catch (error) {
      logError("Place details retrieval failed", { error: error.message });
      res.status(500).json({ error: "Failed to get address details" });
    }
  }));

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


  //Meal plan routes
  const mealPlanRoutes = {
    getAll: asyncHandler(async (req: Request, res: Response) => {
      const plans = await storage.getMealPlans();
      logInfo("Meal plans retrieved", { count: plans.length });
      res.json(plans);
    }),
    getOne: asyncHandler(async (req: Request, res: Response) => {
      const plan = await storage.getMealPlan(parseInt(req.params.id));
      if (!plan) return res.sendStatus(404);
      logInfo("Meal plan retrieved", { planId: req.params.id });
      res.json(plan);
    }),
    create: asyncHandler(async (req: Request, res: Response) => {
      const parsed = insertMealPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        logError("Meal plan creation validation failed", { errors: parsed.error.errors });
        return res.status(400).json(parsed.error);
      }
      const plan = await storage.createMealPlan(parsed.data);
      logInfo("New meal plan created", { planId: plan.id });
      res.status(201).json(plan);
    }),
    update: asyncHandler(async (req: Request, res: Response) => {
      const planId = parseInt(req.params.id);
      const plan = await storage.getMealPlan(planId);
      if (!plan) return res.sendStatus(404);

      const parsed = insertMealPlanSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        logError("Meal plan update validation failed", { errors: parsed.error.errors });
        return res.status(400).json(parsed.error);
      }
      const updatedPlan = await storage.updateMealPlan(planId, parsed.data);
      logInfo("Meal plan updated", { planId: updatedPlan.id });
      res.json(updatedPlan);
    }),
    delete: asyncHandler(async (req: Request, res: Response) => {
      const planId = parseInt(req.params.id);
      const plan = await storage.getMealPlan(planId);
      if (!plan) return res.sendStatus(404);
      await storage.deleteMealPlan(planId);
      logInfo("Meal plan deleted", { planId });
      res.sendStatus(200);
    })
  };

  app.get("/api/meal-plans", requireAuth, mealPlanRoutes.getAll);
  app.get("/api/meal-plans/:id", requireAuth, mealPlanRoutes.getOne);
  app.post("/api/meal-plans", requireRole(["admin", "trainer"]), mealPlanRoutes.create);
  app.patch("/api/meal-plans/:id", requireRole(["admin", "trainer"]), mealPlanRoutes.update);
  app.delete("/api/meal-plans/:id", requireRole(["admin", "trainer"]), mealPlanRoutes.delete);


  //Strength Metrics Routes
  app.get("/api/members/:id/strength-metrics", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const metrics = await storage.getMemberStrengthMetrics(parseInt(req.params.id));
    logInfo("Strength metrics retrieved", { memberId: req.params.id, count: metrics.length });
    res.json(metrics);
  }));
  app.post("/api/progress/:progressId/strength-metrics", requireRole(["admin", "trainer"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertStrengthMetricSchema.safeParse({
      ...req.body,
      progressId: parseInt(req.params.progressId)
    });
    if (!parsed.success) {
      logError("Strength metric creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const metric = await storage.createStrengthMetric(parsed.data);
    logInfo("New strength metric created", { metricId: metric.id });
    res.status(201).json(metric);
  }));
  app.get("/api/progress/:progressId/strength-metrics", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const metrics = await storage.getProgressStrengthMetrics(parseInt(req.params.progressId));
    logInfo("Progress strength metrics retrieved", { progressId: req.params.progressId, count: metrics.length });
    res.json(metrics);
  }));

  const httpServer = createServer(app);
  return httpServer;
}