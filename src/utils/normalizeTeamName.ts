const STOP_WORDS = new Set(["fc", "cf", "afc", "sc", "club", "calcio"]);

export function normalizeTeamName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(?:a\.?f\.?c|f\.?c|c\.?f|s\.?c)\.?\b/gi, " ")
    .replace(/&/g, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .split(" ")
    .filter((part) => part && !STOP_WORDS.has(part))
    .join(" ")
    .trim();
}

export function similarityScore(query: string, candidate: string): number {
  const left = normalizeTeamName(query);
  const right = normalizeTeamName(candidate);
  if (!left || !right) return 0;
  if (left === right) return 100;
  if (right.startsWith(left)) return 85;
  if (right.includes(left)) return 75;

  const queryParts = new Set(left.split(" "));
  const candidateParts = new Set(right.split(" "));
  const intersection = [...queryParts].filter((part) => candidateParts.has(part)).length;
  return Math.round((intersection / Math.max(queryParts.size, candidateParts.size)) * 60);
}
