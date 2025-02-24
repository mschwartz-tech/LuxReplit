import OpenAI from "openai";
import { logError } from './logger';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Update interface definitions to match our schema
interface MealPlanGenerationRequest {
  foodPreferences: string;
  calorieTarget: number;
  mealsPerDay: number;
  dietaryRestrictions?: string[];
  fitnessGoals?: string[];
  macroDistribution: {
    protein: number;
    carbs: number;
    fats: number;
  };
  cookingSkillLevel: string;
  maxPrepTime: string;
}

interface SingleMealGenerationRequest {
  foodPreferences: string;
  calorieTarget: number;
  mealType: string;
  dayNumber: number;
  mealNumber: number;
  macroDistribution: {
    protein: number;
    carbs: number;
    fats: number;
  };
}

interface Ingredient {
  item: string;
  amount: string;
  unit: string;
}

interface MealDetails {
  meal: string;
  food: string;
  ingredients: {
    item: string;
    amount: string;
    unit: string;
  }[];
  instructions: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  dayNumber: number;
  mealNumber: number;
}

export async function generateMealPlan(request: MealPlanGenerationRequest): Promise<MealDetails[]> {
  try {
    const prompt = `As a professional nutritionist, create a detailed 7-day meal plan following these requirements:

KEY REQUIREMENTS:
- Food preferences and style: ${request.foodPreferences}
- Daily calorie target: ${request.calorieTarget} calories
- Meals per day: ${request.mealsPerDay}
- Dietary restrictions: ${request.dietaryRestrictions?.join(', ') || 'None specified'}
- Fitness goals: ${request.fitnessGoals?.join(', ') || 'General health'}
- Macro split: Protein ${request.macroDistribution.protein}%, Carbs ${request.macroDistribution.carbs}%, Fats ${request.macroDistribution.fats}%
- Cooking expertise: ${request.cookingSkillLevel}
- Maximum prep time: ${request.maxPrepTime}`;

    console.log('Generating meal plan with parameters:', {
      calorieTarget: request.calorieTarget,
      mealsPerDay: request.mealsPerDay,
      cookingSkillLevel: request.cookingSkillLevel,
      maxPrepTime: request.maxPrepTime
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional nutritionist and meal planning expert. Provide precise, accurate meal plans with exact nutritional values, detailed ingredients, and clear cooking instructions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    if (!response.choices[0].message.content) {
      throw new Error("No content in OpenAI response");
    }

    const result = JSON.parse(response.choices[0].message.content);

    if (!result.meals || !Array.isArray(result.meals)) {
      throw new Error("Invalid response format from OpenAI");
    }

    const expectedTotalMeals = 7 * request.mealsPerDay;
    if (result.meals.length !== expectedTotalMeals) {
      throw new Error(`Expected ${expectedTotalMeals} meals but got ${result.meals.length}`);
    }

    // Validate each meal
    result.meals.forEach((meal: any, index: number) => {
      if (!meal.meal || !meal.food || !Array.isArray(meal.ingredients) || 
          !Array.isArray(meal.instructions) || typeof meal.calories !== 'number' || 
          typeof meal.protein !== 'number' || typeof meal.carbs !== 'number' || 
          typeof meal.fats !== 'number') {
        throw new Error(`Invalid meal data at index ${index}`);
      }
    });

    return result.meals as MealDetails[];
  } catch (error) {
    console.error('Error in generateMealPlan:', error);
    logError('Error generating meal plan', { 
      error,
      request: {
        ...request,
        foodPreferences: request.foodPreferences.substring(0, 100) + '...' // Truncate for logging
      }
    });
    throw new Error(error instanceof Error ? error.message : "Failed to generate meal plan");
  }
}

export async function generateSingleMeal(request: SingleMealGenerationRequest): Promise<MealDetails> {
  try {
    const prompt = `As a professional nutritionist, create a single ${request.mealType} meal following these requirements:

KEY REQUIREMENTS:
- Food preferences: ${request.foodPreferences}
- Calorie target for this meal: ${request.calorieTarget} calories
- Macro split: Protein ${request.macroDistribution.protein}%, Carbs ${request.macroDistribution.carbs}%, Fats ${request.macroDistribution.fats}%`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional nutritionist and meal planning expert. Provide precise, accurate meal plans with exact nutritional values, detailed ingredients, and clear cooking instructions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    if (!response.choices[0].message.content) {
      throw new Error("No content in OpenAI response");
    }

    const result = JSON.parse(response.choices[0].message.content);

    // Validate meal structure
    if (!result.meal || !result.food || !Array.isArray(result.ingredients) || 
        !Array.isArray(result.instructions) || typeof result.calories !== 'number' || 
        typeof result.protein !== 'number' || typeof result.carbs !== 'number' || 
        typeof result.fats !== 'number') {
      throw new Error("Invalid meal data structure");
    }

    return {
      ...result,
      dayNumber: request.dayNumber,
      mealNumber: request.mealNumber
    };
  } catch (error) {
    console.error('Error in generateSingleMeal:', error);
    logError('Error generating single meal', { error, request });
    throw new Error(error instanceof Error ? error.message : "Failed to generate meal");
  }
}