import { Router } from 'express';
import { storage } from '../storage';
import { generateMealPlan } from '../services/openai-meal-service';
import { insertMealPlanSchema, mealItemSchema } from '../../shared/schema';
import { z } from 'zod';
import { logMealPlanError, logMealPlanInfo, logMealPlanValidation } from '../services/meal-plan-logger';

const router = Router();

// Schema for validating AI meal plan generation request
const generateMealPlanSchema = z.object({
  dietaryPreferences: z.array(z.string()).optional(),
  calorieTarget: z.number().min(500).max(10000).optional(),
  mealsPerDay: z.number().min(1).max(6).optional(),
  daysInPlan: z.number().min(1).max(30).optional(),
  allergies: z.array(z.string()).optional(),
  fitnessGoals: z.array(z.string()).optional(),
});

// Get all meal plans
router.get('/', async (req, res) => {
  try {
    const plans = await storage.getMealPlans();
    res.json(plans);
  } catch (error) {
    logMealPlanError('Error fetching meal plans', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

// Generate AI meal plan
router.post('/generate', async (req, res) => {
  try {
    const validation = generateMealPlanSchema.safeParse(req.body);
    if (!validation.success) {
      logMealPlanValidation(0, validation.error.errors);
      return res.status(400).json({ errors: validation.error.errors });
    }

    // Only allow admins and trainers to generate meal plans
    if (!['admin', 'trainer'].includes(req.user?.role)) {
      logMealPlanInfo('Unauthorized meal plan generation attempt', { 
        userId: req.user?.id,
        role: req.user?.role 
      });
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const meals = await generateMealPlan(validation.data);

    // Validate generated meals
    const mealsValidation = z.array(mealItemSchema).safeParse(meals);
    if (!mealsValidation.success) {
      logMealPlanError('Invalid meal plan generated', mealsValidation.error);
      return res.status(500).json({ error: 'Generated meal plan is invalid' });
    }

    res.json({ meals: mealsValidation.data });
  } catch (error) {
    logMealPlanError('Error generating meal plan', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});

// Create new meal plan
router.post('/', async (req, res) => {
  try {
    const validation = insertMealPlanSchema.safeParse({
      ...req.body,
      trainerId: req.user?.id
    });

    if (!validation.success) {
      logMealPlanValidation(0, validation.error.errors);
      return res.status(400).json({ errors: validation.error.errors });
    }

    const newPlan = await storage.createMealPlan(validation.data);
    res.json(newPlan);
  } catch (error) {
    logMealPlanError('Error creating meal plan', error);
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
});

export default router;