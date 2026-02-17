import OpenAI from "openai";
import type { ExecutorResult } from "./index";

export async function executeLLM(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>,
  getApiKey: (service: string) => Promise<string | null>,
): Promise<ExecutorResult> {
  const model = String(config.model || "gpt-4o-mini");
  const systemPrompt = String(config.systemPrompt || "You are a helpful assistant.");
  const userPrompt = String(config.prompt || config.text || "");
  const maxTokens = Number(config.maxTokens || 1024);
  const temperature = Number(config.temperature ?? 0.7);

  // Build prompt from config and upstream input
  let finalPrompt = userPrompt;
  if (!finalPrompt && inputData) {
    const upstreamText = Object.values(inputData)
      .map((v) => {
        if (typeof v === "string") return v;
        if (typeof v === "object" && v !== null && "text" in v) return String((v as Record<string, unknown>).text);
        return JSON.stringify(v);
      })
      .join("\n");
    finalPrompt = upstreamText;
  }

  if (!finalPrompt) {
    return { error: "No prompt provided for LLM node. Set a prompt in the node config or connect an upstream node." };
  }

  const provider = String(config.provider || "openai").toLowerCase();

  if (provider === "openai" || provider === "gpt") {
    const apiKey = await getApiKey("openai");
    if (!apiKey) {
      return {
        error: "OpenAI API key not configured. Add your key in Settings > API Keys.",
      };
    }

    try {
      const client = new OpenAI({ apiKey });

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const choice = response.choices[0];
      return {
        output: {
          text: choice?.message?.content || "",
          model: response.model,
          tokensUsed: response.usage?.total_tokens || 0,
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          finishReason: choice?.finish_reason || "unknown",
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: `OpenAI API error: ${message}` };
    }
  }

  if (provider === "anthropic" || provider === "claude") {
    const apiKey = await getApiKey("anthropic");
    if (!apiKey) {
      return {
        error: "Anthropic API key not configured. Add your key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model.startsWith("claude") ? model : "claude-sonnet-4-20250514",
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: finalPrompt }],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        return { error: `Anthropic API error (${response.status}): ${errBody}` };
      }

      const data = (await response.json()) as {
        content: Array<{ text: string }>;
        model: string;
        usage: { input_tokens: number; output_tokens: number };
      };

      return {
        output: {
          text: data.content?.[0]?.text || "",
          model: data.model,
          tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: `Anthropic API error: ${message}` };
    }
  }

  return {
    error: `Unsupported LLM provider: ${provider}. Use "openai" or "anthropic".`,
  };
}
