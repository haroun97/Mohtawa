import { describe, it, expect, vi, beforeEach } from "vitest";
import { AzureTTS } from "./azure.js";

describe("AzureTTS", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(32)),
        }),
      ),
    );
  });

  it("implements ProviderTTS name", () => {
    const tts = new AzureTTS({
      subscriptionKey: "key",
      region: "eastus",
    });
    expect(tts.name).toBe("azure");
  });

  it("synthesize sends SSML with voice and text", async () => {
    const tts = new AzureTTS({
      subscriptionKey: "sub-key",
      region: "eastus",
    });
    await tts.synthesize({
      text: "Hello",
      voiceId: "en-US-JennyNeural",
      format: "mp3",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("eastus");
    expect(options.method).toBe("POST");
    expect(options.headers["Ocp-Apim-Subscription-Key"]).toBe("sub-key");
    expect(options.body).toContain("en-US-JennyNeural");
    expect(options.body).toContain("Hello");
  });

  it("throws on API error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    } as Response);

    const tts = new AzureTTS({
      subscriptionKey: "bad",
      region: "eastus",
    });
    await expect(
      tts.synthesize({ text: "Hi", voiceId: "en-US-JennyNeural", format: "mp3" }),
    ).rejects.toThrow(/401/);
  });
});
