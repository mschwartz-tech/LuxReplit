import OpenAI from "openai";
import { logError } from './logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MealPlanGenerationRequest {
  dietaryPreferences?: string[];
  calorieTarget?: number;
  mealsPerDay?: number;
  daysInPlan?: number;
  allergies?: string[];
  fitnessGoals?: string[];
  macroDistribution?: {
    protein: number;
    carbs: number;
    fats: number;
  };
}

interface MealDetails {
  meal: string;
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export async function generateMealPlan(request: MealPlanGenerationRequest): Promise<MealDetails[]> {
  const prompt = `Generate a detailed meal plan based on the following requirements:
- Dietary preferences: ${request.dietaryPreferences?.join(', ') || 'None specified'}
- Daily calorie target: ${request.calorieTarget || 2000}
- Meals per day: ${request.mealsPerDay || 3}
- Days in plan: ${request.daysInPlan || 1}
- Allergies to avoid: ${request.allergies?.join(', ') || 'None specified'}
- Fitness goals: ${request.fitnessGoals?.join(', ') || 'General health'}
- Macro distribution: Protein ${request.macroDistribution?.protein || 30}%, Carbs ${request.macroDistribution?.carbs || 40}%, Fats ${request.macroDistribution?.fats || 30}%

For each meal, provide:
1. Meal name (e.g., Breakfast, Lunch, Dinner, Snack)
2. Food items with portions
3. Nutritional breakdown (calories, protein, carbs, fats)

Provide the response in JSON format with the following structure for each meal:
{
  "meals": [
    {
      "meal": "Breakfast/Lunch/Dinner/Snack",
      "food": "Detailed food items with portions",
      "calories": number,
      "protein": number (in grams),
      "carbs": number (in grams),
      "fats": number (in grams)
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional nutritionist and meal planning expert. Provide precise, accurate meal plans with exact nutritional values."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    if (!response.choices[0].message.content) {
      throw new Error("No content in OpenAI response");
    }

    const result = JSON.parse(response.choices[0].message.content);

    // Validate response structure
    if (!result.meals || !Array.isArray(result.meals)) {
      throw new Error("Invalid response format from OpenAI");
    }

    // Validate each meal has required properties
    result.meals.forEach((meal: any, index: number) => {
      if (!meal.meal || !meal.food || typeof meal.calories !== 'number' || 
          typeof meal.protein !== 'number' || typeof meal.carbs !== 'number' || 
          typeof meal.fats !== 'number') {
        throw new Error(`Invalid meal data at index ${index}`);
      }
    });

    return result.meals as MealDetails[];
  } catch (error) {
    logError('Error generating meal plan:', { error });
    throw new Error("Failed to generate meal plan");
  }
}