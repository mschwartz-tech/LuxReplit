import { Request, Response } from "express";
import { storage } from "../storage";
import { logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";
import { insertPaymentSchema } from "../../shared/schema";

export const paymentRoutes = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const payments = await storage.getPayments();
    res.json(payments);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const payment = await storage.createPayment(parsed.data);
    logInfo("Payment processed", { paymentId: payment.id });
    res.status(201).json(payment);
  })
};