import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'AIzaSyA_FAKE_KEY_THAT_DOES_NOT_EXIST_123' });
ai.models.generateImages({
  model: 'imagen-3.0-generate-001',
  prompt: 'hello',
}).catch(console.error);
