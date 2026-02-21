/**
 * Generate ASS subtitle file from EDL text overlays.
 * Style presets: bold_white_shadow, yellow_caption, minimal_lower.
 */

import type { EDL } from "../edl/schema.js";

/** Convert seconds to ASS time H:MM:SS.cc */
function secToAssTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** Escape special ASS characters in text (backslash, braces, newlines). */
function escapeAssText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\N");
}

/** ASS alignment: 1=bottom-left, 2=bottom center, 3=bottom-right, 4=mid-left, 5=center, 6=mid-right, 7=top-left, 8=top center, 9=top-right */
function positionToAlignment(position: "top" | "center" | "bottom"): number {
  switch (position) {
    case "top": return 8;
    case "center": return 5;
    case "bottom": return 2;
    default: return 2;
  }
}

/**
 * Build ASS file content from EDL overlays (text only).
 * Returns empty string if no text overlays.
 */
export function buildAssFromEdl(edl: EDL): string {
  const textOverlays = edl.overlays.filter((o): o is EDL["overlays"][number] & { type: "text" } => o.type === "text");
  if (textOverlays.length === 0) return "";

  const lines: string[] = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: " + (edl.output?.width ?? 1920),
    "PlayResY: " + (edl.output?.height ?? 1080),
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: BoldWhiteShadow,Arial,28,&H00FFFFFF,&H000000FF,&H80000000,&H80000000,1,0,1,2,2,2,20,20,30,1",
    "Style: YellowCaption,Arial,32,&H0000FFFF,&H000000FF,&H80000000,&H80000000,0,0,1,1,1,2,20,20,30,1",
    "Style: MinimalLower,Arial,20,&H00E0E0E0,&H000000FF,&H80000000,&H80000000,0,0,1,1,0,2,20,20,20,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const styleNameMap: Record<string, string> = {
    bold_white_shadow: "BoldWhiteShadow",
    yellow_caption: "YellowCaption",
    minimal_lower: "MinimalLower",
  };

  for (const o of textOverlays) {
    const start = secToAssTime(o.startSec);
    const end = secToAssTime(o.endSec);
    const styleName = styleNameMap[o.stylePreset ?? "bold_white_shadow"] ?? "BoldWhiteShadow";
    const pos = o.position ?? "bottom";
    const align = positionToAlignment(pos);
    const text = escapeAssText(o.text);
    lines.push(`Dialogue: 0,${start},${end},${styleName},,0,0,0,,{\\an${align}}${text}`);
  }

  return lines.join("\n");
}
