import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.VITE_FIREBASE_API_KEY }); 
async function run() {
  const models = await ai.models.list();
  for await (const m of models) {
    if (m.name.includes('imagen')) console.log(m.name);
  }
}
run();
