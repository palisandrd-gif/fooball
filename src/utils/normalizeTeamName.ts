const STOP_WORDS = new Set(["fc", "cf", "afc", "sc", "club", "calcio"]);

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya"
};

export function transliterateCyrillic(value: string): string {
  return [...value.toLowerCase()]
    .map((character) => CYRILLIC_TO_LATIN[character] ?? character)
    .join("");
}

export function normalizeTeamName(value: string): string {
  return transliterateCyrillic(value)
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

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function editSimilarity(left: string, right: string): number {
  return 1 - editDistance(left, right) / Math.max(left.length, right.length, 1);
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
  const exactTokenScore = (intersection / Math.max(queryParts.size, candidateParts.size)) * 70;

  const fuzzyTokenScore =
    ([...queryParts].reduce((total, queryPart) => {
      const best = Math.max(
        ...[...candidateParts].map((candidatePart) => editSimilarity(queryPart, candidatePart))
      );
      return total + best;
    }, 0) /
      queryParts.size) *
    70;

  const wholeNameScore = editSimilarity(left, right) * 70;
  const score = Math.max(exactTokenScore, fuzzyTokenScore, wholeNameScore);
  return score >= 35 ? Math.round(score) : 0;
}
