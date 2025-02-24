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

    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      logError('Received HTML content instead of JSON', { content: content.substring(0, 200) });
      throw new Error('Invalid API response format');
    }

    if (!content || content.trim() === '') {
      logError('Empty content received from OpenAI');
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);
    logInfo('Parsed OpenAI response:', { parsed });

    // Validate required fields
    const requiredFields = {
      description: { type: 'string', maxLength: 100 },
      primaryMuscleGroupId: { type: 'number', min: 1, max: 15 },
      secondaryMuscleGroupIds: { type: 'array', itemType: 'number', min: 1, max: 15 },
      difficulty: { type: 'string', values: ['beginner', 'intermediate', 'advanced'] },
      instructions: { type: 'array', itemType: 'string', minLength: 1 }
    };

    for (const [field, rules] of Object.entries(requiredFields)) {
      if (!parsed[field]) {
        throw new Error(`Missing ${field} in response`);
      }

      if (rules.type === 'string' && typeof parsed[field] !== 'string') {
        throw new Error(`${field} must be a string`);
      }

      if (rules.type === 'number' && typeof parsed[field] !== 'number') {
        throw new Error(`${field} must be a number`);
      }

      if (rules.maxLength && parsed[field].length > rules.maxLength) {
        throw new Error(`${field} exceeds ${rules.maxLength} characters limit`);
      }

      if (rules.type === 'array') {
        if (!Array.isArray(parsed[field])) {
          throw new Error(`${field} must be an array`);
        }
        if (field === 'secondaryMuscleGroupIds') {
          if (!parsed[field].every((id: number) => 
            typeof id === 'number' && id >= rules.min && id <= rules.max && id !== parsed.primaryMuscleGroupId
          )) {
            throw new Error(`Invalid ${field}: must be unique numbers between ${rules.min} and ${rules.max}, excluding primaryMuscleGroupId`);
          }
        }
        if (field === 'instructions') {
          if (parsed[field].length < rules.minLength) {
            throw new Error(`${field} must have at least ${rules.minLength} item`);
          }
          if (!parsed[field].every((item: any) => typeof item === 'string' && item.trim())) {
            throw new Error(`${field} must contain non-empty strings`);
          }
        }
      }
    }

    return parsed;
  } catch (error) {
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
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional fitness trainer. Analyze exercises and return ONLY a JSON object with this format:
{
  "description": "Brief description under 100 chars",
  "primaryMuscleGroupId": (number 1-15),
  "secondaryMuscleGroupIds": [array of numbers 1-15],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "instructions": ["Step 1", "Step 2", "Step 3", ...]
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
- primaryMuscleGroupId must be different from secondaryMuscleGroupIds
- instructions should be clear, numbered steps`
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