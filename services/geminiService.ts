import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeReceipt = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: `Analyze this Japanese receipt image. Extract line items with their names, prices, and tax rates.

            Context:
            - Currency is Japanese Yen (JPY).
            - Prices are usually integers.
            - Japanese Consumption Tax is 8% (reduced rate for groceries/takeout) or 10% (standard/dining-in).
            - Receipts often mark items with symbols (like '*' or '※') to indicate 8% tax.

            Instructions:
            1. Extract 'name' (concise).
            2. Extract 'price' (the base unit price listed on the line, usually pre-tax).
            3. Determine 'taxRate':
               - Set to 0.08 if it looks like a food/grocery item or is marked with a reduced tax symbol.
               - Set to 0.10 otherwise.
            4. Do NOT extract the 'Subtotal', 'Total Tax', or 'Grand Total' lines as items.
            5. Return JSON.

            Example format:
            { "items": [{ "name": "Bento", "price": 500, "taxRate": 0.08 }, { "name": "Beer", "price": 300, "taxRate": 0.10 }] }
            `
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  taxRate: { type: Type.NUMBER, description: "0.08 or 0.10" },
                },
                required: ["name", "price", "taxRate"]
              },
            },
          },
          required: ["items"]
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }
    
    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw error;
  }
};
