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

// Endpoint for predicting exercise description
router.post('/api/exercises/predict-description', async (req, res) => {
  try {
    // Set JSON content type
    res.setHeader('Content-Type', 'application/json');

    // Log incoming request
    logInfo('Received predict-description request:', { 
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
    const { status, message } = handleApiError(error, 'predict-description');
    return res.status(status).json({ message });
  }
});

// Endpoint for predicting exercise instructions
router.post('/api/exercises/predict-instructions', async (req, res) => {
  try {
    // Set JSON content type
    res.setHeader('Content-Type', 'application/json');

    // Log incoming request
    logInfo('Received predict-instructions request:', { 
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });

    const { exerciseName } = predictExerciseSchema.parse(req.body);

    // Verify OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [
        {
          role: "system",
          content: `You are a professional fitness trainer. For the given exercise, return ONLY a JSON object with this format:
{
  "instructions": ["Step 1 description", "Step 2 description", ...]
}

IMPORTANT: 
- Return ONLY the JSON object, no additional text
- Each instruction should be clear and concise
- Maximum 10 steps
- Focus on proper form and safety`
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

    // Log raw response
    logInfo('Raw instructions response:', { 
      content: response.choices[0].message.content,
      status: response.choices[0].finish_reason,
      model: response.model,
      timestamp: new Date().toISOString()
    });

    if (!response.choices[0].message.content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse and validate response
    let result;
    try {
      const content = response.choices[0].message.content;

      // Check for HTML content
      if (content.includes('<!DOCTYPE') || content.includes('<html')) {
        throw new Error('Invalid API response format');
      }

      result = JSON.parse(content);

      // Log parsed response
      logInfo('Parsed instructions:', { 
        result,
        timestamp: new Date().toISOString()
      });

      if (!result.instructions || !Array.isArray(result.instructions)) {
        throw new Error('Invalid response format: instructions must be an array');
      }

      if (result.instructions.length > 10) {
        result.instructions = result.instructions.slice(0, 10);
      }

      if (!result.instructions.every((instruction: string) => 
        typeof instruction === 'string' && instruction.trim().length > 0
      )) {
        throw new Error('Invalid instructions format: all instructions must be non-empty strings');
      }
    } catch (parseError) {
      logError('Failed to parse instructions response:', { 
        error: parseError instanceof Error ? parseError.message : String(parseError),
        content: response.choices[0].message.content,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to process AI response: ' + (parseError instanceof Error ? parseError.message : 'Unknown error'));
    }

    const instructions = result.instructions
      .map((instruction: string) => instruction.trim())
      .filter(Boolean);

    return res.json({ instructions });
  } catch (error) {
    const { status, message } = handleApiError(error, 'predict-instructions');
    return res.status(status).json({ message });
  }
});

export default router;