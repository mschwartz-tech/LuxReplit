import { Request, Response } from "express";
import { storage } from "../storage";
import { logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";

export const invoiceRoutes = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const invoices = await storage.getInvoices();
    res.json(invoices);
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const invoice = await storage.getInvoice(parseInt(req.params.id));
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.json(invoice);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const invoice = await storage.createInvoice(req.body);
    logInfo("Invoice created", { invoiceId: invoice.id });
    res.status(201).json(invoice);
  })
};
