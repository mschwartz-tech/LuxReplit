import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateMovementPatternDescription(exerciseName: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a professional personal trainer with expertise in exercise biomechanics. Generate descriptions that combine technical accuracy with practical, easy-to-understand instructions. Focus on: 1) Primary movement pattern in simple terms, 2) Key joints and muscles involved, 3) Basic form cues a trainer would give. Keep responses under 150 words and use language that both trainers and clients can understand."
        },
        {
          role: "user",
          content: `Generate a trainer-friendly movement pattern description for the exercise: ${exerciseName}`
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return response.choices[0].message.content || "Movement pattern description unavailable.";
  } catch (error) {
    console.error("Error generating movement pattern description:", error);
    throw new Error("Failed to generate movement pattern description");
  }
}