import { beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import { db } from '../../db';
import { users, mealPlans, memberMealPlans } from '../../../shared/schema';
import type { User, MealPlan, InsertMealPlan } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Meal Plan Management', () => {
  let testTrainer: User;
  let testMealPlan: MealPlan;

  beforeEach(async () => {
    try {
      // Create a test trainer
      [testTrainer] = await db.insert(users).values({
        username: 'test_trainer',
        password: 'password123',
        role: 'trainer',
        email: 'trainer@test.com',
        name: 'Test Trainer',
        createdAt: new Date()
      }).returning();

      // Create a test meal plan
      [testMealPlan] = await db.insert(mealPlans).values({
        trainerId: testTrainer.id,
        name: 'Test Meal Plan',
        description: 'Test meal plan description',
        meals: {
          breakfast: { name: 'Oatmeal', calories: 300 },
          lunch: { name: 'Chicken Salad', calories: 450 },
          dinner: { name: 'Salmon with Vegetables', calories: 550 }
        },
        macroDistribution: { protein: 30, carbs: 40, fats: 30 },
        dietaryPreferences: ['vegetarian'],
        dietaryRestrictions: ['gluten-free'],
        calorieTarget: 2000,
        mealsPerDay: 3,
        cookingSkillLevel: 'intermediate',
        maxPrepTime: '30 minutes',
        excludedIngredients: ['peanuts'],
        createdAt: new Date()
      }).returning();
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      // Clean up test data in correct order
      await db.delete(memberMealPlans);
      await db.delete(mealPlans);
      await db.delete(users);
    } catch (error) {
      console.error('Error in test cleanup:', error);
      throw error;
    }
  });

  describe('Meal Plan Creation', () => {
    it('should create a meal plan with all fields successfully', async () => {
      const mealPlanData: InsertMealPlan = {
        trainerId: testTrainer.id,
        name: 'New Test Plan',
        description: 'Complete test plan',
        meals: {
          breakfast: { name: 'Smoothie Bowl', calories: 400 },
          lunch: { name: 'Quinoa Bowl', calories: 500 },
          dinner: { name: 'Tofu Stir-fry', calories: 600 }
        },
        macroDistribution: { protein: 25, carbs: 50, fats: 25 },
        dietaryPreferences: ['vegan'],
        dietaryRestrictions: ['nut-free'],
        calorieTarget: 1800,
        mealsPerDay: 3,
        cookingSkillLevel: 'beginner',
        maxPrepTime: '20 minutes',
        excludedIngredients: ['soy']
      };

      const [newPlan] = await db.insert(mealPlans).values(mealPlanData).returning();

      expect(newPlan).toBeDefined();
      expect(newPlan.name).toBe(mealPlanData.name);
      expect(newPlan.macroDistribution).toEqual(mealPlanData.macroDistribution);
      expect(newPlan.dietaryPreferences).toEqual(mealPlanData.dietaryPreferences);
    });

    it('should validate macro distribution totals 100%', async () => {
      const invalidMealPlanData: InsertMealPlan = {
        trainerId: testTrainer.id,
        name: 'Invalid Macros Plan',
        meals: { breakfast: { name: 'Toast', calories: 200 } },
        macroDistribution: { protein: 20, carbs: 20, fats: 20 } // Only totals 60%
      };

      await expect(
        db.insert(mealPlans).values(invalidMealPlanData)
      ).rejects.toThrow();
    });
  });

  describe('Meal Plan Retrieval', () => {
    it('should retrieve a meal plan with all fields', async () => {
      const plan = await db.query.mealPlans.findFirst({
        where: eq(mealPlans.id, testMealPlan.id)
      });

      expect(plan).toBeDefined();
      expect(plan?.macroDistribution).toEqual(testMealPlan.macroDistribution);
      expect(plan?.dietaryPreferences).toEqual(testMealPlan.dietaryPreferences);
      expect(plan?.cookingSkillLevel).toBe(testMealPlan.cookingSkillLevel);
    });
  });

  describe('Meal Plan Updates', () => {
    it('should update meal plan fields correctly', async () => {
      const updates = {
        macroDistribution: { protein: 35, carbs: 40, fats: 25 },
        calorieTarget: 2200,
        mealsPerDay: 4
      };

      const [updatedPlan] = await db
        .update(mealPlans)
        .set(updates)
        .where(eq(mealPlans.id, testMealPlan.id))
        .returning();

      expect(updatedPlan.macroDistribution).toEqual(updates.macroDistribution);
      expect(updatedPlan.calorieTarget).toBe(updates.calorieTarget);
      expect(updatedPlan.mealsPerDay).toBe(updates.mealsPerDay);
    });
  });
});
