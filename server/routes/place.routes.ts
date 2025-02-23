import { Request, Response } from "express";
import { storage } from "../storage";
import { logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";

export const placeRoutes = {
  search: asyncHandler(async (req: Request, res: Response) => {
    const places = await storage.searchPlaces(req.query.query as string);
    res.json(places);
  }),

  getDetails: asyncHandler(async (req: Request, res: Response) => {
    const place = await storage.getPlaceDetails(req.params.placeId as string);
    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }
    res.json(place);
  })
};
