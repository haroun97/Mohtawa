import { describe, it, expect } from "vitest";
import { validateEDL, parseEDLSafe, edlSchema } from "./schema";

describe("EDL schema", () => {
  const validEDL = {
    timeline: [
      { clipUrl: "https://example.com/clip1.mp4", inSec: 0, outSec: 2, startSec: 0 },
      { clipUrl: "https://example.com/clip2.mp4", inSec: 0, outSec: 2, startSec: 2 },
    ],
    overlays: [{ type: "text" as const, text: "Hook", startSec: 0, endSec: 1.5, position: "bottom" }],
    audio: { voiceoverUrl: "https://example.com/vo.mp3", voiceGainDb: 0 },
    output: { width: 1080, height: 1920, fps: 30 },
  };

  it("validates valid EDL", () => {
    const result = validateEDL(validEDL);
    expect(result.timeline).toHaveLength(2);
    expect(result.audio.voiceoverUrl).toBe("https://example.com/vo.mp3");
    expect(result.output.width).toBe(1080);
  });

  it("parseEDLSafe returns success for valid EDL", () => {
    const r = parseEDLSafe(validEDL);
    expect(r.success).toBe(true);
    if (r.success) expect(r.edl.timeline).toHaveLength(2);
  });

  it("parseEDLSafe returns error for invalid EDL", () => {
    const r = parseEDLSafe({ timeline: "not an array" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBeDefined();
  });

  it("rejects missing timeline", () => {
    const r = parseEDLSafe({ ...validEDL, timeline: undefined });
    expect(r.success).toBe(false);
  });

  it("rejects empty clipUrl", () => {
    const r = parseEDLSafe({
      ...validEDL,
      timeline: [{ clipUrl: "", inSec: 0, outSec: 1, startSec: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts s3:// clipUrl", () => {
    const r = parseEDLSafe({
      ...validEDL,
      timeline: [{ clipUrl: "s3://bucket/key/clip.mp4", inSec: 0, outSec: 1, startSec: 0 }],
    });
    expect(r.success).toBe(true);
  });

  it("defaults overlays to empty array", () => {
    const minimal = { ...validEDL, overlays: undefined };
    const result = validateEDL(minimal);
    expect(result.overlays).toEqual([]);
  });

  it("defaults output.fps to 30", () => {
    const noFps = { ...validEDL, output: { width: 1920, height: 1080 } };
    const result = validateEDL(noFps);
    expect(result.output.fps).toBe(30);
  });
});
