import type { ProviderTTS, TTSOptions, TTSResult } from "../types.js";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_TIMEOUT_MS = 60_000;

export interface ElevenLabsConfig {
  apiKey: string;
  timeoutMs?: number;
}

export class ElevenLabsTTS implements ProviderTTS {
  readonly name = "elevenlabs";
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: ElevenLabsConfig) {
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async synthesize(options: TTSOptions): Promise<TTSResult> {
    const {
      text,
      voiceId,
      format,
      stability = 0.5,
      similarityBoost = 0.75,
      language,
    } = options;

    // Use multilingual model for non-English (e.g. Arabic); monolingual is English-only.
    const lang = (language ?? "en").toLowerCase();
    const modelId =
      lang === "en" || lang.startsWith("en-")
        ? "eleven_monolingual_v1"
        : "eleven_multilingual_v2";

    const body = {
      text: text.slice(0, 5000),
      model_id: modelId,
      voice_settings: {
        stability: Math.max(0, Math.min(1, stability)),
        similarity_boost: Math.max(0, Math.min(1, similarityBoost)),
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `${ELEVENLABS_BASE}/text-to-speech/${encodeURIComponent(voiceId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": this.apiKey,
            Accept: format === "mp3" ? "audio/mpeg" : "audio/wav",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `ElevenLabs API error (${response.status}): ${errText.slice(0, 500)}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const contentType =
        response.headers.get("content-type") ||
        (format === "mp3" ? "audio/mpeg" : "audio/wav");

      return {
        audioBuffer,
        contentType,
        durationSec: undefined,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
