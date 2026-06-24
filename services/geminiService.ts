import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, BillItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getModelConfig = (mimeType: string, base64Image: string) => ({
  model: "gemini-3.5-flash",
  contents: {
    parts: [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
      {
        text: `Analyze this Japanese receipt image. Extract store name (supermarket), date, and line items with their names, prices, and tax rates.

        Context:
        - Currency is Japanese Yen (JPY).
        - Prices are usually integers.
        - Japanese Consumption Tax is 8% (reduced rate for groceries/takeout) or 10% (standard/dining-in).
        - Receipts often mark items with symbols (like '*' or '※') to indicate 8% tax.

        Instructions:
        1. Extract 'merchantName' (the name of the store or supermarket, e.g. "イオン", "セブンイレブン", etc.).
        2. Extract 'date' (the date of the transaction, format as YYYY-MM-DD, e.g., "2026-05-27"). If not found, output null or empty string.
        3. Extract 'items':
           - Set 'name' (concise, Japanese or English as printed on the receipt).
           - Set 'price' (the base unit price listed on the line, usually pre-tax).
           - Determine 'taxRate':
             - Set to 0.08 if it looks like a food/grocery item or is marked with a reduced tax symbol.
             - Set to 0.10 otherwise.
        4. Do NOT extract the 'Subtotal', 'Total Tax', or 'Grand Total' lines as items.
        5. Return JSON.

        Example format:
        { "merchantName": "AEON", "date": "2026-05-27", "items": [{ "name": "Bento", "price": 500, "taxRate": 0.08 }] }
        `
      },
    ],
  },
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        merchantName: { type: Type.STRING, description: "Name of the store / supermarket" },
        date: { type: Type.STRING, description: "Date of the receipt in YYYY-MM-DD or YYYY/MM/DD format, or empty if not found" },
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

export interface ReceiptStreamChunk {
  items: Omit<BillItem, 'id' | 'payer'>[];
  merchantName?: string;
  date?: string;
}

export const analyzeReceiptStream = async function* (base64Image: string, mimeType: string): AsyncGenerator<ReceiptStreamChunk, void, unknown> {
  try {
    const response = await ai.models.generateContentStream(getModelConfig(mimeType, base64Image));

    let accumulatedText = "";
    let parsedCount = 0;
    let extractedMerchantName = "";
    let extractedDate = "";

    for await (const chunk of response) {
      if (chunk.text) {
        accumulatedText += chunk.text;
        
        // Extract merchantName & date using regex to report them as soon as found
        const merchantMatch = accumulatedText.match(/"merchantName"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (merchantMatch && merchantMatch[1]) {
          extractedMerchantName = merchantMatch[1].replace(/\\"/g, '"');
        }

        const dateMatch = accumulatedText.match(/"date"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (dateMatch && dateMatch[1]) {
          extractedDate = dateMatch[1].replace(/\\"/g, '"');
        }

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

        // Yield updated stream information
        yield {
          items: currentItems,
          merchantName: extractedMerchantName,
          date: extractedDate
        };
        parsedCount = currentItems.length;
      }
    }
    
    // Final fallback parse to ensure we didn't miss anything due to formatting
    try {
      const finalResult = JSON.parse(accumulatedText) as AnalysisResult;
      yield {
        items: finalResult.items || [],
        merchantName: finalResult.merchantName || extractedMerchantName,
        date: finalResult.date || extractedDate
      };
    } catch (e) {
      // Ignore final parse error, we yielded what we could
    }
  } catch (error) {
    console.error("Error streaming receipt analysis:", error);
    throw error;
  }
};
