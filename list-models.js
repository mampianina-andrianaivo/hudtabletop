import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({}); 
async function run() {
  try {
    const models = await ai.models.list();
    for await (const m of models) {
      if (m.name.includes('image') || m.name.includes('imagen')) console.log(m.name);
    }
  } catch (e) { console.error(e.message); }
}
run();
