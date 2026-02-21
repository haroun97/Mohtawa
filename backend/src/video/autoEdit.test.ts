import { describe, it, expect } from "vitest";
import { selectAndTrimClips, buildEDL } from "./autoEdit";

describe("autoEdit", () => {
  const clips = [
    { url: "https://a.com/1.mp4", durationSec: 10 },
    { url: "https://a.com/2.mp4", durationSec: 5 },
  ];

  describe("selectAndTrimClips", () => {
    it("covers target duration with trimmed clips", () => {
      const timeline = selectAndTrimClips(clips, 6, 1.5, 3.5);
      expect(timeline.length).toBeGreaterThanOrEqual(2);
      let total = 0;
      for (const t of timeline) {
        expect(t.outSec - t.inSec).toBeLessThanOrEqual(3.5);
        expect(t.outSec - t.inSec).toBeGreaterThanOrEqual(1.5);
        total += t.outSec - t.inSec;
      }
      expect(total).toBeGreaterThanOrEqual(6);
    });

    it("returns empty for zero target duration", () => {
      const timeline = selectAndTrimClips(clips, 0, 1, 3);
      expect(timeline).toEqual([]);
    });

    it("returns empty for no clips", () => {
      const timeline = selectAndTrimClips([], 10, 1, 3);
      expect(timeline).toEqual([]);
    });

    it("uses seed for reproducible order", () => {
      const t1 = selectAndTrimClips(clips, 5, 1, 2, 42);
      const t2 = selectAndTrimClips(clips, 5, 1, 2, 42);
      expect(t1.map((x) => x.clipUrl)).toEqual(t2.map((x) => x.clipUrl));
    });
  });

  describe("buildEDL", () => {
    it("produces valid EDL with timeline and audio", () => {
      const edl = buildEDL({
        clips,
        voiceoverDurationSec: 8,
        minClipSec: 1.5,
        maxClipSec: 3,
        aspectRatio: "9:16",
        voiceoverUrl: "https://example.com/vo.mp3",
        seed: 1,
      });
      expect(edl.timeline.length).toBeGreaterThan(0);
      expect(edl.audio.voiceoverUrl).toBe("https://example.com/vo.mp3");
      expect(edl.output.width).toBe(1080);
      expect(edl.output.height).toBe(1920);
    });

    it("adds hook overlay when hookText provided", () => {
      const edl = buildEDL(
        {
          clips,
          voiceoverDurationSec: 5,
          minClipSec: 1,
          maxClipSec: 2,
          aspectRatio: "1:1",
          voiceoverUrl: "https://vo.mp3",
        },
        "Hello world",
      );
      expect(edl.overlays.some((o) => o.type === "text" && o.text === "Hello world")).toBe(true);
    });

    it("uses correct dimensions for 16:9", () => {
      const edl = buildEDL({
        clips,
        voiceoverDurationSec: 3,
        minClipSec: 1,
        maxClipSec: 2,
        aspectRatio: "16:9",
        voiceoverUrl: "https://vo.mp3",
      });
      expect(edl.output.width).toBe(1920);
      expect(edl.output.height).toBe(1080);
    });
  });
});
