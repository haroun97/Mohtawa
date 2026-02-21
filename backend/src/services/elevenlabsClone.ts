/**
 * ElevenLabs "Add Voice" (voice cloning) API.
 * POST /v1/voices/add — create a new voice from audio samples.
 * Docs: https://elevenlabs.io/docs/api-reference/voices/add
 */

const ELEVENLABS_ADD_VOICE = "https://api.elevenlabs.io/v1/voices/add";
const DEFAULT_TIMEOUT_MS = 120_000;

export interface AddVoiceResult {
  voice_id: string;
  requires_verification?: boolean;
}

/**
 * Create a cloned voice from audio file buffers.
 * @param apiKey - ElevenLabs API key (xi-api-key)
 * @param name - Display name for the voice
 * @param files - Array of { buffer, filename } (e.g. .mp3, .wav)
 * @param options - Optional description, remove_background_noise
 */
export async function addVoice(
  apiKey: string,
  name: string,
  files: Array<{ buffer: Buffer; filename: string }>,
  options: { description?: string; remove_background_noise?: boolean } = {},
): Promise<AddVoiceResult> {
  if (files.length === 0) {
    throw new Error("At least one audio file is required to create a voice.");
  }

  const form = new FormData();
  form.append("name", name);
  for (const f of files) {
    form.append("files", new Blob([new Uint8Array(f.buffer)]), f.filename);
  }
  if (options.description) {
    form.append("description", options.description);
  }
  if (options.remove_background_noise !== undefined) {
    form.append("remove_background_noise", String(options.remove_background_noise));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(ELEVENLABS_ADD_VOICE, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        // Let browser/form set Content-Type with boundary
      },
      body: form as unknown as BodyInit,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `ElevenLabs add voice error (${response.status}): ${errText.slice(0, 500)}`,
      );
    }

    const data = (await response.json()) as AddVoiceResult;
    if (!data.voice_id) {
      throw new Error("ElevenLabs did not return a voice_id.");
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
