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

    const { planDuration = 14, ...planParams } = validation.data;
    const meals = await generateMealPlan({ ...planParams, planDuration });

    // Calculate start and end dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planDuration);

    const newPlan = await storage.createMealPlan({
      userId: (req.user as any).id,
      name: `${planDuration}-Day Meal Plan - ${startDate.toLocaleDateString()}`,
      targetCalories: planParams.calorieTarget,
      macroDistribution: planParams.macroDistribution,
      startDate,
      endDate,
      status: 'draft',
      meals: meals.map((meal, index) => ({
        ...meal,
        weekNumber: Math.floor(index / 7) + 1,
        dayNumber: (index % 7) + 1,
      }))
    });

    res.json({ mealPlan: newPlan });
  } catch (error) {
    logMealPlanError('Error generating meal plan', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});

const regenerateMealSchema = z.object({
  mealPlanId: z.number(),
  weekNumber: z.number().min(1).max(2),
  dayNumber: z.number().min(1).max(7),
  mealNumber: z.number().min(1).max(6),
  foodPreferences: z.string().max(1000),
  dietaryRestrictions: z.array(z.string()).optional(),
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

    // Get the meal plan and all meals for the specified day
    const mealPlan = await storage.getMealPlan(validation.data.mealPlanId);
    const dayMeals = await storage.getDayMeals(
      validation.data.mealPlanId,
      validation.data.weekNumber,
      validation.data.dayNumber
    );

    // Calculate remaining calories and macros for the day
    const mealToRegenerate = dayMeals.find(m => m.mealNumber === validation.data.mealNumber);
    const otherMeals = dayMeals.filter(m => m.mealNumber !== validation.data.mealNumber);

    const dailyTotals = otherMeals.reduce((acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fats: acc.fats + meal.fats
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

    // Generate new meal with remaining daily targets
    const newMeal = await generateSingleMeal({
      targetCalories: mealPlan.targetCalories - dailyTotals.calories,
      macroDistribution: {
        protein: mealPlan.macroDistribution.protein,
        carbs: mealPlan.macroDistribution.carbs,
        fats: mealPlan.macroDistribution.fats
      },
      mealNumber: validation.data.mealNumber,
      weekNumber: validation.data.weekNumber,
      dayNumber: validation.data.dayNumber,
      foodPreferences: validation.data.foodPreferences,
      dietaryRestrictions: validation.data.dietaryRestrictions
    });

    // Store the new meal with a reference to the replaced meal
    const updatedMeal = await storage.createMeal({
      ...newMeal,
      isCustomized: true,
      replacementForId: mealToRegenerate?.id,
      mealPlanId: validation.data.mealPlanId
    });

    res.json(updatedMeal);
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