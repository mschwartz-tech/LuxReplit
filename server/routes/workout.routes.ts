import { Request, Response } from "express";
import { storage } from "../storage";
import { logError, logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";
import { insertWorkoutPlanSchema, insertWorkoutLogSchema } from "../../shared/schema";

export const workoutRoutes = {
  getPlans: asyncHandler(async (req: Request, res: Response) => {
    const plans = await storage.getWorkoutPlans();
    logInfo("Workout plans retrieved", { count: plans.length });
    res.json(plans);
  }),

  getPlansByMember: asyncHandler(async (req: Request, res: Response) => {
    const memberId = parseInt(req.params.memberId);
    if (isNaN(memberId)) {
      logError("Invalid member ID provided", { memberId: req.params.memberId });
      return res.status(400).json({ error: "Invalid member ID" });
    }
    const plans = await storage.getWorkoutPlansByMember(memberId);
    logInfo("Member workout plans retrieved", { memberId, count: plans.length });
    res.json(plans);
  }),

  createPlan: asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertWorkoutPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Workout plan creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const plan = await storage.createWorkoutPlan(parsed.data);
    logInfo("New workout plan created", { planId: plan.id });
    res.status(201).json(plan);
  }),

  getLogsByPlan: asyncHandler(async (req: Request, res: Response) => {
    const planId = parseInt(req.params.planId);
    if (isNaN(planId)) {
      logError("Invalid plan ID provided", { planId: req.params.planId });
      return res.status(400).json({ error: "Invalid plan ID" });
    }
    const logs = await storage.getWorkoutLogs(planId);
    logInfo("Workout logs retrieved for plan", { planId, count: logs.length });
    res.json(logs);
  }),

  getLogsByMember: asyncHandler(async (req: Request, res: Response) => {
    const memberId = parseInt(req.params.memberId);
    if (isNaN(memberId)) {
      logError("Invalid member ID provided", { memberId: req.params.memberId });
      return res.status(400).json({ error: "Invalid member ID" });
    }
    const logs = await storage.getMemberWorkoutLogs(memberId);
    logInfo("Workout logs retrieved for member", { memberId, count: logs.length });
    res.json(logs);
  }),

  createLog: asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertWorkoutLogSchema.safeParse(req.body);
    if (!parsed.success) {
      logError("Workout log creation validation failed", { errors: parsed.error.errors });
      return res.status(400).json(parsed.error);
    }
    const log = await storage.createWorkoutLog(parsed.data);
    logInfo("New workout log created", { logId: log.id });
    res.status(201).json(log);
  }),

  updatePlanCompletion: asyncHandler(async (req: Request, res: Response) => {
    const { completionRate } = req.body;
    if (typeof completionRate !== 'number' || completionRate < 0 || completionRate > 100) {
      logError("Invalid completion rate provided", { completionRate });
      return res.status(400).json({ error: "Invalid completion rate" });
    }
    const plan = await storage.updateWorkoutPlanCompletionRate(parseInt(req.params.id), completionRate);
    logInfo("Workout plan completion updated", { planId: req.params.id, completionRate });
    res.json(plan);
  })
};