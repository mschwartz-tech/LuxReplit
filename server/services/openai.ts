import OpenAI from "openai";
import { logError } from './logger';

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateMovementPatternDescription(exerciseName: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview", 
      messages: [
        {
          role: "system",
          content: "You are a fitness expert providing concise, mobile-friendly exercise instructions. Focus on 3 key aspects:\n1. Primary movement (1 short sentence)\n2. Form cues (2-3 bullet points)\n3. Key muscles engaged (comma-separated list)\n\nKeep the entire response under 100 words and use simple, clear language."
        },
        {
          role: "user",
          content: `Generate a mobile-friendly movement pattern description for: ${exerciseName}`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
      response_format: { type: "text" }
    });

    return response.choices[0].message.content || "Movement pattern description unavailable.";
  } catch (error) {
    logError("Error generating movement pattern description:", error);
    throw new Error("Failed to generate movement pattern description");
  }
}

export async function predictMuscleGroups(exerciseName: string): Promise<{
  primaryMuscleGroupId: number;
  secondaryMuscleGroupIds: number[];
  difficulty: "beginner" | "intermediate" | "advanced";
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: `You are a professional trainer with expertise in exercise biomechanics. Analyze exercises and determine their primary and secondary muscle groups, and difficulty level.
Primary muscle groups (IDs):
1. Quadriceps, 2. Hamstrings, 3. Calves, 4. Chest, 5. Back, 6. Shoulders, 
7. Biceps, 8. Triceps, 9. Core, 10. Glutes

Respond in JSON format with:
{
  "primaryMuscleGroupId": number (1-10),
  "secondaryMuscleGroupIds": number[] (1-10, exclude primary),
  "difficulty": "beginner" | "intermediate" | "advanced"
}`
        },
        {
          role: "user",
          content: `Analyze the primary and secondary muscle groups and difficulty level for this exercise: ${exerciseName}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 150
    });

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content || "{}");
    } catch (parseError) {
      logError("Error parsing OpenAI response:", {
        error: parseError,
        response: response.choices[0].message.content
      });
      throw new Error("Invalid API response format");
    }

    // Validate the response
    if (
      !result.primaryMuscleGroupId ||
      !Array.isArray(result.secondaryMuscleGroupIds) ||
      !result.difficulty ||
      result.primaryMuscleGroupId < 1 ||
      result.primaryMuscleGroupId > 10 ||
      result.secondaryMuscleGroupIds.some((id: number) => id < 1 || id > 10) ||
      !["beginner", "intermediate", "advanced"].includes(result.difficulty)
    ) {
      logError("Invalid prediction format", { result });
      throw new Error("Invalid prediction format");
    }

    return result;
  } catch (error) {
    logError("Error predicting muscle groups and difficulty:", error);
    throw new Error("Failed to predict muscle groups and difficulty");
  }
}