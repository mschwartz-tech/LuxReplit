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
  instructions: string[];
}

export async function generateExerciseDetails(exerciseName: string): Promise<ExerciseAIResponse> {
  try {
    if (!exerciseName || exerciseName.trim().length < 3) {
      throw new Error('Exercise name must be at least 3 characters long');
    }

    const systemPrompt = `You are a professional fitness trainer. Your task is to analyze exercises and provide detailed information.
RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT (no additional text or explanations):
{
  "description": "Brief description under 100 chars",
  "primaryMuscleGroupId": number between 1-15,
  "secondaryMuscleGroupIds": array of up to 5 different numbers 1-15 (excluding primary),
  "difficulty": "beginner" OR "intermediate" OR "advanced",
  "instructions": array of strings (1-10 steps)
}

Available muscle groups by ID:
1. Quadriceps  2. Hamstrings  3. Calves  4. Chest  5. Back
6. Shoulders   7. Biceps      8. Triceps  9. Forearms  10. Abs
11. Obliques   12. Lower Back 13. Glutes  14. Hip Flexors  15. Traps`;

    logInfo('Generating exercise details for:', { exerciseName });

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Analyze this exercise and respond with ONLY the JSON object (no additional text): ${exerciseName}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    if (!response.choices[0].message.content) {
      throw new Error('Empty response from OpenAI');
    }

    const content = response.choices[0].message.content.trim();

    try {
      // Find the first occurrence of '{' and the last occurrence of '}'
      const startIdx = content.indexOf('{');
      const endIdx = content.lastIndexOf('}');

      if (startIdx === -1 || endIdx === -1) {
        throw new Error('Invalid JSON format in response');
      }

      // Extract only the JSON part
      const jsonStr = content.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr);

      // Format and validate the response
      const formatted: ExerciseAIResponse = {
        description: parsed.description?.slice(0, 100).trim() || '',
        primaryMuscleGroupId: Number(parsed.primaryMuscleGroupId),
        secondaryMuscleGroupIds: (parsed.secondaryMuscleGroupIds || [])
          .map(Number)
          .filter((id: number) => 
            Number.isInteger(id) && 
            id >= 1 && 
            id <= 15 && 
            id !== Number(parsed.primaryMuscleGroupId)
          )
          .slice(0, 5),
        difficulty: parsed.difficulty as "beginner" | "intermediate" | "advanced",
        instructions: (parsed.instructions || [])
          .filter((step: string) => typeof step === 'string' && step.trim())
          .map((step: string) => {
            const words = step.split(/\s+/);
            return words.slice(0, 20).join(' ');
          })
          .slice(0, 10)
      };

      // Validate required fields
      if (!formatted.description) {
        throw new Error('Missing description');
      }
      if (!Number.isInteger(formatted.primaryMuscleGroupId) || 
          formatted.primaryMuscleGroupId < 1 || 
          formatted.primaryMuscleGroupId > 15) {
        throw new Error('Invalid primaryMuscleGroupId');
      }
      if (!['beginner', 'intermediate', 'advanced'].includes(formatted.difficulty)) {
        throw new Error('Invalid difficulty level');
      }
      if (!formatted.instructions.length) {
        throw new Error('Instructions cannot be empty');
      }

      logInfo('Formatted exercise details:', { formatted });
      return formatted;

    } catch (parseError) {
      logError('Failed to parse OpenAI response:', { 
        error: parseError instanceof Error ? parseError.message : String(parseError),
        content
      });
      throw new Error('Failed to parse AI response: ' + (parseError instanceof Error ? parseError.message : 'Invalid response format'));
    }

  } catch (error) {
    logError('Error in generateExerciseDetails:', {
      error: error instanceof Error ? error.message : String(error),
      exerciseName
    });
    throw error;
  }
}