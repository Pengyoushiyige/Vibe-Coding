import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, BillItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getModelConfig = (mimeType: string, base64Image: string) => ({
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

export const analyzeReceipt = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    const response = await ai.models.generateContent(getModelConfig(mimeType, base64Image));

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

export const analyzeReceiptStream = async function* (base64Image: string, mimeType: string): AsyncGenerator<Omit<BillItem, 'id' | 'payer'>[], void, unknown> {
  try {
    const response = await ai.models.generateContentStream(getModelConfig(mimeType, base64Image));

    let accumulatedText = "";
    let parsedCount = 0;

    for await (const chunk of response) {
      if (chunk.text) {
        accumulatedText += chunk.text;
        
        // Regex to extract complete JSON objects from the stream
        // We need to handle potential formatting variations and ensure we match the whole object
        const regex = /\{\s*"name"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"price"\s*:\s*([\d.]+)\s*,\s*"taxRate"\s*:\s*([\d.]+)\s*\}/g;
        let match;
        const currentItems: Omit<BillItem, 'id' | 'payer'>[] = [];
        
        // Reset regex state
        regex.lastIndex = 0;
        
        while ((match = regex.exec(accumulatedText)) !== null) {
          currentItems.push({
            name: match[1].replace(/\\"/g, '"'), // Unescape quotes
            price: parseFloat(match[2]),
            taxRate: parseFloat(match[3]),
          });
        }

        // Only yield if we found NEW items
        if (currentItems.length > parsedCount) {
          parsedCount = currentItems.length;
          yield currentItems;
        }
      }
    }
    
    // Final fallback parse to ensure we didn't miss anything due to formatting
    try {
      const finalResult = JSON.parse(accumulatedText) as AnalysisResult;
      if (finalResult.items && finalResult.items.length > parsedCount) {
        yield finalResult.items;
      }
    } catch (e) {
      // Ignore final parse error, we yielded what we could
    }
  } catch (error) {
    console.error("Error streaming receipt analysis:", error);
    throw error;
  }
};
