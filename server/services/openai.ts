import OpenAI from "openai";
import { logError } from './logger';

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExerciseAIResponse {
  description: string;
  primaryMuscleGroupId: number;
  secondaryMuscleGroupIds: number[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

export async function generateExerciseDetails(exerciseName: string): Promise<ExerciseAIResponse> {
  try {
    console.log('Generating exercise details for:', exerciseName);

    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: `You are a professional fitness trainer providing concise, mobile-friendly exercise information. Format your response as JSON with:
1. A brief description (max 100 characters, focus on primary movement)
2. Primary muscle group ID (1-15)
3. Secondary muscle group IDs (1-15)
4. Difficulty level

Available muscle groups:
1. Quadriceps  2. Hamstrings  3. Calves  4. Chest  5. Back
6. Shoulders   7. Biceps      8. Triceps  9. Forearms  10. Abs
11. Obliques   12. Lower Back 13. Glutes  14. Hip Flexors  15. Traps`
        },
        {
          role: "user",
          content: `Analyze this exercise: ${exerciseName}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 150
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log('OpenAI response:', result);

    // Validate response format
    if (
      !result.description ||
      !result.primaryMuscleGroupId ||
      !Array.isArray(result.secondaryMuscleGroupIds) ||
      !result.difficulty ||
      typeof result.description !== 'string' ||
      result.primaryMuscleGroupId < 1 ||
      result.primaryMuscleGroupId > 15 ||
      result.secondaryMuscleGroupIds.some((id: number) => id < 1 || id > 15) ||
      !["beginner", "intermediate", "advanced"].includes(result.difficulty)
    ) {
      console.error('Invalid AI response format:', result);
      throw new Error("Invalid AI response format");
    }

    return result;
  } catch (error) {
    console.error('Error in generateExerciseDetails:', error);
    logError("Error generating exercise details:", error);
    throw new Error("Failed to generate exercise details");
  }
}