import { Router } from 'express';
import { storage } from '../storage';
import { generateMealPlan, generateSingleMeal } from '../services/openai-meal-service';
import { insertMealPlanSchema, mealItemSchema, aiMealPlanSchema } from '@shared/schema';
import { z } from 'zod';
import { logMealPlanError, logMealPlanInfo, logMealPlanValidation } from '../services/meal-plan-logger';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.use(isAuthenticated);

router.get('/', async (req, res) => {
  try {
    const plans = await storage.getMealPlans();
    res.json(plans);
  } catch (error) {
    logMealPlanError('Error fetching meal plans', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const validation = aiMealPlanSchema.safeParse(req.body);
    if (!validation.success) {
      logMealPlanValidation(0, validation.error.errors);
      return res.status(400).json({ errors: validation.error.errors });
    }

    const userRole = (req.user as any)?.role;
    if (!userRole || !['admin', 'trainer'].includes(userRole)) {
      logMealPlanInfo('Unauthorized meal plan generation attempt', {
        userId: (req.user as any)?.id,
        role: userRole
      });
      return res.status(403).json({ error: 'Unauthorized. Only trainers and admins can generate meal plans.' });
    }

    const meals = await generateMealPlan(validation.data);

    const newPlan = await storage.createMealPlan({
      trainerId: (req.user as any).id,
      name: `Meal Plan - ${new Date().toLocaleDateString()}`,
      meals,
      status: 'draft',
      ...validation.data
    });

    res.json({ mealPlan: newPlan });
  } catch (error) {
    logMealPlanError('Error generating meal plan', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});

const regenerateMealSchema = z.object({
  foodPreferences: z.string().max(1000),
  calorieTarget: z.number().min(500).max(10000),
  mealType: z.string(),
  dayNumber: z.number().min(1),
  mealNumber: z.number().min(1),
  macroDistribution: z.object({
    protein: z.number().min(0).max(100),
    carbs: z.number().min(0).max(100),
    fats: z.number().min(0).max(100),
  }).refine(data => {
    return data.protein + data.carbs + data.fats === 100;
  }, "Macro distribution must total 100%"),
});

router.post('/regenerate-meal', async (req, res) => {
  try {
    const validation = regenerateMealSchema.safeParse(req.body);
    if (!validation.success) {
      logMealPlanValidation(0, validation.error.errors);
      return res.status(400).json({ errors: validation.error.errors });
    }

    const userRole = (req.user as any)?.role;
    if (!userRole || !['admin', 'trainer'].includes(userRole)) {
      logMealPlanInfo('Unauthorized meal regeneration attempt', {
        userId: (req.user as any)?.id,
        role: userRole
      });
      return res.status(403).json({ error: 'Unauthorized. Only trainers and admins can regenerate meals.' });
    }

    const meal = await generateSingleMeal(validation.data);
    res.json(meal);
  } catch (error) {
    logMealPlanError('Error regenerating meal', error);
    res.status(500).json({ error: 'Failed to regenerate meal' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userRole = (req.user as any)?.role;
    if (!userRole || !['admin', 'trainer'].includes(userRole)) {
      logMealPlanInfo('Unauthorized meal plan creation attempt', {
        userId: (req.user as any)?.id,
        role: userRole
      });
      return res.status(403).json({ error: 'Unauthorized. Only trainers and admins can create meal plans.' });
    }

    const validation = insertMealPlanSchema.safeParse({
      ...req.body,
      trainerId: (req.user as any)?.id
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

router.post('/confirm', async (req, res) => {
  try {
    const userRole = (req.user as any)?.role;
    if (!userRole || !['admin', 'trainer'].includes(userRole)) {
      logMealPlanInfo('Unauthorized meal plan confirmation attempt', {
        userId: (req.user as any)?.id,
        role: userRole
      });
      return res.status(403).json({ error: 'Unauthorized. Only trainers and admins can confirm meal plans.' });
    }

    const validation = z.object({
      mealPlanId: z.number(),
      memberId: z.number(),
      startDate: z.coerce.date(),
      endDate: z.coerce.date().optional(),
    }).safeParse(req.body);

    if (!validation.success) {
      logMealPlanValidation(0, validation.error.errors);
      return res.status(400).json({ errors: validation.error.errors });
    }

    const updatedPlan = await storage.updateMealPlan(validation.data.mealPlanId, {
      status: 'confirmed',
      startDate: validation.data.startDate,
      endDate: validation.data.endDate,
    });

    const memberMealPlan = await storage.createMemberMealPlan({
      memberId: validation.data.memberId,
      mealPlanId: validation.data.mealPlanId,
      startDate: validation.data.startDate,
      endDate: validation.data.endDate,
      status: 'active'
    });

    res.json({ mealPlan: updatedPlan, assignment: memberMealPlan });
  } catch (error) {
    logMealPlanError('Error confirming meal plan', error);
    res.status(500).json({ error: 'Failed to confirm meal plan' });
  }
});

export default router;