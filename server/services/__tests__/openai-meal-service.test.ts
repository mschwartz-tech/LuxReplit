import { generateMealPlan } from '../openai-meal-service';
import { logError } from '../logger';

// Mock the OpenAI API and logger
jest.mock('openai');
jest.mock('../logger');

describe('generateMealPlan', () => {
  const mockRequest = {
    foodPreferences: "Healthy Mediterranean style cooking",
    calorieTarget: 2000,
    mealsPerDay: 3,
    cookingSkillLevel: "intermediate",
    maxPrepTime: "30_min",
    macroDistribution: {
      protein: 30,
      carbs: 40,
      fats: 30
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a valid meal plan', async () => {
    const mockMeal = {
      meal: "Breakfast",
      food: "Greek Yogurt Bowl",
      ingredients: [
        { item: "Greek yogurt", amount: "200", unit: "g" }
      ],
      instructions: ["Mix ingredients"],
      calories: 300,
      protein: 20,
      carbs: 30,
      fats: 10,
      dayNumber: 1,
      mealNumber: 1
    };

    const mockResponse = {
      meals: Array(21).fill(mockMeal) // 7 days * 3 meals
    };

    // Mock OpenAI response
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockResponse) } }]
          })
        }
      }
    };

    const result = await generateMealPlan(mockRequest);
    
    expect(result).toHaveLength(21); // 7 days * 3 meals
    expect(result[0]).toMatchObject({
      meal: expect.any(String),
      food: expect.any(String),
      ingredients: expect.arrayContaining([
        expect.objectContaining({
          item: expect.any(String),
          amount: expect.any(String),
          unit: expect.any(String)
        })
      ]),
      instructions: expect.arrayContaining([expect.any(String)]),
      calories: expect.any(Number),
      protein: expect.any(Number),
      carbs: expect.any(Number),
      fats: expect.any(Number),
      dayNumber: expect.any(Number),
      mealNumber: expect.any(Number)
    });
  });

  it('should handle OpenAI API errors', async () => {
    const mockError = new Error('API Error');
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(mockError)
        }
      }
    };

    await expect(generateMealPlan(mockRequest)).rejects.toThrow('Failed to generate meal plan');
    expect(logError).toHaveBeenCalledWith('Error generating meal plan:', { error: mockError });
  });

  it('should validate meal plan structure', async () => {
    const invalidResponse = {
      meals: [{
        // Missing required fields
        meal: "Breakfast"
      }]
    };

    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(invalidResponse) } }]
          })
        }
      }
    };

    await expect(generateMealPlan(mockRequest)).rejects.toThrow('Invalid meal data at index 0');
  });
});
