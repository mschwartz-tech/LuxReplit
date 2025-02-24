import { Router } from 'express';
import { z } from 'zod';
import { generateExerciseDetails } from '../services/openai';
import { logError, logInfo } from '../services/logger';
import { openai } from '../services/openai';

const router = Router();

const predictExerciseSchema = z.object({
  exerciseName: z.string().min(3).max(100),
});

// Helper function to handle API errors
const handleApiError = (error: unknown, context: string) => {
  // Log detailed error information
  logError(`${context} error:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString()
  });

  if (error instanceof z.ZodError) {
    return { 
      status: 400, 
      message: 'Invalid request data: ' + error.errors[0].message 
    };
  }

  if (error instanceof Error) {
    // Check for specific OpenAI API errors
    if (error.message.includes('API key')) {
      return { status: 401, message: 'Authentication failed with AI service' };
    }
    if (error.message.includes('rate limit')) {
      return { status: 429, message: 'Too many requests. Please try again later' };
    }
    if (error.message.includes('timeout')) {
      return { status: 504, message: 'Request timed out. Please try again' };
    }
    if (error.message.includes('Invalid API response format')) {
      return { status: 502, message: 'Received invalid response from AI service' };
    }
  }

  return { 
    status: 500, 
    message: error instanceof Error ? error.message : 'An unexpected error occurred'
  };
};

// Endpoint for analyzing exercises with OpenAI
router.post('/api/exercises/analyze', async (req, res) => {
  try {
    // Set JSON content type
    res.setHeader('Content-Type', 'application/json');

    // Log incoming request
    logInfo('Received analyze request:', { 
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });

    const { exerciseName } = predictExerciseSchema.parse(req.body);

    // Verify OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const result = await generateExerciseDetails(exerciseName);

    // Log successful response
    logInfo('Generated exercise details:', { 
      result,
      timestamp: new Date().toISOString()
    });

    return res.json(result);
  } catch (error) {
    const { status, message } = handleApiError(error, 'analyze');
    return res.status(status).json({ message });
  }
});

export default router;