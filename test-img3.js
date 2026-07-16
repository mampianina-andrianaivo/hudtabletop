import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
async function run() {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt: 'a red apple',
      config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
    });
    console.log(response.generatedImages?.[0]?.image?.imageBytes ? "SUCCESS" : "FAIL");
  } catch(e) { console.error(e.message); }
}
run();
