import { normalizeTeamName, similarityScore } from "./normalizeTeamName.js";

// Only exonyms, abbreviations and common Russian variants are needed here.
// Direct names such as «Арсенал» or «Ливерпуль» work through transliteration.
const TEAM_ALIASES: Record<string, string[]> = {
  "manchester city": ["Манчестер Сити", "Ман Сити"],
  "manchester united": ["Манчестер Юнайтед", "Ман Юнайтед", "МЮ"],
  "tottenham hotspur": ["Тоттенхэм", "Тоттенхэм Хотспур", "Шпоры"],
  "wolverhampton wanderers": ["Вулверхэмптон", "Вулверхэмптон Уондерерс", "Вулвз"],
  "brighton and hove albion": ["Брайтон", "Брайтон энд Хоув Альбион"],
  "crystal palace": ["Кристал Пэлас", "Кристал Палас"],
  "newcastle united": ["Ньюкасл", "Ньюкасл Юнайтед"],
  "nottingham forest": ["Ноттингем Форест", "Ноттингем"],
  "west ham united": ["Вест Хэм", "Вест Хэм Юнайтед"],
  "aston villa": ["Астон Вилла"],
  "afc bournemouth": ["Борнмут"],
  "bayern munchen": ["Бавария", "Бавария Мюнхен", "Байерн"],
  "borussia dortmund": ["Боруссия Дортмунд", "Дортмунд"],
  "borussia monchengladbach": ["Боруссия Мёнхенгладбах", "Боруссия Менхенгладбах", "Гладбах"],
  "bayer leverkusen": ["Байер", "Байер Леверкузен", "Леверкузен"],
  "rb leipzig": ["РБ Лейпциг", "Лейпциг"],
  "eintracht frankfurt": ["Айнтрахт", "Айнтрахт Франкфурт"],
  "koln": ["Кёльн", "Кельн"],
  "mainz 05": ["Майнц", "Майнц 05"],
  "werder bremen": ["Вердер", "Вердер Бремен"],
  "real madrid": ["Реал", "Реал Мадрид"],
  "barcelona": ["Барселона", "Барса"],
  "atletico madrid": ["Атлетико", "Атлетико Мадрид"],
  "athletic club": ["Атлетик", "Атлетик Бильбао"],
  "real sociedad": ["Реал Сосьедад", "Сосьедад"],
  "real betis": ["Бетис", "Реал Бетис"],
  "celta vigo": ["Сельта", "Сельта Виго"],
  "deportivo alaves": ["Алавес"],
  "internazionale milano": ["Интер", "Интер Милан", "Интернационале"],
  "milan": ["Милан", "Милан АС"],
  "juventus": ["Ювентус", "Юве"],
  "napoli": ["Наполи", "Неаполь"],
  "roma": ["Рома", "Рим"],
  "lazio": ["Лацио"],
  "fiorentina": ["Фиорентина", "Фиалки"],
  "hellas verona": ["Верона", "Эллас Верона"],
  "paris saint germain": ["ПСЖ", "Пари Сен-Жермен", "Пари Сен Жермен"],
  "olympique marseille": ["Марсель", "Олимпик Марсель"],
  "olympique lyonnais": ["Лион", "Олимпик Лион"],
  "monaco": ["Монако"],
  "lille": ["Лилль", "Лилль OSC"],
  "nice": ["Ницца"],
  "saint etienne": ["Сент-Этьен", "Сент Этьен"],
  "stade rennais": ["Ренн"],
  "stade de reims": ["Реймс"],
  "le havre": ["Гавр", "Ле Авр"]
};

function aliasesForTeam(teamName: string): string[] {
  const normalizedTeam = normalizeTeamName(teamName);
  const entry = Object.entries(TEAM_ALIASES).find(
    ([canonical]) =>
      normalizedTeam === canonical ||
      normalizedTeam.includes(canonical) ||
      canonical.includes(normalizedTeam)
  );
  return entry?.[1] ?? [];
}

export function teamSearchScore(query: string, teamName: string): number {
  return Math.max(
    similarityScore(query, teamName),
    ...aliasesForTeam(teamName).map((alias) => similarityScore(query, alias))
  );
}
