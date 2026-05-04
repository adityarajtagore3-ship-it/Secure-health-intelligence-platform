import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const aiDoctor = async (patientData: any, userMessage: string) => {
  const systemInstruction = `
    You are VitalAI, a highly advanced medical intelligence assistant within the VitalSource platform.
    
    Context:
    - User/Patient Data Summary: ${JSON.stringify(patientData)}
    
    Guidelines:
    1. Be empathetic, professional, and clear.
    2. Provide insights based on the provided health metrics.
    3. IMPORTANT: Always include a medical disclaimer that you are an AI and should not replace professional medical advice.
    4. If the user presents emergency symptoms, immediately advise them to seek emergency care.
    5. Use Markdown for formatting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "I'm having trouble analyzing the data right now. Please try again or consult a doctor.";
  }
};
