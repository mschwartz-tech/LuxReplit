import { Request, Response } from "express";
import { storage } from "../storage";
import { logError, logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";
import { insertMarketingCampaignSchema } from "../../shared/schema";

export const marketingCampaignRoutes = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    try {
      const campaigns = await storage.getMarketingCampaigns();
      res.json(campaigns);
    } catch (error) {
      logError("Failed to fetch marketing campaigns", { error: String(error) });
      res.status(500).json({ error: "Failed to fetch marketing campaigns" });
    }
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    try {
      const campaign = await storage.getMarketingCampaign(parseInt(req.params.id));
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      logError("Failed to fetch marketing campaign", { error: String(error) });
      res.status(500).json({ error: "Failed to fetch marketing campaign" });
    }
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    try {
      const validation = insertMarketingCampaignSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ errors: validation.error.errors });
      }

      const campaign = await storage.createMarketingCampaign(validation.data);
      logInfo("Marketing campaign created", { campaignId: campaign.id });
      res.status(201).json(campaign);
    } catch (error) {
      logError("Failed to create marketing campaign", { error: String(error) });
      res.status(500).json({ error: "Failed to create marketing campaign" });
    }
  })
};