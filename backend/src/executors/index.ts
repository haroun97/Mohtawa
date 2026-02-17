import { executeLLM } from "./llm";
import { executeTTS } from "./tts";
import { executeHTTPRequest } from "./http";
import { executeDelay } from "./delay";
import { executeConditional } from "./conditional";

export interface ExecutorContext {
  nodeId: string;
  nodeType: string;
  category: string;
  config: Record<string, unknown>;
  inputData: Record<string, unknown>;
  getApiKey: (service: string) => Promise<string | null>;
}

export type ExecutorResult =
  | { output: Record<string, unknown> }
  | { error: string };

export async function executeNode(
  ctx: ExecutorContext,
): Promise<ExecutorResult> {
  const { nodeType, category, config, inputData, getApiKey } = ctx;

  try {
    switch (category) {
      case "trigger":
        return {
          output: {
            triggered: true,
            type: nodeType,
            timestamp: new Date().toISOString(),
          },
        };

      case "ai":
        return await executeLLM(config, inputData, getApiKey);

      case "voice":
        return await executeTTS(config, inputData, getApiKey);

      case "video":
        return {
          output: {
            videoUrl: `[placeholder] Video rendering not yet connected`,
            resolution: config.resolution || "1080p",
            format: config.format || "MP4",
            note: "Video rendering requires FFmpeg integration (Phase 7)",
          },
        };

      case "social":
        return {
          output: {
            published: false,
            platform: nodeType.replace("-publisher", ""),
            note: `Social publishing requires ${nodeType.replace("-publisher", "")} API credentials and OAuth flow. Configure in Settings.`,
            simulatedPostId: `post_${Date.now()}`,
          },
        };

      case "logic":
        if (nodeType === "if-else") return executeConditional(config, inputData);
        if (nodeType === "delay") return await executeDelay(config);
        if (nodeType === "loop") return { output: { iterations: 1, completed: true, items: inputData } };
        if (nodeType === "merge") return { output: { merged: true, ...inputData } };
        return { output: { result: "logic processed" } };

      case "utility":
        if (nodeType === "set-variable") {
          const name = String(config.variableName || "var");
          const value = config.value || inputData;
          return { output: { [name]: value } };
        }
        if (nodeType === "http-request") return await executeHTTPRequest(config);
        if (nodeType === "notification") {
          return {
            output: {
              sent: true,
              channel: config.channel || "email",
              message: config.message || "",
              note: "Notification delivery requires channel integration (email/Slack/Discord)",
            },
          };
        }
        if (nodeType === "logger") {
          const logData = { label: config.label, level: config.logLevel || "info", data: inputData };
          console.log(`[WorkflowLogger] ${JSON.stringify(logData)}`);
          return { output: { logged: true, ...logData } };
        }
        return { output: { result: inputData } };

      default:
        return { output: { result: "executed", nodeType } };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
