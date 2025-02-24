import { Router } from 'express';
import { z } from 'zod';
import { generateExerciseDetails } from '../services/openai';
import { logError, logInfo } from '../services/logger';
import { openai } from '../services/openai';

const router = Router();

const predictExerciseSchema = z.object({
  exerciseName: z.string().min(3),
});

// Helper function to handle API errors
const handleApiError = (error: unknown, context: string) => {
  console.error(`Error in ${context}:`, error);

  // Log detailed error information
  logError(`${context} error:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context
  });

  if (error instanceof z.ZodError) {
    return { status: 400, message: 'Invalid request data: ' + error.errors[0].message };
  }

  if (error instanceof Error && error.message.includes('Failed to parse OpenAI response')) {
    return { status: 500, message: 'Invalid response format from AI service. Please try again.' };
  }

  return { 
    status: 500, 
    message: error instanceof Error ? error.message : 'An unexpected error occurred'
  };
};

// Endpoint for predicting exercise description
router.post('/api/exercises/predict-description', async (req, res) => {
  try {
    logInfo('Received predict-description request:', { body: req.body });

    const { exerciseName } = predictExerciseSchema.parse(req.body);
    const result = await generateExerciseDetails(exerciseName);

    logInfo('Generated exercise details:', { result });

    res.json(result);
  } catch (error) {
    const { status, message } = handleApiError(error, 'predict-description');
    res.status(status).json({ message });
  }
});

// Endpoint for predicting exercise instructions
router.post('/api/exercises/predict-instructions', async (req, res) => {
  try {
    logInfo('Received predict-instructions request:', { body: req.body });

    const { exerciseName } = predictExerciseSchema.parse(req.body);

    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: `You are a professional fitness trainer. For the given exercise, return ONLY a JSON object with this format:
{
  "instructions": ["Step 1 description", "Step 2 description", ...]
}

IMPORTANT: Return ONLY the JSON object, no additional text or formatting.`
        },
        {
          role: "user",
          content: `Generate step-by-step instructions for: ${exerciseName}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 250
    });

    logInfo('Raw instructions response:', { content: response.choices[0].message.content });

    if (!response.choices[0].message.content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse and validate response
    let result;
    try {
      const content = response.choices[0].message.content;

      // Check for HTML content
      if (content.includes('<!DOCTYPE') || content.includes('<html')) {
        throw new Error('Received HTML instead of JSON response');
      }

      result = JSON.parse(content);
      logInfo('Parsed instructions:', { result });

      if (!result.instructions || !Array.isArray(result.instructions)) {
        throw new Error('Invalid response format: instructions must be an array');
      }
    } catch (parseError) {
      logError('Failed to parse instructions response:', { 
        error: parseError instanceof Error ? parseError.message : String(parseError),
        content: response.choices[0].message.content 
      });
      throw new Error('Invalid response format from AI service');
    }

    const instructions = result.instructions
      .map((instruction: string) => instruction.trim())
      .filter(Boolean);

    res.json({ instructions });
  } catch (error) {
    const { status, message } = handleApiError(error, 'predict-instructions');
    res.status(status).json({ message });
  }
});

export default router;