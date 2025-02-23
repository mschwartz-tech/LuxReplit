
import { Request, Response } from "express";
import { storage } from "../storage";
import { logError, logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";

export const strengthMetricRoutes = {
  getMetrics: asyncHandler(async (req: Request, res: Response) => {
    const metrics = await storage.getMemberStrengthMetrics(parseInt(req.params.id));
    res.json(metrics);
  }),

  createMetric: asyncHandler(async (req: Request, res: Response) => {
    const metric = await storage.createStrengthMetric({
      ...req.body,
      progressId: parseInt(req.params.progressId)
    });
    logInfo("Strength metric created", { metricId: metric.id });
    res.status(201).json(metric);
  }),

  getProgressMetrics: asyncHandler(async (req: Request, res: Response) => {
    const metrics = await storage.getProgressStrengthMetrics(parseInt(req.params.progressId));
    res.json(metrics);
  })
};
