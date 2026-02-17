import type { ExecutorResult } from "./index";

export async function executeHTTPRequest(
  config: Record<string, unknown>,
): Promise<ExecutorResult> {
  const url = String(config.url || "");
  if (!url) {
    return { error: "No URL provided for HTTP Request node." };
  }

  const method = String(config.method || "GET").toUpperCase();
  const headersRaw = config.headers as Record<string, string> | undefined;
  const body = config.body;
  const timeout = Number(config.timeout || 30000);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...headersRaw,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timer);

    let responseBody: unknown;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("json")) {
      responseBody = await response.json();
    } else {
      const text = await response.text();
      responseBody = text.slice(0, 5000);
    }

    return {
      output: {
        statusCode: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        url,
        method,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      return { error: `HTTP Request timed out after ${timeout}ms` };
    }
    return { error: `HTTP Request failed: ${message}` };
  }
}
