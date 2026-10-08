import { TranslateOptions, TranslateResult, ExplainOptions, ExplainResult } from './types.js';
import { CircuitBreaker, withRetry } from './circuitBreaker.js';

export interface EvonConfig {
  baseUrl: string;
  apiKey?: string;
  apiKeyId?: string;
  apiKeySecret?: string;
}

export class EvonClient {
  private breaker = new CircuitBreaker({ timeoutMs: 10000 });

  constructor(private config: EvonConfig) {}

  /**
   * Translate conversational text using Gnani Evon NMT
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    options: TranslateOptions = {}
  ): Promise<TranslateResult> {
    const startTime = Date.now();

    if (sourceLanguage === targetLanguage) {
      return {
        sourceText: text,
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        latencyMs: 0,
      };
    }

    return this.breaker.execute(async (signal) => {
      return withRetry(async () => {
        const url = `${this.config.baseUrl}/v1/nlu/translate`;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
          headers['x-api-key'] = this.config.apiKey;
        }
        if (this.config.apiKeyId) {
          headers['x-api-key-id'] = this.config.apiKeyId;
        }
        if (this.config.apiKeySecret) {
          headers['x-api-key-secret'] = this.config.apiKeySecret;
        }

        const payload = {
          text,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          domain: options.domain || 'conversational',
        };

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Gnani Evon Translation failed [${response.status}]: ${errorText}`);
        }

        const data: any = await response.json();
        const translatedText = data.translated_text || data.translation || data.text || '';

        return {
          sourceText: text,
          translatedText: translatedText.trim(),
          sourceLanguage,
          targetLanguage,
          latencyMs: Date.now() - startTime,
        };
      }, 2, 250);
    });
  }

  /**
   * Explain complex or fast speech in simple, plain terms in the user's native language
   */
  async explain(
    text: string,
    language: string,
    _options: ExplainOptions
  ): Promise<ExplainResult> {
    return this.breaker.execute(async (signal) => {
      return withRetry(async () => {
        const url = `${this.config.baseUrl}/v1/nlu/explain`;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
          headers['x-api-key'] = this.config.apiKey;
        }

        const payload = {
          text,
          language,
          mode: 'simplify',
        };

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Gnani Evon Explain failed [${response.status}]: ${errorText}`);
        }

        const data: any = await response.json();
        const explanation = data.explanation || data.simplified_text || text;

        return {
          originalText: text,
          explanation: explanation.trim(),
          language,
        };
      }, 2, 250);
    });
  }
}
