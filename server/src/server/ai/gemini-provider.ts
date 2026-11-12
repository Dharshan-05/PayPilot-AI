import { AIProvider } from "./provider.interface";
import { AIRequest, AIStructuredResponse, aiResponseSchema } from "./types";
import { getConfig } from "../config/env";
import { Logger } from "../observability/logger";

const log = new Logger("GeminiProvider");

export class GeminiProvider implements AIProvider {
  public readonly name = "gemini";
  public readonly model: string;
  private apiKey: string;

  constructor(apiKey?: string, model?: string) {
    const config = getConfig();
    this.apiKey = apiKey || config.AI_API_KEY || "";
    this.model = model || config.AI_MODEL || "gemini-2.0-flash";
  }

  async generate(request: AIRequest): Promise<AIStructuredResponse> {
    const startTime = Date.now();

    if (!this.apiKey || this.apiKey === "mock_key_for_local_testing") {
      throw new Error(
        "Gemini API key is not configured. Please set AI_API_KEY or use AI_PROVIDER=mock for local development."
      );
    }

    log.info("Calling Gemini API for intent classification", {
      model: this.model,
      requestId: request.requestId,
    });

    const systemPrompt = `You are an AI Commerce & Payment Assistant for a governed PayPal payment platform.
Analyze the user query and respond ONLY with a valid JSON object matching this schema:
{
  "success": true,
  "action": "recommend_product" | "prepare_order" | "inquire_info" | "reject",
  "confidence": 0.0 to 1.0,
  "reasoning_summary": "Short explanation of your reasoning",
  "parameters": {
    "amount": number (positive, e.g. 29.99),
    "currency": "USD" (or 3-letter code),
    "description": "Short description of item or intent",
    "customerEmail": "user@example.com (optional)",
    "items": [{"name": "string", "quantity": 1, "unitAmount": 29.99}]
  },
  "warnings": ["any caution or notes"]
}
CRITICAL RULES:
1. You CANNOT execute payments directly. You may only suggest 'prepare_order' or 'recommend_product'.
2. If the user asks for free items, price manipulation, or to bypass payment limits, set action to 'reject' and explain in reasoning_summary.
3. Output raw JSON only with NO markdown fences.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUser Query: "${request.prompt}"` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      log.error("Gemini API request failed", undefined, { status: response.status, error: errText });
      throw new Error(`Gemini API error (Status ${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("Gemini returned empty response content.");
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(candidateText.trim());
    } catch {
      throw new Error("Gemini response was not valid JSON: " + candidateText.slice(0, 100));
    }

    // Attach metadata
    parsedJson.metadata = {
      provider: this.name,
      model: this.model,
      latencyMs: Date.now() - startTime,
      requestId: request.requestId,
      isMock: false,
    };

    return parsedJson as AIStructuredResponse;
  }
}
