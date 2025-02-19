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
          content: "You are a professional fitness trainer specializing in exercise biomechanics. Generate concise, technical descriptions of movement patterns for exercises. Focus on the primary movement pattern, joint actions, and movement planes. Keep responses under 100 words."
        },
        {
          role: "user",
          content: `Generate a technical movement pattern description for the exercise: ${exerciseName}`
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    return response.choices[0].message.content || "Movement pattern description unavailable.";
  } catch (error) {
    console.error("Error generating movement pattern description:", error);
    throw new Error("Failed to generate movement pattern description");
  }
}
