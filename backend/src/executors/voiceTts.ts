/**
 * Workflow node: voice.tts — "My Voice (Clone) -> Generate Voiceover"
 * Uses VoiceProfile (ElevenLabs or Azure), synthesizes speech, uploads to S3, returns audioUrl.
 */

import type { ExecutorResult, ExecutorContext } from "./index.js";
import { getTTSApiKey } from "../services/apiKeys.js";
import { createProvider } from "../voice/providers/index.js";
import { uploadToS3, generateStorageKey } from "../lib/storage.js";
import type { VoiceProfileRecord } from "../voice/types.js";

const TTS_TIMEOUT_MS = 90_000;

function resolveText(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>,
): string {
  let text = String(config.text ?? "").trim();
  if (text) return text;
  for (const v of Object.values(inputData)) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object" && "text" in v) {
      const t = String((v as Record<string, unknown>).text ?? "").trim();
      if (t) return t;
    }
  }
  return "";
}

function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase().includes("key") || k.toLowerCase().includes("secret"))
      out[k] = "[REDACTED]";
    else out[k] = v;
  }
  return out;
}

export async function executeVoiceTTS(
  ctx: ExecutorContext,
): Promise<ExecutorResult> {
  const { config, inputData, getVoiceProfile, userId } = ctx;
  if (!userId) {
    return { error: "User context missing for voice.tts node." };
  }
  const voiceProfileId = config.voiceProfileId as string | undefined;
  if (!voiceProfileId?.trim()) {
    return {
      error:
        "Voice profile is required. Create a profile in Voice Profiles and set voiceProfileId in this node.",
    };
  }

  const profile: VoiceProfileRecord | null = getVoiceProfile
    ? await getVoiceProfile(voiceProfileId)
    : null;
  if (!profile) {
    return {
      error: `Voice profile not found or access denied: ${voiceProfileId}`,
    };
  }

  const text = resolveText(config, inputData);
  if (!text) {
    return {
      error:
        "No text provided. Set text in config or connect an upstream node with text output.",
    };
  }

  const keyConfig = await getTTSApiKey(userId!, profile.provider);
  if (!keyConfig) {
    return {
      error: `${profile.provider} API key not configured. Add your key in Settings > API Keys or set ${profile.provider === "elevenlabs" ? "ELEVENLABS_API_KEY" : "AZURE_TTS_SUBSCRIPTION_KEY"} in environment.`,
    };
  }

  const format = (config.format === "wav" ? "wav" : "mp3") as "mp3" | "wav";
  const stability = Number(config.stability);
  const similarityBoost = Number(config.similarityBoost);
  const speakingRate = Number(config.speakingRate);

  const provider = createProvider(profile.provider, {
    apiKey: keyConfig.apiKey,
    region: keyConfig.region,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    const result = await provider.synthesize({
      text: text.slice(0, 5000),
      voiceId: profile.providerVoiceId,
      format,
      stability: Number.isFinite(stability) ? stability : undefined,
      similarityBoost: Number.isFinite(similarityBoost) ? similarityBoost : undefined,
      speakingRate: Number.isFinite(speakingRate) ? speakingRate : undefined,
      language: profile.language ?? undefined,
    });

    clearTimeout(timeoutId);

    let audioUrl: string;
    let audioKey: string;
    try {
      const key = generateStorageKey(
        userId,
        `tts_${profile.id.slice(-6)}`,
        format,
      );
      const uploadResult = await uploadToS3(
        key,
        result.audioBuffer,
        result.contentType,
        "voice-output",
      );
      audioUrl = uploadResult.url;
      audioKey = uploadResult.key;
    } catch (uploadErr) {
      const msg =
        uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      return {
        error: `TTS succeeded but storing audio failed. Configure S3 (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY). ${msg}`,
      };
    }

    const output = {
      audioUrl,
      audioKey,
      durationSec: result.durationSec,
      format,
      voiceProfileId: profile.id,
      voiceProfileName: profile.name,
      textLength: text.length,
    };
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[voice.tts]",
        JSON.stringify(sanitizeForLog({ ...output, provider: profile.provider })),
      );
    }
    return { output };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    const isRateLimit =
      message.includes("429") ||
      message.toLowerCase().includes("rate limit");
    const isTimeout = message.includes("abort") || message.includes("timeout");
    const safeMessage = isRateLimit
      ? "Provider rate limit exceeded. Retry later."
      : isTimeout
        ? "TTS request timed out. Try a shorter text or retry."
        : `TTS failed: ${message}`;
    return { error: safeMessage };
  }
}
