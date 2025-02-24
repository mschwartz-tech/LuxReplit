import { Router } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';

const router = Router();

const openai = new OpenAI();

const predictExerciseSchema = z.object({
  exerciseName: z.string().min(3),
});

router.post('/api/exercises/predict-details', async (req, res) => {
  try {
    const { exerciseName } = predictExerciseSchema.parse(req.body);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a professional fitness expert. For the given exercise name, provide a detailed response in JSON format with:
1. A concise 50-word description of the exercise
2. Step-by-step instructions (3-6 numbered steps, each step should be clear and concise)
3. Difficulty level (beginner/intermediate/advanced)
4. Primary muscle group ID (1-15) and secondary muscle group IDs based on this mapping:
   1: Quadriceps
   2: Hamstrings
   3: Calves
   4: Chest
   5: Back
   6: Shoulders
   7: Biceps
   8: Triceps
   9: Forearms
   10: Abs
   11: Obliques
   12: Lower Back
   13: Glutes
   14: Hip Flexors
   15: Traps

Example response format:
{
  "description": "A compound leg exercise that targets multiple muscle groups while improving balance and coordination.",
  "instructions": [
    "1. Stand with feet hip-width apart",
    "2. Step forward with right leg, lowering your body until both knees form 90-degree angles",
    "3. Push through front heel to return to starting position",
    "4. Alternate legs with each rep"
  ],
  "difficulty": "intermediate",
  "primaryMuscleGroupId": 1,
  "secondaryMuscleGroupIds": [2, 13]
}`
        },
        {
          role: "user",
          content: `Generate exercise details for: ${exerciseName}`
        }
      ],
      response_format: { type: "json_object" },
    });

    console.log('OpenAI response:', response.choices[0].message.content);
    if (!response.choices[0].message.content) {
      throw new Error('No content in OpenAI response');
    }

    const result = JSON.parse(response.choices[0].message.content);

    // Validate and sanitize the response
    if (!result.description || !result.instructions || !result.difficulty || 
        !result.primaryMuscleGroupId || !result.secondaryMuscleGroupIds) {
      throw new Error('Invalid AI response format');
    }

    // Ensure instructions is an array and each instruction starts with a number
    const instructions = Array.isArray(result.instructions) ? result.instructions : [result.instructions];

    // Validate muscle group IDs
    const primaryMuscleGroupId = Number(result.primaryMuscleGroupId);
    if (primaryMuscleGroupId < 1 || primaryMuscleGroupId > 15) {
      throw new Error('Invalid primary muscle group ID');
    }

    const secondaryMuscleGroupIds = result.secondaryMuscleGroupIds
      .map(Number)
      .filter((id: number) => id >= 1 && id <= 15 && id !== primaryMuscleGroupId);

    // Validate difficulty
    const difficulty = ['beginner', 'intermediate', 'advanced'].includes(result.difficulty) 
      ? result.difficulty 
      : 'beginner';

    const response_data = {
      description: result.description,
      instructions: instructions,
      difficulty,
      primaryMuscleGroupId,
      secondaryMuscleGroupIds
    };

    console.log('Sending response:', response_data);
    res.json(response_data);
  } catch (error) {
    console.error('Error predicting exercise details:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to predict exercise details' 
    });
  }
});

export default router;