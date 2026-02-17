import OpenAI from "openai";
import type { ExecutorResult } from "./index";

export async function executeTTS(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>,
  getApiKey: (service: string) => Promise<string | null>,
): Promise<ExecutorResult> {
  const provider = String(config.provider || "openai").toLowerCase();
  const voice = String(config.voice || "nova");

  // Build text from config or upstream input
  let text = String(config.text || "");
  if (!text && inputData) {
    const upstreamText = Object.values(inputData)
      .map((v) => {
        if (typeof v === "string") return v;
        if (typeof v === "object" && v !== null && "text" in v) return String((v as Record<string, unknown>).text);
        return "";
      })
      .filter(Boolean)
      .join(" ");
    text = upstreamText;
  }

  if (!text) {
    return { error: "No text provided for TTS node. Set text in config or connect an upstream node with text output." };
  }

  if (provider === "openai") {
    const apiKey = await getApiKey("openai");
    if (!apiKey) {
      return {
        error: "OpenAI API key not configured. Add your key in Settings > API Keys.",
      };
    }

    try {
      const client = new OpenAI({ apiKey });
      const model = String(config.model || "tts-1");

      const response = await client.audio.speech.create({
        model,
        voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
        input: text.slice(0, 4096), // OpenAI TTS limit
        response_format: "mp3",
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      const base64Audio = buffer.toString("base64");
      const durationEstimate = Math.ceil(text.split(/\s+/).length / 2.5);

      return {
        output: {
          audioBase64: base64Audio.slice(0, 200) + "...[truncated for logs]",
          audioSize: buffer.length,
          format: "mp3",
          voice,
          model,
          textLength: text.length,
          estimatedDurationSeconds: durationEstimate,
          note: "Full audio generated successfully. Audio data truncated in logs.",
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: `OpenAI TTS error: ${message}` };
    }
  }

  if (provider === "elevenlabs") {
    const apiKey = await getApiKey("elevenlabs");
    if (!apiKey) {
      return {
        error: "ElevenLabs API key not configured. Add your key in Settings > API Keys.",
      };
    }

    try {
      const voiceId = String(config.voiceId || "21m00Tcm4TlvDq8ikWAM"); // default Rachel
      const modelId = String(config.model || "eleven_monolingual_v1");

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: text.slice(0, 5000),
            model_id: modelId,
            voice_settings: {
              stability: Number(config.stability ?? 0.5),
              similarity_boost: Number(config.similarityBoost ?? 0.75),
            },
          }),
        },
      );

      if (!response.ok) {
        const errBody = await response.text();
        return { error: `ElevenLabs API error (${response.status}): ${errBody}` };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const base64Audio = buffer.toString("base64");

      return {
        output: {
          audioBase64: base64Audio.slice(0, 200) + "...[truncated for logs]",
          audioSize: buffer.length,
          format: "mp3",
          voice: voiceId,
          model: modelId,
          textLength: text.length,
          note: "Full audio generated successfully. Audio data truncated in logs.",
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: `ElevenLabs API error: ${message}` };
    }
  }

  return {
    error: `Unsupported TTS provider: ${provider}. Use "openai" or "elevenlabs".`,
  };
}
