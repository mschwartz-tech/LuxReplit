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

function validateOpenAIResponse(content: string): ExerciseAIResponse {
  try {
    logInfo('Raw OpenAI response:', { content });

    if (!content || content.trim() === '') {
      throw new Error('Empty response from OpenAI');
    }

    // Check for HTML content
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      throw new Error('Invalid API response format: received HTML instead of JSON');
    }

    const parsed = JSON.parse(content);
    logInfo('Parsed OpenAI response:', { parsed });

    // Validate and format description
    if (!parsed.description || typeof parsed.description !== 'string') {
      throw new Error('Missing or invalid description');
    }
    parsed.description = parsed.description.slice(0, 100).trim();

    // Validate primary muscle group
    if (!Number.isInteger(parsed.primaryMuscleGroupId) || 
        parsed.primaryMuscleGroupId < 1 || 
        parsed.primaryMuscleGroupId > 15) {
      throw new Error('Invalid primaryMuscleGroupId: must be between 1 and 15');
    }

    // Validate and format secondary muscle groups
    if (!Array.isArray(parsed.secondaryMuscleGroupIds)) {
      throw new Error('secondaryMuscleGroupIds must be an array');
    }
    parsed.secondaryMuscleGroupIds = parsed.secondaryMuscleGroupIds
      .filter((id: number) => 
        Number.isInteger(id) && 
        id >= 1 && 
        id <= 15 && 
        id !== parsed.primaryMuscleGroupId
      )
      .slice(0, 5); // Limit to 5 secondary muscle groups

    // Validate difficulty
    if (!parsed.difficulty || !['beginner', 'intermediate', 'advanced'].includes(parsed.difficulty)) {
      throw new Error('Invalid difficulty: must be beginner, intermediate, or advanced');
    }

    // Validate and format instructions
    if (!Array.isArray(parsed.instructions)) {
      throw new Error('instructions must be an array');
    }
    parsed.instructions = parsed.instructions
      .filter((instruction: string) => typeof instruction === 'string' && instruction.trim())
      .map((instruction: string) => {
        const words = instruction.split(/\s+/);
        return words.slice(0, 20).join(' '); // Limit to 20 words per instruction
      })
      .slice(0, 10); // Limit to 10 instructions

    if (parsed.instructions.length === 0) {
      throw new Error('At least one instruction is required');
    }

    return parsed;
  } catch (error) {
    logError('Failed to parse OpenAI response:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      rawContent: content,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to process AI response: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function generateExerciseDetails(exerciseName: string): Promise<ExerciseAIResponse> {
  try {
    if (!exerciseName || exerciseName.trim().length < 3) {
      throw new Error('Exercise name must be at least 3 characters long');
    }

    logInfo('Generating exercise details for:', { exerciseName });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional fitness trainer. Analyze exercises and return ONLY a JSON object with exactly this format:
{
  "description": "Brief description under 100 chars",
  "primaryMuscleGroupId": (single number 1-15),
  "secondaryMuscleGroupIds": [up to 5 different numbers 1-15, excluding primary],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "instructions": ["Step 1", "Step 2", ..., "Step 10"] (1-10 steps)
}

Available muscle groups:
1. Quadriceps  2. Hamstrings  3. Calves  4. Chest  5. Back
6. Shoulders   7. Biceps      8. Triceps  9. Forearms  10. Abs
11. Obliques   12. Lower Back 13. Glutes  14. Hip Flexors  15. Traps

STRICT REQUIREMENTS: 
- Return ONLY the JSON object, no additional text
- Use exact field names as shown
- Description must be under 100 characters
- Instructions must be 1-10 clear, concise steps
- Each instruction step must be under 20 words
- Difficulty must be exactly "beginner", "intermediate", or "advanced"
- primaryMuscleGroupId must be a single number 1-15
- secondaryMuscleGroupIds must be an array of up to 5 different numbers 1-15, excluding the primary`
        },
        {
          role: "user",
          content: `Analyze this exercise: ${exerciseName}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500
    });

    if (!response.choices[0].message.content) {
      throw new Error('Empty response from OpenAI');
    }

    const validatedResponse = validateOpenAIResponse(response.choices[0].message.content);
    logInfo('Validated response:', { validatedResponse });
    return validatedResponse;

  } catch (error) {
    if (error instanceof Error) {
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
      exerciseName
    });
    throw error;
  }
}