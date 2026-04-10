import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateAgentResponse(systemPrompt: string, userMessage: string, history: { role: string, parts: { text: string }[] }[] = []) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: "user", parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: systemPrompt,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error processing your request.";
  }
}

export async function generateQuiz(topic: string) {
  const systemPrompt = `You are a Quiz Creator. Generate a JSON quiz about the given topic. 
  The response MUST be a valid JSON array of objects, where each object has:
  - question: string
  - options: string[] (exactly 4 options)
  - correctAnswer: number (index of the correct option, 0-3)
  - explanation: string
  
  Generate 5 questions.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a quiz about: ${topic}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Quiz Generation Error:", error);
    return null;
  }
}

export async function generateAppPlan(appDescription: string) {
  const systemPrompt = `You are an AI App Builder Guide. Based on the user's app description, provide a step-by-step plan to build it.
  Include:
  1. Core Features
  2. Tech Stack Recommendations
  3. Step-by-step Implementation Guide
  4. Potential Challenges
  
  Format the output in clean Markdown.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `App Description: ${appDescription}`,
      config: {
        systemInstruction: systemPrompt,
      },
    });
    return response.text;
  } catch (error) {
    console.error("App Plan Generation Error:", error);
    return "Error generating app plan.";
  }
}
