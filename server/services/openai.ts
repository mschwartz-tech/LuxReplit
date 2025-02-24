import OpenAI from "openai";
import { logError, logInfo } from './logger';

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
      logError('Received HTML content instead of JSON', { content: content.substring(0, 200) });
      throw new Error('Invalid API response format');
    }

    // Check for empty or malformed content
    if (!content || content.trim() === '') {
      logError('Empty content received from OpenAI');
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);
    logInfo('Parsed OpenAI response:', { parsed });

    // Validate required fields with specific error messages
    if (!parsed.description) {
      throw new Error('Missing description in response');
    }
    if (typeof parsed.description !== 'string') {
      throw new Error('Description must be a string');
    }
    if (parsed.description.length > 100) {
      throw new Error('Description exceeds 100 characters limit');
    }

    if (!parsed.primaryMuscleGroupId) {
      throw new Error('Missing primaryMuscleGroupId in response');
    }
    if (typeof parsed.primaryMuscleGroupId !== 'number') {
      throw new Error('primaryMuscleGroupId must be a number');
    }
    if (parsed.primaryMuscleGroupId < 1 || parsed.primaryMuscleGroupId > 15) {
      throw new Error('primaryMuscleGroupId must be between 1 and 15');
    }

    if (!Array.isArray(parsed.secondaryMuscleGroupIds)) {
      throw new Error('secondaryMuscleGroupIds must be an array');
    }
    if (!parsed.secondaryMuscleGroupIds.every((id: number) => 
      typeof id === 'number' && id >= 1 && id <= 15 && id !== parsed.primaryMuscleGroupId
    )) {
      throw new Error('Invalid secondaryMuscleGroupIds: must be unique numbers between 1 and 15, excluding primaryMuscleGroupId');
    }

    if (!parsed.difficulty) {
      throw new Error('Missing difficulty in response');
    }
    if (!['beginner', 'intermediate', 'advanced'].includes(parsed.difficulty)) {
      throw new Error('Invalid difficulty: must be beginner, intermediate, or advanced');
    }

    return parsed;
  } catch (error) {
    // Enhanced error logging with more context
    logError('Failed to parse OpenAI response:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      rawContent: content,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    throw new Error('Failed to process AI response: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function generateExerciseDetails(exerciseName: string): Promise<ExerciseAIResponse> {
  try {
    if (!exerciseName || exerciseName.trim().length < 3) {
      throw new Error('Exercise name must be at least 3 characters long');
    }

    logInfo('Generating exercise details for:', { exerciseName, timestamp: new Date().toISOString() });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Latest model as of May 13, 2024
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
- Return ONLY the JSON object, no additional text
- Use exact field names
- difficulty must be lowercase
- description should be concise
- primaryMuscleGroupId must be different from secondaryMuscleGroupIds`
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
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString()
    });

    if (!response.choices[0].message.content) {
      throw new Error('Empty response from OpenAI');
    }

    return validateOpenAIResponse(response.choices[0].message.content);
  } catch (error) {
    if (error instanceof Error) {
      // Check for specific OpenAI API errors
      if (error.message.includes('API key')) {
        throw new Error('Invalid or missing API key. Please check your configuration.');
      }
      if (error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      }
      if (error.message.includes('timeout')) {
        throw new Error('Request timed out. Please try again.');
      }
    }

    logError('Error in generateExerciseDetails:', {
      error: error instanceof Error ? error.message : String(error),
      exerciseName,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}