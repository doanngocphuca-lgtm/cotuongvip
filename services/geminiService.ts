import { GoogleGenAI, Type } from "@google/genai";
import { BoardState, Color } from "../types";

export interface SuggestionResult {
  from: { r: number, c: number };
  to: { r: number, c: number };
  explanation: string;
}

export const getGeminiSuggestion = async (board: BoardState, turn: Color): Promise<SuggestionResult | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Represent board in text format for the model
    let boardText = "";
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        boardText += p ? `${p.color[0] === 'R' ? 'R' : 'B'}${p.type[0]}` : "..";
        boardText += " ";
      }
      boardText += "\n";
    }

    const prompt = `You are a Xiangqi Grandmaster. Analyze this board state and suggest the best move for ${turn}.
    Legend: R=Red, B=Black, G=General, A=Advisor, E=Elephant, H=Horse, R=Rook, C=Cannon, S=Soldier.
    Current Board:
    ${boardText}
    Provide coordinates (fromR, fromC) to (toR, toC) and a very brief explanation. Coordinates 0-9 for row, 0-8 for col.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fromR: { type: Type.INTEGER },
            fromC: { type: Type.INTEGER },
            toR: { type: Type.INTEGER },
            toC: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["fromR", "fromC", "toR", "toC", "explanation"]
        }
      }
    });

    const data = JSON.parse(response.text);
    return {
      from: { r: data.fromR, c: data.fromC },
      to: { r: data.toR, c: data.toC },
      explanation: data.explanation
    };
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return null;
  }
};
