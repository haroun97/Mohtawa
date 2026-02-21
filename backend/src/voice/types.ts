/**
 * Shared types for voice (TTS) providers and voice.tts node.
 */

export type VoiceProvider = "elevenlabs" | "azure";

export interface TTSOptions {
  text: string;
  voiceId: string;
  format: "mp3" | "wav";
  /** 0–1, ElevenLabs */
  stability?: number;
  /** 0–1, ElevenLabs */
  similarityBoost?: number;
  /** Azure: 0.5–2.0; ElevenLabs: not used */
  speakingRate?: number;
  /** Profile language (e.g. "en", "ar"). Used by ElevenLabs to pick monolingual vs multilingual model. */
  language?: string | null;
}

export interface TTSResult {
  audioBuffer: Buffer;
  contentType: string;
  durationSec?: number;
}

/**
 * Provider-agnostic TTS interface. Implementations: ElevenLabs, Azure.
 */
export interface ProviderTTS {
  readonly name: string;
  synthesize(options: TTSOptions): Promise<TTSResult>;
}

export interface VoiceProfileRecord {
  id: string;
  userId: string;
  provider: VoiceProvider;
  providerVoiceId: string;
  name: string;
  language: string | null;
  trainingStatus: string | null;
}
