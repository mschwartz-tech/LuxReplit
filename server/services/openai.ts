import OpenAI from "openai";
import { logError, logInfo } from './logger';

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

// Helper function to validate OpenAI response
function validateOpenAIResponse(content: string): ExerciseAIResponse {
  try {
    // Log the raw content for debugging
    logInfo('Raw OpenAI response:', { content });

    // Check for HTML content
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      throw new Error('Received HTML instead of JSON response');
    }

    const parsed = JSON.parse(content);
    logInfo('Parsed OpenAI response:', { parsed });

    // Validate required fields
    if (!parsed.description || typeof parsed.description !== 'string') {
      throw new Error('Invalid description in response');
    }
    if (!parsed.primaryMuscleGroupId || typeof parsed.primaryMuscleGroupId !== 'number') {
      throw new Error('Invalid primaryMuscleGroupId in response');
    }
    if (!Array.isArray(parsed.secondaryMuscleGroupIds)) {
      throw new Error('Invalid secondaryMuscleGroupIds in response');
    }
    if (!parsed.difficulty || !['beginner', 'intermediate', 'advanced'].includes(parsed.difficulty)) {
      throw new Error('Invalid difficulty in response');
    }

    return parsed;
  } catch (error) {
    // Enhanced error logging
    logError('Failed to parse OpenAI response:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      rawContent: content,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Failed to parse OpenAI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateExerciseDetails(exerciseName: string): Promise<ExerciseAIResponse> {
  try {
    logInfo('Generating exercise details for:', { exerciseName });

    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: `You are a professional fitness trainer. Analyze exercises and return ONLY a JSON object with this format:
{
  "description": "Brief description under 100 chars",
  "primaryMuscleGroupId": (number 1-15),
  "secondaryMuscleGroupIds": [array of numbers 1-15],
  "difficulty": "beginner" | "intermediate" | "advanced"
}

Available muscle groups:
1. Quadriceps  2. Hamstrings  3. Calves  4. Chest  5. Back
6. Shoulders   7. Biceps      8. Triceps  9. Forearms  10. Abs
11. Obliques   12. Lower Back 13. Glutes  14. Hip Flexors  15. Traps

IMPORTANT: 
- Return ONLY the JSON object, no additional text or formatting
- Use exact field names (primaryMuscleGroupId not primaryMuscleGroupID)
- difficulty must be lowercase without "level" suffix
- description should be mobile-friendly and concise`
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

    logInfo('OpenAI API response received:', {
      status: response.choices[0].finish_reason,
      model: response.model
    });

    if (!response.choices[0].message.content) {
      throw new Error('Empty response from OpenAI');
    }

    return validateOpenAIResponse(response.choices[0].message.content);
  } catch (error) {
    logError('Error in generateExerciseDetails:', {
      error: error instanceof Error ? error.message : String(error),
      exerciseName
    });
    throw error;
  }
}