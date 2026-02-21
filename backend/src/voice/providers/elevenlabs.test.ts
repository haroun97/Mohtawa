import { describe, it, expect, vi, beforeEach } from "vitest";
import { ElevenLabsTTS } from "./elevenlabs.js";

describe("ElevenLabsTTS", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
          headers: new Headers({ "content-type": "audio/mpeg" }),
        }),
      ),
    );
  });

  it("implements ProviderTTS name", () => {
    const tts = new ElevenLabsTTS({ apiKey: "test-key" });
    expect(tts.name).toBe("elevenlabs");
  });

  it("synthesize sends POST with voiceId and text", async () => {
    const tts = new ElevenLabsTTS({ apiKey: "sk-abc" });
    await tts.synthesize({
      text: "Hello world",
      voiceId: "voice-123",
      format: "mp3",
      stability: 0.5,
      similarityBoost: 0.75,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("voice-123");
    expect(options.method).toBe("POST");
    expect(options.headers["xi-api-key"]).toBe("sk-abc");
    const body = JSON.parse(options.body);
    expect(body.text).toBe("Hello world");
    expect(body.voice_settings.stability).toBe(0.5);
    expect(body.voice_settings.similarity_boost).toBe(0.75);
  });

  it("synthesize returns buffer and contentType", async () => {
    const tts = new ElevenLabsTTS({ apiKey: "sk-abc" });
    const result = await tts.synthesize({
      text: "Hi",
      voiceId: "v1",
      format: "mp3",
    });

    expect(Buffer.isBuffer(result.audioBuffer)).toBe(true);
    expect(result.contentType).toBe("audio/mpeg");
  });

  it("throws on API error response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Rate limit exceeded"),
    } as Response);

    const tts = new ElevenLabsTTS({ apiKey: "sk-abc" });
    await expect(
      tts.synthesize({ text: "Hi", voiceId: "v1", format: "mp3" }),
    ).rejects.toThrow(/429/);
  });
});
