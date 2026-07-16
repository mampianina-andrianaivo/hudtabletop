import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: { parts: [{ text: 'a red apple' }] }
    });
    console.log(response.candidates?.[0]?.content?.parts ? "SUCCESS" : "FAIL");
  } catch(e) { console.error(e.message); }
}
run();
