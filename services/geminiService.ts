import { GoogleGenAI, Type, Schema } from "@google/genai";
import { RssItem, IntelligenceReport } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateIntelligenceReport = async (items: RssItem[]): Promise<IntelligenceReport> => {
  const ai = getClient();
  
  // Prepare the content for the model
  const feedContent = items.map((item, index) => `
    Item ${index + 1}:
    Title: ${item.title}
    Date: ${item.pubDate}
    Content Snippet: ${item.content.substring(0, 500).replace(/<[^>]*>?/gm, '')} // Strip HTML tags for token efficiency
    Link: ${item.link}
  `).join('\n---\n');

  const prompt = `
    당신은 전문 정보 분석가입니다.
    다음 RSS 피드 항목들을 분석하여 한국어로 통합 보고서를 작성해 주세요.
    
    규칙:
    1. 관련된 기사들이 같은 사건에 관한 것이라면 하나로 그룹화하세요.
    2. 단순히 홍보성이거나 가치가 낮은 항목은 무시하세요.
    3. 현재 피드 상태에 대한 포괄적인 핵심 요약을 한국어로 작성하세요.
    4. 떠오르는 상위 3가지 트렌드를 추출하세요.
    5. 개별 주요 기사를 "왜 중요한가"에 초점을 맞춰 분석하세요.
    6. 모든 출력(제목, 요약, 트렌드 등)은 자연스러운 한국어로 작성되어야 합니다.
    
    RSS Feed Content:
    ${feedContent}
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      generatedAt: { type: Type.STRING, description: "ISO Date string of generation" },
      overallSummary: { type: Type.STRING, description: "피드 업데이트에 대한 포괄적인 경영진 요약 (한국어)." },
      topTrends: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "이번 배치에서 식별된 상위 3가지 주제 또는 트렌드 (한국어)." 
      },
      articles: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "기사 제목 (한국어 번역)" },
            summary: { type: Type.STRING, description: "사건에 대한 간결한 요약 (한국어)." },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "핵심 사실 3가지 불렛 포인트 (한국어)." },
            category: { type: Type.STRING, description: "예: 기술, 정치, 금융 등 (한국어)" },
            relevanceScore: { type: Type.NUMBER, description: "1에서 10까지의 중요도 점수." },
            originalLink: { type: Type.STRING, description: "원본 기사 링크" }
          },
          required: ["title", "summary", "keyPoints", "category", "relevanceScore"]
        }
      }
    },
    required: ["generatedAt", "overallSummary", "topTrends", "articles"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "당신은 수석 편집자이자 분석가입니다. 간결하고 전문적이며 객관적인 어조를 유지하세요. 모든 응답은 한국어로 작성해야 합니다.",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const parsedData = JSON.parse(text) as IntelligenceReport;
    
    // Ensure generatedAt is set if model forgets or hallucinates a weird date
    if (!parsedData.generatedAt) {
        parsedData.generatedAt = new Date().toISOString();
    }
    
    return parsedData;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("AI 보고서 생성에 실패했습니다.");
  }
};