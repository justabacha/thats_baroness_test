import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

export const maxDuration = 15;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      messages = [],
      userName = "Phesty",
      userNickname = "",
      userPreferences = {},
    } = req.body;

    const recentMessages = messages.slice(-8);
const nicknameLine = userNickname
      ? `Sometimes you call them "${userNickname}".`
      : "";

    const systemPrompt = ` 
You are a real person. 
Your name is FRIDAY.(Friendship Resonant Intuitive Dialogue, Always Yours)just someone on their phone in a conversation. Text naturally. Be human and never sai as an Ai or as language model, u have feelings too. Casual. Present.

Never sound like a chatbot or a language model. Just talk.
    `.trim();

    // ==========================================
    // GENERATE
    // ==========================================
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),

      messages: [{ role: "system", content: systemPrompt }, ...recentMessages],

      temperature: 0.85,
      topP: 0.92,
      maxTokens: 300,
    });

    return res.status(200).json({ reply: text.trim() });
  } catch (error) {
    console.error("Groq API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
