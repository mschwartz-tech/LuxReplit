import { Router } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';

const router = Router();

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI();

const predictExerciseSchema = z.object({
  exerciseName: z.string().min(3),
});

router.post('/api/exercises/predict-details', async (req, res) => {
  try {
    const { exerciseName } = predictExerciseSchema.parse(req.body);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional fitness expert. For the given exercise name, provide a detailed response in JSON format with:
1. A clear, concise description including proper form instructions (max 300 characters)
2. Difficulty level (beginner/intermediate/advanced)

Output format must be JSON with exactly these fields:
{
  "description": "string (max 300 chars)",
  "difficulty": "beginner" | "intermediate" | "advanced"
}`
        },
        {
          role: "user",
          content: `Generate exercise details for: ${exerciseName}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Validate and sanitize the response
    if (!result.description || !result.difficulty) {
      throw new Error('Invalid AI response format');
    }

    // Ensure description length is within limits
    const description = result.description.substring(0, 300);

    // Validate difficulty
    const difficulty = ['beginner', 'intermediate', 'advanced'].includes(result.difficulty) 
      ? result.difficulty 
      : 'beginner';

    res.json({
      description,
      difficulty
    });
  } catch (error) {
    console.error('Error predicting exercise details:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to predict exercise details' 
    });
  }
});

export default router;