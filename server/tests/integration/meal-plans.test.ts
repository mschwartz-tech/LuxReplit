import { beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import { db } from '../../db';
import { users, mealPlans, memberMealPlans, temporaryMealPlans } from '../../../shared/schema';
import type { User, MealPlan, InsertMealPlan, InsertTemporaryMealPlan } from '../../../shared/schema';
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
        meals: [{
          meal: "Breakfast",
          food: "Oatmeal with Berries",
          ingredients: [
            { item: "Oatmeal", amount: "1", unit: "cup" },
            { item: "Mixed Berries", amount: "1/2", unit: "cup" }
          ],
          instructions: ["Cook oatmeal", "Add berries"],
          calories: 300,
          protein: 10,
          carbs: 50,
          fats: 5,
          dayNumber: 1,
          mealNumber: 1,
          isTemporary: false,
          status: "confirmed"
        }],
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
      await db.delete(temporaryMealPlans);
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
        meals: [
          {
            meal: "Breakfast",
            food: "Smoothie Bowl",
            ingredients: [],
            instructions: [],
            calories: 400,
            protein: 0,
            carbs: 0,
            fats: 0,
            dayNumber: 1,
            mealNumber: 1,
            isTemporary: false,
            status: "confirmed"
          },
          {
            meal: "Lunch",
            food: "Quinoa Bowl",
            ingredients: [],
            instructions: [],
            calories: 500,
            protein: 0,
            carbs: 0,
            fats: 0,
            dayNumber: 1,
            mealNumber: 2,
            isTemporary: false,
            status: "confirmed"
          },
          {
            meal: "Dinner",
            food: "Tofu Stir-fry",
            ingredients: [],
            instructions: [],
            calories: 600,
            protein: 0,
            carbs: 0,
            fats: 0,
            dayNumber: 1,
            mealNumber: 3,
            isTemporary: false,
            status: "confirmed"
          }
        ],
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
        meals: [{
          meal: "Breakfast",
          food: "Toast",
          ingredients: [],
          instructions: [],
          calories: 200,
          protein: 0,
          carbs: 0,
          fats: 0,
          dayNumber: 1,
          mealNumber: 1,
          isTemporary: false,
          status: "confirmed"
        }],
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

  describe('Temporary Meal Plan Management', () => {
    it('should create and manage temporary meal plans', async () => {
      const temporaryPlanData: InsertTemporaryMealPlan = {
        userId: testTrainer.id,
        meals: [{
          meal: "Breakfast",
          food: "Oatmeal with Berries",
          ingredients: [
            { item: "Oatmeal", amount: "1", unit: "cup" },
            { item: "Mixed Berries", amount: "1/2", unit: "cup" }
          ],
          instructions: ["Cook oatmeal", "Add berries"],
          calories: 300,
          protein: 10,
          carbs: 50,
          fats: 5,
          dayNumber: 1,
          mealNumber: 1,
          isTemporary: true,
          status: "draft"
        }],
        macroDistribution: { protein: 30, carbs: 40, fats: 30 },
        targetCalories: 2000,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      // Create temporary plan
      const [newTempPlan] = await db.insert(temporaryMealPlans)
        .values(temporaryPlanData)
        .returning();

      expect(newTempPlan).toBeDefined();
      expect(newTempPlan.userId).toBe(testTrainer.id);
      expect(newTempPlan.meals[0]).toBeDefined();
      expect(newTempPlan.meals[0].status).toBe("draft");
    });

    it('should allow regeneration of individual meals', async () => {
      const temporaryPlanData: InsertTemporaryMealPlan = {
        userId: testTrainer.id,
        meals: [{
          meal: "Lunch",
          food: "Chicken Salad",
          ingredients: [
            { item: "Chicken Breast", amount: "6", unit: "oz" },
            { item: "Mixed Greens", amount: "2", unit: "cups" }
          ],
          instructions: ["Cook chicken", "Assemble salad"],
          calories: 400,
          protein: 35,
          carbs: 10,
          fats: 15,
          dayNumber: 1,
          mealNumber: 2,
          isTemporary: true,
          status: "confirmed"
        }],
        macroDistribution: { protein: 30, carbs: 40, fats: 30 },
        targetCalories: 2000,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      const [plan] = await db.insert(temporaryMealPlans)
        .values(temporaryPlanData)
        .returning();

      // Update meal status for regeneration
      const updatedMeals = plan.meals.map(meal => ({
        ...meal,
        status: meal.mealNumber === 2 ? "draft" : meal.status
      }));

      const [updatedPlan] = await db.update(temporaryMealPlans)
        .set({ meals: updatedMeals })
        .where(eq(temporaryMealPlans.id, plan.id))
        .returning();

      expect(updatedPlan.meals[0].status).toBe("draft");
    });
  });
});