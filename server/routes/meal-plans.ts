import { Router } from 'express';
import { storage } from '../storage';
import { generateMealPlan } from '../services/openai-meal-service';
import { z } from 'zod';

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
    console.error('Error fetching meal plans:', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

// Generate AI meal plan
router.post('/generate', async (req, res) => {
  try {
    const validation = generateMealPlanSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Only allow admins and trainers to generate meal plans
    if (!['admin', 'trainer'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const meals = await generateMealPlan(validation.data);
    res.json({ meals });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});

// Create new meal plan
router.post('/', async (req, res) => {
  try {
    const newPlan = await storage.createMealPlan({
      ...req.body,
      trainerId: req.user?.id
    });
    res.json(newPlan);
  } catch (error) {
    console.error('Error creating meal plan:', error);
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
});

export default router;
