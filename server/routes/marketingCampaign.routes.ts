import { Request, Response } from "express";
import { storage } from "../storage";
import { logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";

export const marketingCampaignRoutes = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const campaigns = await storage.getMarketingCampaigns();
    res.json(campaigns);
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const campaign = await storage.getMarketingCampaign(parseInt(req.params.id));
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    res.json(campaign);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const campaign = await storage.createMarketingCampaign(req.body);
    logInfo("Marketing campaign created", { campaignId: campaign.id });
    res.status(201).json(campaign);
  })
};
