import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'AIzaSyA_FAKE_KEY_THAT_DOES_NOT_EXIST_123' });
ai.models.generateContent({
  model: 'gemini-3.1-flash-lite-image',
  contents: { parts: [{ text: 'hello' }] }
}).catch(console.error);
