import { TranscribeOptions, TranscribeResult } from './types.js';
import { CircuitBreaker, withRetry } from './circuitBreaker.js';

export interface PrismaConfig {
  baseUrl: string;
  apiKey?: string;
  apiKeyId?: string;
  apiKeySecret?: string;
}

export class PrismaClient {
  private breaker = new CircuitBreaker({ timeoutMs: 12000 });

  constructor(private config: PrismaConfig) {}

  /**
   * Transcribe an audio segment using Gnani Prisma ASR
   */
  async transcribe(
    audio: Buffer | Uint8Array,
    language: string,
    options: TranscribeOptions = {}
  ): Promise<TranscribeResult> {
    const startTime = Date.now();

    return this.breaker.execute(async (signal) => {
      return withRetry(async () => {
        const url = `${this.config.baseUrl}/v1/stt/transcribe`;

        const headers: Record<string, string> = {
          'Content-Type': options.audioFormat === 'webm' ? 'audio/webm' : 'audio/wav',
          'x-language-code': language,
          'x-audio-encoding': options.encoding || 'LINEAR16',
          'x-sample-rate': String(options.sampleRate || 16000),
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

        const bodyData = audio instanceof Buffer ? audio : Buffer.from(audio);

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: bodyData,
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Gnani Prisma STT failed [${response.status}]: ${errorText}`);
        }

        const data: any = await response.json();
        const text = data.transcript || data.text || (data.results && data.results[0]?.transcript) || '';
        const confidence = data.confidence || 0.95;

        return {
          text: text.trim(),
          language,
          confidence,
          durationMs: Date.now() - startTime,
          isFinal: true,
        };
      }, 2, 250);
    });
  }
}
