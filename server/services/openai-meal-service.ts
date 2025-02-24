import OpenAI from "openai";
import { logError } from './logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MealPlanGenerationRequest {
  foodPreferences: string;
  calorieTarget: number;
  mealsPerDay: number;
  dietaryRestrictions?: string[];
  fitnessGoals?: string[];
  macroDistribution?: {
    protein: number;
    carbs: number;
    fats: number;
  };
  cookingSkillLevel: string;
  maxPrepTime: string;
}

interface Ingredient {
  item: string;
  amount: string;
  unit: string;
}

interface MealDetails {
  meal: string;
  food: string;
  ingredients: Ingredient[];
  instructions: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  dayNumber: number;
  mealNumber: number;
}

export async function generateMealPlan(request: MealPlanGenerationRequest): Promise<MealDetails[]> {
  const prompt = `Generate a detailed 7-day meal plan based on the following requirements:
- Food preferences and dietary style: ${request.foodPreferences}
- Daily calorie target: ${request.calorieTarget}
- Meals per day: ${request.mealsPerDay}
- Dietary restrictions: ${request.dietaryRestrictions?.join(', ') || 'None specified'}
- Fitness goals: ${request.fitnessGoals?.join(', ') || 'General health'}
- Macro distribution: Protein ${request.macroDistribution?.protein || 30}%, Carbs ${request.macroDistribution?.carbs || 40}%, Fats ${request.macroDistribution?.fats || 30}%
- Cooking skill level: ${request.cookingSkillLevel}
- Maximum prep time per meal: ${request.maxPrepTime}

For each meal across all 7 days, provide:
1. Name of the meal (Breakfast, Lunch, Dinner, Snack)
2. Main food items
3. Detailed ingredients list with amounts and units
4. Step-by-step cooking instructions
5. Complete nutritional breakdown (calories, protein, carbs, fats)

Provide the response in JSON format with the following structure:
{
  "meals": [
    {
      "meal": "Breakfast/Lunch/Dinner/Snack",
      "food": "Main dish name and description",
      "ingredients": [
        {
          "item": "ingredient name",
          "amount": "numeric amount",
          "unit": "measurement unit"
        }
      ],
      "instructions": ["Step 1", "Step 2", "Step 3"],
      "calories": number,
      "protein": number (in grams),
      "carbs": number (in grams),
      "fats": number (in grams),
      "dayNumber": number (1-7),
      "mealNumber": number (order in the day)
    }
  ]
}

Ensure each day has exactly ${request.mealsPerDay} meals and the total calories per day matches the target ${request.calorieTarget} calories.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
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
      if (!meal.meal || !meal.food || !Array.isArray(meal.ingredients) || 
          !Array.isArray(meal.instructions) || typeof meal.calories !== 'number' || 
          typeof meal.protein !== 'number' || typeof meal.carbs !== 'number' || 
          typeof meal.fats !== 'number' || 
          typeof meal.dayNumber !== 'number' || typeof meal.mealNumber !== 'number') {
        throw new Error(`Invalid meal data at index ${index}`);
      }
    });

    return result.meals as MealDetails[];
  } catch (error) {
    logError('Error generating meal plan:', { error });
    throw new Error("Failed to generate meal plan");
  }
}