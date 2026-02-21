import type { ProviderTTS, TTSOptions, TTSResult } from "../types.js";

const DEFAULT_TIMEOUT_MS = 60_000;

export interface AzureTTSConfig {
  subscriptionKey: string;
  region: string;
  timeoutMs?: number;
}

/**
 * Azure Cognitive Services Speech (REST): synthesis.
 * voiceId is the short name (e.g. en-US-JennyNeural).
 */
export class AzureTTS implements ProviderTTS {
  readonly name = "azure";
  private readonly subscriptionKey: string;
  private readonly region: string;
  private readonly timeoutMs: number;

  constructor(config: AzureTTSConfig) {
    this.subscriptionKey = config.subscriptionKey;
    this.region = config.region;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async synthesize(options: TTSOptions): Promise<TTSResult> {
    const { text, voiceId, format, speakingRate = 1.0 } = options;

    const endpoint = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const ssml = this.buildSsml(text, voiceId, speakingRate);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.subscriptionKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat":
            format === "mp3"
              ? "audio-16khz-128kbitrate-mono-mp3"
              : "riff-16khz-16bit-mono-pcm",
        },
        body: ssml,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `Azure TTS API error (${response.status}): ${errText.slice(0, 500)}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const contentType =
        format === "mp3" ? "audio/mpeg" : "audio/wav";

      return {
        audioBuffer,
        contentType,
        durationSec: undefined,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildSsml(text: string, voiceName: string, rate: number): string {
    const ratePercent =
      rate === 1.0 ? "" : ` rate="${rate > 1 ? "+" : ""}${Math.round((rate - 1) * 100)}%"`;
    return [
      "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>",
      `<voice name='${this.escapeXml(voiceName)}'>`,
      `<prosody${ratePercent}>${this.escapeXml(text)}</prosody>`,
      "</voice>",
      "</speak>",
    ].join("");
  }

  private escapeXml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
