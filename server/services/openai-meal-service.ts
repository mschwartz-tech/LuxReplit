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
  const prompt = `As a professional nutritionist, create a detailed 7-day meal plan following these requirements:

KEY REQUIREMENTS:
- Food preferences and style: ${request.foodPreferences}
- Daily calorie target: ${request.calorieTarget} calories
- Meals per day: ${request.mealsPerDay}
- Dietary restrictions: ${request.dietaryRestrictions?.join(', ') || 'None specified'}
- Fitness goals: ${request.fitnessGoals?.join(', ') || 'General health'}
- Macro split: Protein ${request.macroDistribution?.protein || 30}%, Carbs ${request.macroDistribution?.carbs || 40}%, Fats ${request.macroDistribution?.fats || 30}%
- Cooking expertise: ${request.cookingSkillLevel}
- Maximum prep time: ${request.maxPrepTime}

REQUIRED OUTPUT FORMAT:
Provide a complete 7-day meal plan with ${request.mealsPerDay} meals per day. For each meal include:
1. Meal type (Breakfast/Lunch/Dinner/Snack)
2. Main dish name and brief description
3. Detailed ingredients list with precise measurements
4. Step-by-step cooking instructions
5. Complete nutritional information

Structure your response as a JSON with this format:
{
  "meals": [
    {
      "meal": "string (meal type)",
      "food": "string (dish name and description)",
      "ingredients": [{"item": "string", "amount": "string", "unit": "string"}],
      "instructions": ["string"],
      "calories": number,
      "protein": number,
      "carbs": number,
      "fats": number,
      "dayNumber": number,
      "mealNumber": number
    }
  ]
}`;

  try {
    // Log the request parameters
    console.log('Generating meal plan with parameters:', {
      calorieTarget: request.calorieTarget,
      mealsPerDay: request.mealsPerDay,
      cookingSkillLevel: request.cookingSkillLevel,
      maxPrepTime: request.maxPrepTime
    });

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
      temperature: 0.7,
      max_tokens: 4000
    });

    if (!response.choices[0].message.content) {
      logError('Empty response from OpenAI', { response });
      throw new Error("No content in OpenAI response");
    }

    console.log('Raw OpenAI response:', response.choices[0].message.content);

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content);
    } catch (error) {
      logError('Failed to parse OpenAI response:', { 
        error, 
        content: response.choices[0].message.content,
        parseError: error instanceof Error ? error.message : 'Unknown parsing error'
      });
      throw new Error("Invalid JSON response from OpenAI");
    }

    // Validate response structure
    if (!result.meals || !Array.isArray(result.meals)) {
      logError('Invalid response structure:', { 
        result,
        hasMeals: !!result.meals,
        isArray: Array.isArray(result.meals)
      });
      throw new Error("Invalid response format from OpenAI");
    }

    // Validate we have the correct number of meals
    const expectedTotalMeals = 7 * request.mealsPerDay;
    if (result.meals.length !== expectedTotalMeals) {
      logError('Incorrect number of meals:', { 
        expected: expectedTotalMeals, 
        received: result.meals.length,
        meals: result.meals 
      });
      throw new Error(`Expected ${expectedTotalMeals} meals but got ${result.meals.length}`);
    }

    // Track daily calories to ensure they match the target
    const dailyCalories: { [key: number]: number } = {};

    // Validate each meal has required properties and structure
    result.meals.forEach((meal: any, index: number) => {
      try {
        // Validate basic meal structure
        if (!meal.meal || !meal.food || !Array.isArray(meal.ingredients) || 
            !Array.isArray(meal.instructions) || typeof meal.calories !== 'number' || 
            typeof meal.protein !== 'number' || typeof meal.carbs !== 'number' || 
            typeof meal.fats !== 'number' || 
            typeof meal.dayNumber !== 'number' || typeof meal.mealNumber !== 'number') {
          logError('Invalid meal structure:', { 
            meal,
            index,
            validation: {
              hasMeal: !!meal.meal,
              hasFood: !!meal.food,
              hasIngredients: Array.isArray(meal.ingredients),
              hasInstructions: Array.isArray(meal.instructions),
              hasValidNutrition: typeof meal.calories === 'number' && 
                                typeof meal.protein === 'number' && 
                                typeof meal.carbs === 'number' && 
                                typeof meal.fats === 'number'
            }
          });
          throw new Error(`Invalid meal data at index ${index}`);
        }

        // Validate day and meal numbers
        if (meal.dayNumber < 1 || meal.dayNumber > 7) {
          logError('Invalid day number:', { meal, index });
          throw new Error(`Invalid day number ${meal.dayNumber} at index ${index}`);
        }
        if (meal.mealNumber < 1 || meal.mealNumber > request.mealsPerDay) {
          logError('Invalid meal number:', { meal, index });
          throw new Error(`Invalid meal number ${meal.mealNumber} at index ${index}`);
        }

        // Track daily calories
        dailyCalories[meal.dayNumber] = (dailyCalories[meal.dayNumber] || 0) + meal.calories;

        // Validate ingredients
        meal.ingredients.forEach((ingredient: any, ingIndex: number) => {
          if (!ingredient.item || !ingredient.amount || !ingredient.unit) {
            logError('Invalid ingredient:', { 
              ingredient, 
              mealIndex: index, 
              ingredientIndex: ingIndex 
            });
            throw new Error(`Invalid ingredient at meal ${index}, ingredient ${ingIndex}`);
          }
        });

        // Validate instructions
        if (meal.instructions.length === 0) {
          logError('Missing cooking instructions:', { meal, index });
          throw new Error(`No cooking instructions provided for meal at index ${index}`);
        }
      } catch (error) {
        logError('Meal validation error:', {
          error,
          meal,
          index
        });
        throw error;
      }
    });

    // Validate daily calorie totals
    Object.entries(dailyCalories).forEach(([day, calories]) => {
      const deviation = Math.abs(calories - request.calorieTarget);
      const maxDeviation = request.calorieTarget * 0.1; // Allow 10% deviation
      if (deviation > maxDeviation) {
        logError('Daily calorie target mismatch:', { 
          day, 
          targetCalories: request.calorieTarget,
          actualCalories: calories,
          deviation 
        });
        throw new Error(`Day ${day} calorie total (${calories}) deviates too much from target (${request.calorieTarget})`);
      }
    });

    // Log successful generation
    console.log('Successfully generated meal plan:', {
      totalMeals: result.meals.length,
      daysGenerated: Object.keys(dailyCalories).length,
      dailyCalories
    });

    return result.meals as MealDetails[];
  } catch (error) {
    logError('Error generating meal plan:', { 
      error,
      request: {
        ...request,
        foodPreferences: request.foodPreferences.substring(0, 100) + '...' // Truncate for logging
      }
    });
    throw new Error(error instanceof Error ? error.message : "Failed to generate meal plan");
  }
}