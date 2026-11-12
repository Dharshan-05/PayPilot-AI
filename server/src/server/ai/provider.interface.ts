import { AIRequest, AIStructuredResponse } from "./types";

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate(request: AIRequest): Promise<AIStructuredResponse>;
}
