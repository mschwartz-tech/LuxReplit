import { Router } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';

const router = Router();

const openai = new OpenAI();

const predictExerciseSchema = z.object({
  exerciseName: z.string().min(3),
});

// Separate endpoint for predicting exercise description
router.post('/api/exercises/predict-description', async (req, res) => {
  try {
    const { exerciseName } = predictExerciseSchema.parse(req.body);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a professional fitness expert. For the given exercise name, provide a detailed response in JSON format with:
1. A concise 50-word description of the exercise
2. Difficulty level (beginner/intermediate/advanced)
3. Primary muscle group ID (1-15) and secondary muscle group IDs based on this mapping:
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
  "difficulty": "intermediate",
  "primaryMuscleGroupId": 1,
  "secondaryMuscleGroupIds": [2, 13]
}`
        },
        {
          role: "user",
          content: `Generate exercise description for: ${exerciseName}`
        }
      ],
      response_format: { type: "json_object" },
    });

    if (!response.choices[0].message.content) {
      throw new Error('No content in OpenAI response');
    }

    const result = JSON.parse(response.choices[0].message.content);

    // Validate response
    if (!result.description || !result.difficulty || !result.primaryMuscleGroupId || !result.secondaryMuscleGroupIds) {
      throw new Error('Invalid AI response format');
    }

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

    res.json({
      description: result.description,
      difficulty,
      primaryMuscleGroupId,
      secondaryMuscleGroupIds
    });
  } catch (error) {
    console.error('Error predicting exercise description:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to predict exercise description' 
    });
  }
});

// Separate endpoint for predicting exercise instructions
router.post('/api/exercises/predict-instructions', async (req, res) => {
  try {
    const { exerciseName } = predictExerciseSchema.parse(req.body);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a professional fitness expert. For the given exercise name, provide detailed step-by-step instructions in JSON format with:
1. 3-6 numbered steps for performing the exercise
2. Each step should be clear, concise, and focus on proper form

Example response format:
{
  "instructions": [
    "Start in a standing position with feet hip-width apart",
    "Bend at knees and hips to lower into a squat position",
    "Keep chest up and core engaged throughout the movement",
    "Push through heels to return to starting position"
  ]
}`
        },
        {
          role: "user",
          content: `Generate step-by-step instructions for: ${exerciseName}`
        }
      ],
      response_format: { type: "json_object" },
    });

    if (!response.choices[0].message.content) {
      throw new Error('No content in OpenAI response');
    }

    const result = JSON.parse(response.choices[0].message.content);

    // Validate and sanitize the response
    if (!result.instructions || !Array.isArray(result.instructions)) {
      throw new Error('Invalid AI response format');
    }

    // Ensure instructions is an array and each instruction is properly formatted
    const instructions = result.instructions
      .map(instruction => instruction.trim())
      .filter(Boolean)
      .map(instruction => instruction.replace(/^\d+\.\s*/, '')); // Remove any existing numbers

    res.json({ instructions });
  } catch (error) {
    console.error('Error predicting exercise instructions:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to predict exercise instructions' 
    });
  }
});

export default router;