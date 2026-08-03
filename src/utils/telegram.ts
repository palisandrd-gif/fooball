const TELEGRAM_SAFE_LENGTH = 3900;

export function splitTelegramMessage(text: string, limit = TELEGRAM_SAFE_LENGTH): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > limit) {
    const newline = remaining.lastIndexOf("\n", limit);
    const space = remaining.lastIndexOf(" ", limit);
    const splitAt = Math.max(newline, space, Math.floor(limit * 0.7));
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
