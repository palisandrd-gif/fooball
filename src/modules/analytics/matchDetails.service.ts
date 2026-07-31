import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { externalMatchScore, isLikelySameMatch } from "../../utils/externalMatch.js";
import { fetchApiFootballFixturesByDate } from "../apiFootball/apiFootball.fetcher.js";
import {
  hydrateApiFootballFixture,
  upsertApiFootballFixture
} from "../apiFootball/apiFootball.sync.js";

const API_STAT_LABELS: Record<string, string> = {
  "Shots on Goal": "Удары в створ",
  "Shots off Goal": "Удары мимо",
  "Total Shots": "Всего ударов",
  "Blocked Shots": "Заблокированные удары",
  "Ball Possession": "Владение",
  "Corner Kicks": "Угловые",
  "Offsides": "Офсайды",
  "Fouls": "Фолы",
  "Yellow Cards": "Жёлтые карточки",
  "Red Cards": "Красные карточки",
  "Goalkeeper Saves": "Сейвы",
  "Total passes": "Передачи",
  "Passes accurate": "Точные передачи",
  "Passes %": "Точность передач",
  "expected_goals": "xG"
};

function dayBounds(date: Date): { gte: Date; lt: Date } {
  const gte = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return { gte, lt: new Date(gte.valueOf() + 86_400_000) };
}

type MatchForDetails = {
  kickoffAt: Date;
  homeTeam: { name: string; apiFootballId: number | null };
  awayTeam: { name: string; apiFootballId: number | null };
};

type DetailedApiFixture = Prisma.ApiFootballFixtureGetPayload<{
  include: { statistics: true; events: true };
}>;

function apiFixtureScore(match: MatchForDetails, fixture: {
  homeTeamName: string;
  awayTeamName: string;
  homeTeamApiId: number;
  awayTeamApiId: number;
}): number {
  return externalMatchScore(
    match.homeTeam.name,
    match.awayTeam.name,
    fixture.homeTeamName,
    fixture.awayTeamName
  ) + (fixture.homeTeamApiId === match.homeTeam.apiFootballId ? 100 : 0)
    + (fixture.awayTeamApiId === match.awayTeam.apiFootballId ? 100 : 0);
}

async function loadApiFixture(match: MatchForDetails): Promise<DetailedApiFixture | undefined> {
  const candidates = await prisma.apiFootballFixture.findMany({
    where: { kickoffAt: dayBounds(match.kickoffAt) },
    include: { statistics: true, events: { orderBy: [{ elapsed: "asc" }, { extra: "asc" }] } },
    take: 30
  });
  const selected = candidates
    .map((fixture) => ({ fixture, score: apiFixtureScore(match, fixture) }))
    .sort((a, b) => b.score - a.score)[0];
  return selected && isLikelySameMatch(selected.score) ? selected.fixture : undefined;
}

async function fetchAndCacheApiFixture(match: MatchForDetails): Promise<DetailedApiFixture | undefined> {
  const date = match.kickoffAt.toISOString().slice(0, 10);
  const inputs = await fetchApiFootballFixturesByDate(date);
  const selected = inputs
    .map((input) => ({
      input,
      score: externalMatchScore(
        match.homeTeam.name,
        match.awayTeam.name,
        input.teams.home.name,
        input.teams.away.name
      )
    }))
    .sort((a, b) => b.score - a.score)[0];
  if (!selected || !isLikelySameMatch(selected.score)) return undefined;
  await upsertApiFootballFixture(selected.input);
  return loadApiFixture(match);
}

async function apiFootballDetails(match: MatchForDetails): Promise<string | undefined> {
  let fixture = await loadApiFixture(match);
  try {
    fixture ??= await fetchAndCacheApiFixture(match);
    if (fixture && !fixture.detailsFetchedAt) {
      await hydrateApiFootballFixture(fixture.id, fixture.fixtureId);
      fixture = await loadApiFixture(match);
    }
  } catch {
    // A provider quota or temporary outage must not break the score-only fallback.
  }
  if (!fixture) return undefined;
  const homeStats = new Map(
    fixture.statistics
      .filter((stat) => stat.teamApiId === fixture.homeTeamApiId)
      .map((stat) => [stat.type, stat.value])
  );
  const awayStats = new Map(
    fixture.statistics
      .filter((stat) => stat.teamApiId === fixture.awayTeamApiId)
      .map((stat) => [stat.type, stat.value])
  );
  const stats = Object.entries(API_STAT_LABELS)
    .filter(([type]) => homeStats.has(type) || awayStats.has(type))
    .map(([type, label]) => `${label}: ${homeStats.get(type) ?? "—"} — ${awayStats.get(type) ?? "—"}`);
  const events = fixture.events
    .filter((event) => ["Goal", "Card"].includes(event.type))
    .slice(0, 12)
    .map((event) => {
      const minute = `${event.elapsed}${event.extra ? `+${event.extra}` : ""}′`;
      return `${minute} ${event.type === "Goal" ? "⚽" : "🟨"} ${event.playerName ?? event.teamName} — ${event.detail}`;
    });

  return [
    "📊 Подробная статистика",
    `${fixture.homeTeamName} — ${fixture.awayTeamName}`,
    fixture.venueName ? `Стадион: ${fixture.venueName}` : undefined,
    fixture.referee ? `Судья: ${fixture.referee}` : undefined,
    stats.length ? `\n${stats.join("\n")}` : "\nПодробные показатели пока не загружены.",
    events.length ? `\nКлючевые события:\n${events.join("\n")}` : undefined,
    "\nИсточник: API-Football"
  ].filter(Boolean).join("\n");
}

async function statsBombDetails(match: {
  kickoffAt: Date;
  homeTeam: { name: string };
  awayTeam: { name: string };
}): Promise<string | undefined> {
  const candidates = await prisma.statsBombMatch.findMany({
    where: { matchDate: dayBounds(match.kickoffAt) },
    include: { events: true, lineup: true },
    take: 30
  });
  const selected = candidates
    .map((item) => ({
      item,
      score: externalMatchScore(match.homeTeam.name, match.awayTeam.name, item.homeTeam, item.awayTeam)
    }))
    .sort((a, b) => b.score - a.score)[0];
  if (!selected || !isLikelySameMatch(selected.score) || !selected.item.events.length) return undefined;
  const item = selected.item;
  const teamStats = (teamName: string) => {
    const events = item.events.filter((event) => event.teamName === teamName);
    const shots = events.filter((event) => event.type === "Shot");
    return {
      shots: shots.length,
      xg: shots.reduce((sum, event) => sum + (event.shotXg ?? 0), 0),
      passes: events.filter((event) => event.type === "Pass").length
    };
  };
  const home = teamStats(item.homeTeam);
  const away = teamStats(item.awayTeam);
  const starters = (teamName: string) => item.lineup
    .filter((player) => player.teamName === teamName && player.started)
    .map((player) => player.playerName)
    .slice(0, 11);
  const homeStarters = starters(item.homeTeam);
  const awayStarters = starters(item.awayTeam);

  return [
    "📊 Расширенные данные матча",
    `${item.homeTeam} — ${item.awayTeam}`,
    `Удары: ${home.shots} — ${away.shots}`,
    `xG: ${home.xg.toFixed(2)} — ${away.xg.toFixed(2)}`,
    `Зафиксированные передачи: ${home.passes} — ${away.passes}`,
    homeStarters.length ? `\nСтартовый состав ${item.homeTeam}: ${homeStarters.join(", ")}` : undefined,
    awayStarters.length ? `\nСтартовый состав ${item.awayTeam}: ${awayStarters.join(", ")}` : undefined,
    "\nData source: StatsBomb Open Data"
  ].filter(Boolean).join("\n");
}

export const matchDetailsService = {
  async forMatch(matchId: string): Promise<string | undefined> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true }
    });
    if (!match) return undefined;
    return (await apiFootballDetails(match)) ?? (await statsBombDetails(match));
  }
};
