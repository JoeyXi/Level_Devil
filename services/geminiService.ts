import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {
    console.error("Failed to init AI", e);
  }
}

// CHINESE FALLBACK TAUNTS (Use these when API fails)
const FALLBACK_TAUNTS = [
  "重力检测：通过。",
  "你忘记怎么跳了吗？",
  "这看起来很痛。",
  "也许试试...不要死？",
  "检测到操作失误。",
  "地板是烫的吗？哦等等，是刺。",
  "你试过睁开眼睛玩吗？",
  "哎呀。",
  "愤怒退出是个不错的选择。",
  "我奶奶都比你玩得好。"
];

export const generateTaunt = async (levelName: string, deathCount: number, cause: string): Promise<string> => {
  // Offline fallback, missing key, or AI init failed
  if (!ai || !process.env.API_KEY) {
    return FALLBACK_TAUNTS[Math.floor(Math.random() * FALLBACK_TAUNTS.length)];
  }

  try {
    const prompt = `
      You are the sadistic developer of a game called 'Level Devil'. 
      The player just died. 
      Level: "${levelName}".
      Total Deaths: ${deathCount}.
      Cause of death context: ${cause}.
      
      Generate a very short, sarcastic, witty, and slightly mean taunt (max 1 sentence) mocking the player IN SIMPLIFIED CHINESE.
      Do not be overly offensive, just playful trolling.
      Example: "你是不是觉得地板是真的？" or "这就是重力。"
    `;

    // Attempt the API call
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    if (response && response.text) {
      return response.text.trim();
    }
    
    // Fallback if empty response
    return FALLBACK_TAUNTS[Math.floor(Math.random() * FALLBACK_TAUNTS.length)];

  } catch (error) {
    // CRITICAL: Swallow ALL errors (Network, RPC, Quota, etc)
    // to ensure the game flow is never interrupted by an alert or crash.
    // console.warn("Gemini API request failed silently, using fallback.", error); // Optional logging
    return FALLBACK_TAUNTS[Math.floor(Math.random() * FALLBACK_TAUNTS.length)];
  }
};