import { Router } from 'express';
import { storage } from '../storage';
import { generateMealPlan, generateSingleMeal } from '../services/openai-meal-service';
import { insertMealPlanSchema, mealItemSchema } from '@shared/schema';
import { z } from 'zod';
import { logMealPlanError, logMealPlanInfo, logMealPlanValidation } from '../services/meal-plan-logger';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

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

    const userRole = (req.user as any)?.role;
    if (!userRole || !['admin', 'trainer'].includes(userRole)) {
      logMealPlanInfo('Unauthorized meal plan generation attempt', {
        userId: (req.user as any)?.id,
        role: userRole
      });
      return res.status(403).json({ error: 'Unauthorized. Only trainers and admins can generate meal plans.' });
    }

    const meals = await generateMealPlan(validation.data);

    // Create a draft meal plan
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

// Regenerate single meal
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

// Create new meal plan (final confirmation)
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

// Add confirm meal plan endpoint
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

    // Update meal plan status and assign to member
    const updatedPlan = await storage.updateMealPlan(validation.data.mealPlanId, {
      status: 'confirmed',
      startDate: validation.data.startDate,
      endDate: validation.data.endDate,
    });

    // Create member meal plan assignment
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