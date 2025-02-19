import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertMemberSchema, insertWorkoutPlanSchema, insertWorkoutLogSchema, 
  insertScheduleSchema, insertInvoiceSchema, insertMarketingCampaignSchema,
  insertExerciseSchema, insertMuscleGroupSchema
} from "@shared/schema";
import { generateMovementPatternDescription, predictMuscleGroups } from "./services/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Members
  app.get("/api/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const members = await storage.getMembers();
    res.json(members);
  });

  app.post("/api/members", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "trainer"].includes(req.user.role)) {
      return res.sendStatus(403);
    }
    const parsed = insertMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const member = await storage.createMember(parsed.data);
    res.status(201).json(member);
  });

  // Workout Plans
  app.get("/api/workout-plans", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const plans = await storage.getWorkoutPlans();
    res.json(plans);
  });

  app.get("/api/workout-plans/member/:memberId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const plans = await storage.getWorkoutPlansByMember(parseInt(req.params.memberId));
    res.json(plans);
  });

  app.post("/api/workout-plans", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "trainer"].includes(req.user.role)) {
      return res.sendStatus(403);
    }
    const parsed = insertWorkoutPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const plan = await storage.createWorkoutPlan(parsed.data);
    res.status(201).json(plan);
  });

  app.patch("/api/workout-plans/:id/completion", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "trainer"].includes(req.user.role)) {
      return res.sendStatus(403);
    }
    const { completionRate } = req.body;
    if (typeof completionRate !== 'number' || completionRate < 0 || completionRate > 100) {
      return res.status(400).json({ error: "Invalid completion rate" });
    }
    const plan = await storage.updateWorkoutPlanCompletionRate(parseInt(req.params.id), completionRate);
    res.json(plan);
  });

  // Workout Logs
  app.get("/api/workout-logs/plan/:planId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const logs = await storage.getWorkoutLogs(parseInt(req.params.planId));
    res.json(logs);
  });

  app.get("/api/workout-logs/member/:memberId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const logs = await storage.getMemberWorkoutLogs(parseInt(req.params.memberId));
    res.json(logs);
  });

  app.post("/api/workout-logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertWorkoutLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const log = await storage.createWorkoutLog(parsed.data);
    res.status(201).json(log);
  });

  // Schedules
  app.get("/api/schedules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const schedules = await storage.getSchedules();
    res.json(schedules);
  });

  app.post("/api/schedules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const schedule = await storage.createSchedule(parsed.data);
    res.status(201).json(schedule);
  });

  // Invoices
  app.get("/api/invoices", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }
    const invoices = await storage.getInvoices();
    res.json(invoices);
  });

  app.get("/api/invoices/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }
    const invoice = await storage.getInvoice(parseInt(req.params.id));
    if (!invoice) return res.sendStatus(404);
    res.json(invoice);
  });

  app.post("/api/invoices", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }
    const parsed = insertInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const invoice = await storage.createInvoice(parsed.data);
    res.status(201).json(invoice);
  });

  // Marketing Campaigns
  app.get("/api/marketing-campaigns", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }
    const campaigns = await storage.getMarketingCampaigns();
    res.json(campaigns);
  });

  app.get("/api/marketing-campaigns/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }
    const campaign = await storage.getMarketingCampaign(parseInt(req.params.id));
    if (!campaign) return res.sendStatus(404);
    res.json(campaign);
  });

  app.post("/api/marketing-campaigns", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(403);
    }
    const parsed = insertMarketingCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const campaign = await storage.createMarketingCampaign(parsed.data);
    res.status(201).json(campaign);
  });

  // Exercise Library Routes
  app.get("/api/muscle-groups", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const groups = await storage.getMuscleGroups();
    res.json(groups);
  });

  app.get("/api/muscle-groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const group = await storage.getMuscleGroup(parseInt(req.params.id));
    if (!group) return res.sendStatus(404);
    res.json(group);
  });

  app.post("/api/muscle-groups", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "trainer"].includes(req.user.role)) {
      return res.sendStatus(403);
    }
    const parsed = insertMuscleGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const group = await storage.createMuscleGroup(parsed.data);
    res.status(201).json(group);
  });

  app.get("/api/exercises", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const exercises = await storage.getExercises();
    res.json(exercises);
  });

  app.get("/api/exercises/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const exercise = await storage.getExercise(parseInt(req.params.id));
    if (!exercise) return res.sendStatus(404);
    res.json(exercise);
  });

  app.get("/api/exercises/muscle-group/:muscleGroupId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const exercises = await storage.getExercisesByMuscleGroup(parseInt(req.params.muscleGroupId));
    res.json(exercises);
  });

  app.post("/api/exercises/generate-pattern", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "trainer"].includes(req.user.role)) {
      return res.sendStatus(403);
    }

    const { exerciseName } = req.body;
    if (!exerciseName) {
      return res.status(400).json({ error: "Exercise name is required" });
    }

    try {
      const description = await generateMovementPatternDescription(exerciseName);
      res.json({ description });
    } catch (error) {
      console.error("Error in generate-pattern:", error);
      res.status(500).json({ error: "Failed to generate movement pattern description" });
    }
  });

  app.post("/api/exercises/predict-muscle-groups", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "trainer"].includes(req.user.role)) {
      return res.sendStatus(403);
    }

    const { exerciseName } = req.body;
    if (!exerciseName) {
      return res.status(400).json({ error: "Exercise name is required" });
    }

    try {
      const muscleGroups = await predictMuscleGroups(exerciseName);
      res.json(muscleGroups);
    } catch (error) {
      console.error("Error in predict-muscle-groups:", error);
      res.status(500).json({ error: "Failed to predict muscle groups" });
    }
  });

  app.post("/api/exercises", async (req, res) => {
    if (!req.isAuthenticated() || !["admin", "trainer"].includes(req.user.role)) {
      return res.sendStatus(403);
    }
    const parsed = insertExerciseSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("Exercise validation error:", parsed.error);
      return res.status(400).json(parsed.error);
    }
    try {
      const exercise = await storage.createExercise(parsed.data);
      res.status(201).json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      res.status(500).json({ error: "Failed to create exercise" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}