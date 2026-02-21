import type { ProviderTTS } from "../types.js";
import { ElevenLabsTTS } from "./elevenlabs.js";
import { AzureTTS } from "./azure.js";

export type { ProviderTTS };
export { ElevenLabsTTS, AzureTTS };

export function createProvider(
  provider: "elevenlabs" | "azure",
  config: { apiKey: string; region?: string },
): ProviderTTS {
  if (provider === "elevenlabs") {
    return new ElevenLabsTTS({ apiKey: config.apiKey });
  }
  if (provider === "azure") {
    const region = config.region || process.env.AZURE_TTS_REGION || "eastus";
    return new AzureTTS({
      subscriptionKey: config.apiKey,
      region,
    });
  }
  throw new Error(`Unknown voice provider: ${provider}`);
}
