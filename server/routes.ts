import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertMemberSchema, insertWorkoutPlanSchema, insertScheduleSchema, insertInvoiceSchema, insertMarketingCampaignSchema } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}