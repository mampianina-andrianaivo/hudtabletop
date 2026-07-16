import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: 'a red apple' }] }
    });
    console.log(response.candidates?.[0]?.content?.parts ? "SUCCESS" : "FAIL");
  } catch(e) { console.error(e.message); }
}
run();
