import { Request, Response } from "express";
import { storage } from "../storage";
import { logError, logInfo } from "../services/logger";
import { asyncHandler } from "../middleware/async";
import { generateMealPlan } from "../services/openai-meal-service";

export const mealPlanRoutes = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const mealPlans = await storage.getMealPlans();
    res.json(mealPlans);
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const mealPlan = await storage.getMealPlan(parseInt(req.params.id));
    if (!mealPlan) {
      return res.status(404).json({ message: "Meal plan not found" });
    }
    res.json(mealPlan);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { dietaryPreferences, calorieTarget, mealsPerDay, daysInPlan, allergies, fitnessGoals } = req.body;

    try {
      const generatedMealPlan = await generateMealPlan({
        dietaryPreferences,
        calorieTarget,
        mealsPerDay,
        daysInPlan,
        allergies,
        fitnessGoals
      });

      const mealPlan = await storage.createMealPlan({
        memberId: (req.user as any).id,
        meals: generatedMealPlan,
        preferences: dietaryPreferences,
        createdAt: new Date()
      });

      logInfo("Meal plan created successfully", { planId: mealPlan.id });
      res.status(201).json(mealPlan);
    } catch (error) {
      logError("Error creating meal plan", { error: String(error) });
      res.status(500).json({ message: "Failed to create meal plan" });
    }
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const updated = await storage.updateMealPlan(parseInt(req.params.id), req.body);
    if (!updated) {
      return res.status(404).json({ message: "Meal plan not found" });
    }
    res.json(updated);
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    try {
      await storage.deleteMealPlan(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      logError("Error deleting meal plan", { error: String(error) });
      res.status(500).json({ message: "Failed to delete meal plan" });
    }
  })
};