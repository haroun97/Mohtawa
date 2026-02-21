import { describe, it, expect } from "vitest";
import { resolveInputDeep } from "./resolveInput.js";

describe("resolveInputDeep", () => {
  it("finds key at top level", () => {
    expect(resolveInputDeep<string>({ audioUrl: "https://a.com/x.mp3" }, "audioUrl")).toBe(
      "https://a.com/x.mp3",
    );
  });

  it("finds key one level deep", () => {
    expect(
      resolveInputDeep<string>({ output: { audioUrl: "https://b.com/y.mp3" } }, "audioUrl"),
    ).toBe("https://b.com/y.mp3");
  });

  it("finds key through pass-through nesting (Preview Output style)", () => {
    const inputData = {
      output: {
        output: { audioUrl: "https://c.com/voice.mp3", durationSec: 10 },
      },
    };
    expect(resolveInputDeep<string>(inputData, "voiceoverUrl", "audioUrl")).toBe(
      "https://c.com/voice.mp3",
    );
  });

  it("tries keys in order", () => {
    const inputData = { output: { voiceoverUrl: "v.mp3", audioUrl: "a.mp3" } };
    expect(resolveInputDeep<string>(inputData, "voiceoverUrl", "audioUrl")).toBe("v.mp3");
    expect(resolveInputDeep<string>(inputData, "audioUrl", "voiceoverUrl")).toBe("a.mp3");
  });

  it("returns undefined when key not found", () => {
    expect(resolveInputDeep<string>({ foo: 1 }, "audioUrl")).toBeUndefined();
    expect(resolveInputDeep<string>({}, "audioUrl")).toBeUndefined();
  });

  it("avoids infinite recursion on cycles", () => {
    const cyclic: Record<string, unknown> = { x: 1 };
    cyclic.self = cyclic;
    expect(resolveInputDeep<string>(cyclic, "audioUrl")).toBeUndefined();
  });
});
