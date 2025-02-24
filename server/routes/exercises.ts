import { Router } from 'express';
import { z } from 'zod';
import { generateExerciseDetails } from '../services/openai';
import { logError, logInfo } from '../services/logger';
import { db } from '../db';
import { exercises } from '@shared/schema';

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
      error: 'Invalid request data',
      details: error.errors
    };
  }

  if (error instanceof Error) {
    if (error.message.includes('API key')) {
      return { status: 401, error: 'Authentication failed with AI service' };
    }
    if (error.message.includes('rate limit')) {
      return { status: 429, error: 'Too many requests. Please try again later' };
    }
    if (error.message.includes('timeout')) {
      return { status: 504, error: 'Request timed out. Please try again' };
    }
    if (error.message.includes('Invalid API response format')) {
      return { status: 502, error: 'Received invalid response from AI service' };
    }
    return { status: 500, error: error.message };
  }

  return { 
    status: 500, 
    error: 'An unexpected error occurred'
  };
};

router.post('/exercises', async (req, res) => {
  try {
    logInfo('Creating new exercise:', {
      body: req.body,
      timestamp: new Date().toISOString()
    });

    const result = await db.insert(exercises).values(req.body).returning();
    return res.json(result[0]);
  } catch (error) {
    const { status, error: errorMessage } = handleApiError(error, 'create-exercise');
    return res.status(status).json({ error: errorMessage });
  }
});

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
    const { status, error: errorMessage } = handleApiError(error, 'analyze');
    return res.status(status).json({ error: errorMessage });
  }
});

router.get('/exercises', async (req, res) => {
  try {
    const allExercises = await db.select().from(exercises);
    return res.json(allExercises);
  } catch (error) {
    const { status, error: errorMessage } = handleApiError(error, 'get-exercises');
    return res.status(status).json({ error: errorMessage });
  }
});

export default router;