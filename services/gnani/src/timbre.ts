import { SynthesizeOptions, SynthesizeResult } from './types.js';
import { CircuitBreaker, withRetry } from './circuitBreaker.js';

export interface TimbreConfig {
  baseUrl: string;
  apiKey?: string;
  apiKeyId?: string;
  apiKeySecret?: string;
}

export class TimbreClient {
  private breaker = new CircuitBreaker({ timeoutMs: 12000 });

  constructor(private config: TimbreConfig) {}

  /**
   * Synthesize Indic speech from text using Gnani Timbre TTS
   */
  async synthesize(
    text: string,
    language: string,
    options: SynthesizeOptions = {}
  ): Promise<SynthesizeResult> {
    const startTime = Date.now();

    return this.breaker.execute(async (signal) => {
      return withRetry(async () => {
        const url = `${this.config.baseUrl}/v1/tts/synthesize`;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'audio/wav',
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
          language_code: language,
          voice_id: options.voiceId || `${language}-female`,
          gender: options.gender || 'female',
          audio_format: options.audioFormat || 'wav',
          speed: options.speed || 1.0,
        };

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Gnani Timbre TTS failed [${response.status}]: ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const audioBase64 = buffer.toString('base64');

        return {
          audioBase64,
          audioBuffer: buffer,
          mimeType: options.audioFormat === 'mp3' ? 'audio/mp3' : 'audio/wav',
          language,
          durationMs: Date.now() - startTime,
        };
      }, 2, 250);
    });
  }
}
