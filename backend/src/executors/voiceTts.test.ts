import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeVoiceTTS } from "./voiceTts.js";
import type { ExecutorContext } from "./index.js";

describe("executeVoiceTTS", () => {
  const mockGetVoiceProfile = vi.fn();
  const mockUserId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns error when voiceProfileId is missing", async () => {
    const ctx: ExecutorContext = {
      nodeId: "n1",
      nodeType: "voice.tts",
      category: "voice",
      config: {},
      inputData: {},
      getApiKey: vi.fn(),
      userId: mockUserId,
      getVoiceProfile: mockGetVoiceProfile,
    };

    const result = await executeVoiceTTS(ctx);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("Voice profile");
    }
  });

  it("returns error when getVoiceProfile returns null", async () => {
    mockGetVoiceProfile.mockResolvedValue(null);
    const ctx: ExecutorContext = {
      nodeId: "n1",
      nodeType: "voice.tts",
      category: "voice",
      config: { voiceProfileId: "profile-123" },
      inputData: {},
      getApiKey: vi.fn(),
      userId: mockUserId,
      getVoiceProfile: mockGetVoiceProfile,
    };

    const result = await executeVoiceTTS(ctx);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("not found");
    }
  });

  it("returns error when no text in config or input", async () => {
    mockGetVoiceProfile.mockResolvedValue({
      id: "p1",
      userId: mockUserId,
      provider: "elevenlabs",
      providerVoiceId: "v1",
      name: "My Voice",
      language: "en",
      trainingStatus: "ready",
    });
    const ctx: ExecutorContext = {
      nodeId: "n1",
      nodeType: "voice.tts",
      category: "voice",
      config: { voiceProfileId: "p1" },
      inputData: {},
      getApiKey: vi.fn(),
      userId: mockUserId,
      getVoiceProfile: mockGetVoiceProfile,
    };

    const result = await executeVoiceTTS(ctx);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("No text");
    }
  });

  it("returns error when userId is missing", async () => {
    const ctx: ExecutorContext = {
      nodeId: "n1",
      nodeType: "voice.tts",
      category: "voice",
      config: { voiceProfileId: "p1" },
      inputData: {},
      getApiKey: vi.fn(),
      userId: undefined,
      getVoiceProfile: mockGetVoiceProfile,
    };

    const result = await executeVoiceTTS(ctx);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("User context missing");
    }
  });
});
