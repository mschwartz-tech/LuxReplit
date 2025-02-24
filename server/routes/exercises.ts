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
          content: "You are a professional fitness expert. Provide a concise exercise description and instructions. Keep the total response within 300 characters. Focus on proper form and execution. Do not mention muscle groups."
        },
        {
          role: "user",
          content: `Generate a description and instructions for: ${exerciseName}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Ensure description length is within limits
    const description = result.description?.substring(0, 300) || '';

    res.json({
      description,
      difficulty: result.difficulty || 'beginner'
    });
  } catch (error) {
    console.error('Error predicting exercise details:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to predict exercise details' 
    });
  }
});

export default router;
