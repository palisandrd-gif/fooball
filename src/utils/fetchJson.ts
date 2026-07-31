import { z } from "zod";

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

export async function fetchValidatedJson<T>(
  url: string,
  schema: z.ZodType<T>,
  options: { timeoutMs?: number; maxBytes?: number } = {}
): Promise<T> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
    headers: { accept: "application/json" }
  });

  if (!response.ok) throw new Error(`Data source request failed: HTTP ${response.status}`);

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) throw new Error("Data source response is too large");

  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > maxBytes) {
    throw new Error("Data source response is too large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Data source returned invalid JSON");
  }

  const result = schema.safeParse(parsed);
  if (!result.success) throw new Error("Data source returned an unexpected format");
  return result.data;
}
