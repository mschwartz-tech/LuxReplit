import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  insertUserSchema, insertMemberSchema, insertWorkoutPlanSchema, insertWorkoutLogSchema,
  insertScheduleSchema, insertInvoiceSchema, insertMarketingCampaignSchema,
  insertExerciseSchema, insertMuscleGroupSchema, insertMemberProfileSchema,
  insertMemberAssessmentSchema, insertMemberProgressPhotoSchema, insertPricingPlanSchema,
  insertGymMembershipPricingSchema
} from "@shared/schema";
import { logError, logInfo } from "./services/logger";
import { asyncHandler } from "./middleware/async";
import { errorHandler } from "./middleware/error";

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
  // Register error handling middleware
  app.use(errorHandler);
  setupAuth(app);

  app.get("/health", asyncHandler(async (req: Request, res: Response) => {
    logInfo("Health check requested", { path: req.path });
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  }));

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

  app.get("/api/members", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const members = await storage.getMembers();
    logInfo("Members retrieved", { count: members.length });
    res.json(members);
  }));

  app.post("/api/members", requireRole(["admin", "trainer"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Member creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }

    const member = await storage.createMember(parsed.data);
    logInfo("New member created", { memberId: member.id });
    res.status(201).json(member);
  }));

  app.get("/api/members/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const member = await storage.getMember(parseInt(req.params.id));
    if (!member) return res.sendStatus(404);
    logInfo("Member retrieved", { memberId: member.id });
    res.json(member);
  }));

  app.get("/api/members/:id/profile", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const profile = await storage.getMemberProfile(parseInt(req.params.id));
    if (!profile) return res.sendStatus(404);
    logInfo("Member profile retrieved", { memberId: req.params.id });
    res.json(profile);
  }));

  app.post("/api/members/:id/profile", requireRole(["admin", "trainer"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertMemberProfileSchema.safeParse({ ...req.body, memberId: parseInt(req.params.id) });
    if (!parsed.success) {
      logError("Profile creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const profile = await storage.createMemberProfile(parsed.data);
    logInfo("New profile created", { profileId: profile.id });
    res.status(201).json(profile);
  }));

  app.patch("/api/members/:id/profile", requireRole(["admin", "trainer"]), asyncHandler(async (req: Request, res: Response) => {
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
  }));

  app.get("/api/members/:id/assessments", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const assessments = await storage.getMemberAssessments(parseInt(req.params.id));
    logInfo("Assessments retrieved", { memberId: req.params.id, count: assessments.length });
    res.json(assessments);
  }));

  app.post("/api/members/:id/assessments", requireRole(["admin", "trainer"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertMemberAssessmentSchema.safeParse({ ...req.body, memberId: parseInt(req.params.id) });
    if (!parsed.success) {
      logError("Assessment creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const assessment = await storage.createMemberAssessment(parsed.data);
    logInfo("New assessment created", { assessmentId: assessment.id });
    res.status(201).json(assessment);
  }));

  app.get("/api/members/:id/assessments/:assessmentId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const assessment = await storage.getMemberAssessment(parseInt(req.params.assessmentId));
    if (!assessment) return res.sendStatus(404);
    if (assessment.memberId !== parseInt(req.params.id)) return res.sendStatus(403);
    logInfo("Member assessment retrieved", { assessmentId: req.params.assessmentId });
    res.json(assessment);
  }));

  app.get("/api/members/:id/progress-photos", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const photos = await storage.getMemberProgressPhotos(parseInt(req.params.id));
    logInfo("Member progress photos retrieved", { memberId: req.params.id, count: photos.length });
    res.json(photos);
  }));

  app.get("/api/members/:id/progress-photos/:photoId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const photo = await storage.getMemberProgressPhoto(parseInt(req.params.photoId));
    if (!photo) return res.sendStatus(404);
    if (photo.memberId !== parseInt(req.params.id)) return res.sendStatus(403);
    logInfo("Member progress photo retrieved", { photoId: req.params.photoId });
    res.json(photo);
  }));

  app.post("/api/members/:id/progress-photos", requireRole(["admin", "trainer"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertMemberProgressPhotoSchema.safeParse({ ...req.body, memberId: parseInt(req.params.id) });
    if (!parsed.success) {
      logError("Member progress photo creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const photo = await storage.createMemberProgressPhoto(parsed.data);
    logInfo("New member progress photo created", { photoId: photo.id });
    res.status(201).json(photo);
  }));

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

  app.get("/api/pricing-plans", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const plans = await storage.getPricingPlans();
    logInfo("Pricing plans retrieved", { count: plans.length });
    res.json(plans);
  }));

  app.get("/api/pricing-plans/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const plan = await storage.getPricingPlan(parseInt(req.params.id));
    if (!plan) return res.sendStatus(404);
    logInfo("Pricing plan retrieved", { planId: req.params.id });
    res.json(plan);
  }));

  app.post("/api/pricing-plans", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertPricingPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Pricing plan creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }

    const plan = await storage.createPricingPlan(parsed.data);
    logInfo("New pricing plan created", { planId: plan.id });
    res.status(201).json(plan);
  }));

  app.patch("/api/pricing-plans/:id", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const planId = parseInt(req.params.id);
    const plan = await storage.getPricingPlan(planId);
    if (!plan) return res.sendStatus(404);

    const parsed = insertPricingPlanSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      logError("Pricing plan update validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }

    const updatedPlan = await storage.updatePricingPlan(planId, parsed.data);
    logInfo("Pricing plan updated", { planId: updatedPlan.id });
    res.json(updatedPlan);
  }));

  app.get("/api/gym-membership-pricing", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const pricing = await storage.getGymMembershipPricing();
    logInfo("Gym membership pricing retrieved", { count: pricing.length });
    res.json(pricing);
  }));

  app.post("/api/gym-membership-pricing", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertGymMembershipPricingSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Gym membership pricing creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }

    const pricing = await storage.createGymMembershipPricing(parsed.data);
    logInfo("New gym membership pricing created", { pricingId: pricing.id });
    res.status(201).json(pricing);
  }));

  app.patch("/api/gym-membership-pricing/:id", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const pricingId = parseInt(req.params.id);
    const pricing = await storage.getGymMembershipPricingById(pricingId);
    if (!pricing) return res.sendStatus(404);

    const parsed = insertGymMembershipPricingSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      logError("Gym membership pricing update validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }

    const updatedPricing = await storage.updateGymMembershipPricing(pricingId, parsed.data);
    logInfo("Gym membership pricing updated", { pricingId: updatedPricing.id });
    res.json(updatedPricing);
  }));

  app.delete("/api/gym-membership-pricing/:id", requireRole(["admin"]), asyncHandler(async (req: Request, res: Response) => {
    const pricingId = parseInt(req.params.id);
    const pricing = await storage.getGymMembershipPricingById(pricingId);
    if (!pricing) return res.sendStatus(404);

    await storage.deleteGymMembershipPricing(pricingId);
    logInfo("Gym membership pricing deleted", { pricingId });
    res.sendStatus(200);
  }));

  const httpServer = createServer(app);
  return httpServer;
}