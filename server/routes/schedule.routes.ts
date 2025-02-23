import { Request, Response } from "express";
import { storage } from "../storage";
import { logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";

export const scheduleRoutes = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const schedules = await storage.getSchedules();
    res.json(schedules);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const schedule = await storage.createSchedule(req.body);
    logInfo("Schedule created", { scheduleId: schedule.id });
    res.status(201).json(schedule);
  })
};
