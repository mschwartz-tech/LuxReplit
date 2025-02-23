import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MealPlanGenerationRequest {
  dietaryPreferences?: string[];
  calorieTarget?: number;
  mealsPerDay?: number;
  daysInPlan?: number;
  allergies?: string[];
  fitnessGoals?: string[];
}

interface MealDetails {
  meal: string;
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export async function generateMealPlan(request: MealPlanGenerationRequest) {
  const prompt = `Generate a detailed meal plan based on the following requirements:
- Dietary preferences: ${request.dietaryPreferences?.join(', ') || 'None specified'}
- Daily calorie target: ${request.calorieTarget || 2000}
- Meals per day: ${request.mealsPerDay || 3}
- Days in plan: ${request.daysInPlan || 1}
- Allergies to avoid: ${request.allergies?.join(', ') || 'None specified'}
- Fitness goals: ${request.fitnessGoals?.join(', ') || 'General health'}

For each meal, provide:
1. Meal name (e.g., Breakfast, Lunch, Dinner, Snack)
2. Food items with portions
3. Nutritional breakdown (calories, protein, carbs, fats)

Provide the response in JSON format with the following structure:
{
  "meals": [
    {
      "meal": string,
      "food": string,
      "calories": number,
      "protein": number,
      "carbs": number,
      "fats": number
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional nutritionist and meal planning expert."
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
    return result.meals as MealDetails[];
  } catch (error) {
    console.error("Error generating meal plan:", error);
    throw new Error("Failed to generate meal plan");
  }
}