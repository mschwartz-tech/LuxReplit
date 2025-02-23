import { Request, Response } from "express";
import { storage } from "../storage";
import { logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";

export const paymentRoutes = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const payments = await storage.getMemberPayments();
    res.json(payments);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const payment = await storage.createMemberPayment(req.body);
    logInfo("Payment processed", { paymentId: payment.id });
    res.status(201).json(payment);
  })
};