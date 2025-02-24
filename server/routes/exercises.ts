import { Router } from 'express';
import { z } from 'zod';
import { generateExerciseDetails } from '../services/openai';
import { logError, logInfo } from '../services/logger';

const router = Router();

const predictExerciseSchema = z.object({
  exerciseName: z.string().min(3).max(100),
});

// Helper function to handle API errors
const handleApiError = (error: unknown, context: string) => {
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

router.post('/exercise-ai/analyze', async (req, res) => {
  try {
    logInfo('Exercise analysis request:', {
      headers: req.headers,
      body: req.body,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Custom-Route', 'api');
    res.setHeader('Pragma', 'no-cache');

    const { exerciseName } = predictExerciseSchema.parse(req.body);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const result = await generateExerciseDetails(exerciseName);

    logInfo('Exercise analysis success:', { 
      result,
      timestamp: new Date().toISOString()
    });

    return res.json(result);
  } catch (error) {
    logError('Exercise analysis error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      request: {
        body: req.body,
        headers: req.headers,
        path: req.path
      },
      timestamp: new Date().toISOString()
    });

    const { status, message } = handleApiError(error, 'analyze');
    return res.status(status).json({ message });
  }
});

router.post('/api/debug/openai', async (req, res) => {
  try {
    logInfo('Debug endpoint request:', {
      headers: req.headers,
      body: req.body,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');

    const { exerciseName } = predictExerciseSchema.parse(req.body);

    logInfo('Initiating OpenAI API call:', {
      exerciseName,
      timestamp: new Date().toISOString()
    });

    const rawResponse = await generateExerciseDetails(exerciseName);

    logInfo('Raw OpenAI API response:', {
      response: rawResponse,
      timestamp: new Date().toISOString()
    });

    return res.json(rawResponse);
  } catch (error) {
    logError('Debug endpoint error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      request: {
        body: req.body,
        headers: req.headers,
        path: req.path
      },
      timestamp: new Date().toISOString()
    });

    const { status, message } = handleApiError(error, 'debug');
    return res.status(status).json({ message });
  }
});

export default router;