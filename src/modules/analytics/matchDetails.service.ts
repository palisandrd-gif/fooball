import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../utils/logger.js";
import { externalMatchScore, isLikelySameMatch } from "../../utils/externalMatch.js";
import { teamSearchScore } from "../../utils/teamAliases.js";
import {
  fetchApiFootballFixtures,
  fetchApiFootballFixturesByDate,
  fetchApiFootballFixturesByTeam,
  fetchApiFootballTeams
} from "../apiFootball/apiFootball.fetcher.js";
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

const API_FOOTBALL_LEAGUE_IDS: Record<string, number> = {
  "en.1": 39,
  "de.1": 78,
  "es.1": 140,
  "it.1": 135,
  "fr.1": 61
};

function dayBounds(date: Date): { gte: Date; lt: Date } {
  const gte = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return { gte, lt: new Date(gte.valueOf() + 86_400_000) };
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftUtcDate(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

type MatchForDetails = {
  kickoffAt: Date;
  homeTeam: { name: string; apiFootballId: number | null };
  awayTeam: { name: string; apiFootballId: number | null };
  season?: { startYear: number; league: { code: string } };
};

type DetailedApiFixture = Prisma.ApiFootballFixtureGetPayload<{
  include: { statistics: true; events: true };
}>;

type FixtureNames = {
  homeTeamName: string;
  awayTeamName: string;
  homeTeamApiId: number;
  awayTeamApiId: number;
};

function namesScore(match: MatchForDetails, fixture: FixtureNames): number {
  return externalMatchScore(
    match.homeTeam.name,
    match.awayTeam.name,
    fixture.homeTeamName,
    fixture.awayTeamName
  ) + (fixture.homeTeamApiId === match.homeTeam.apiFootballId ? 100 : 0)
    + (fixture.awayTeamApiId === match.awayTeam.apiFootballId ? 100 : 0);
}

function selectFixtureNames(match: MatchForDetails, fixtures: FixtureNames[]): FixtureNames | undefined {
  const selected = fixtures
    .map((fixture) => ({ fixture, score: namesScore(match, fixture) }))
    .sort((a, b) => b.score - a.score)[0];
  return selected && isLikelySameMatch(selected.score) ? selected.fixture : undefined;
}

async function loadApiFixture(match: MatchForDetails): Promise<DetailedApiFixture | undefined> {
  const center = dayBounds(match.kickoffAt);
  const gte = new Date(center.gte.valueOf() - 86_400_000);
  const lt = new Date(center.lt.valueOf() + 86_400_000);
  const candidates = await prisma.apiFootballFixture.findMany({
    where: { kickoffAt: { gte, lt } },
    include: { statistics: true, events: { orderBy: [{ elapsed: "asc" }, { extra: "asc" }] } },
    take: 100
  });
  const selected = candidates
    .map((fixture) => ({ fixture, score: namesScore(match, fixture) }))
    .sort((a, b) => b.score - a.score)[0];
  return selected && isLikelySameMatch(selected.score) ? selected.fixture : undefined;
}

async function fetchAndCacheApiFixture(match: MatchForDetails): Promise<DetailedApiFixture | undefined> {
  const dates = [-1, 0, 1].map((offset) => dateString(shiftUtcDate(match.kickoffAt, offset)));
  try {
    // A league + season request is both more reliable and much cheaper than
    // probing several global fixture dates on API-Football's free plan.
    const leagueId = match.season && API_FOOTBALL_LEAGUE_IDS[match.season.league.code];
    if (leagueId && match.season) {
      const fixtures = await fetchApiFootballFixtures(leagueId, match.season.startYear);
      const selected = selectFixtureNames(match, fixtures.map((input) => ({
        homeTeamName: input.teams.home.name,
        awayTeamName: input.teams.away.name,
        homeTeamApiId: input.teams.home.id,
        awayTeamApiId: input.teams.away.id
      })));
      if (selected) {
        const input = fixtures.find((item) =>
          item.teams.home.id === selected.homeTeamApiId && item.teams.away.id === selected.awayTeamApiId
        );
        if (input) {
          await upsertApiFootballFixture(input);
          return loadApiFixture(match);
        }
      }
    }

    for (const date of dates) {
      const fixtures = await fetchApiFootballFixturesByDate(date);
      const selected = selectFixtureNames(match, fixtures.map((input) => ({
        homeTeamName: input.teams.home.name,
        awayTeamName: input.teams.away.name,
        homeTeamApiId: input.teams.home.id,
        awayTeamApiId: input.teams.away.id
      })));
      if (selected) {
        const input = fixtures.find((item) =>
          item.teams.home.id === selected.homeTeamApiId && item.teams.away.id === selected.awayTeamApiId
        );
        if (input) {
          await upsertApiFootballFixture(input);
          return loadApiFixture(match);
        }
      }
    }

    // Some provider indexes are more reliable by team than by date.
    const teamIds = [...new Set([
      match.homeTeam.apiFootballId,
      match.awayTeam.apiFootballId
    ].filter((id): id is number => id !== null))];

    if (!teamIds.length) {
      for (const teamName of [match.homeTeam.name, match.awayTeam.name]) {
        const teams = await fetchApiFootballTeams(teamName);
        const selected = teams
          .map((item) => ({ id: item.team.id, score: teamSearchScore(teamName, item.team.name) }))
          .filter((item) => item.score >= 75)
          .sort((a, b) => b.score - a.score)[0];
        if (selected) teamIds.push(selected.id);
        if (teamIds.length) break;
      }
    }

    for (const teamId of [...new Set(teamIds)]) {
      const fixtures = await fetchApiFootballFixturesByTeam(
        teamId,
        dateString(shiftUtcDate(match.kickoffAt, -1)),
        dateString(shiftUtcDate(match.kickoffAt, 1))
      );
      const selected = selectFixtureNames(match, fixtures.map((input) => ({
        homeTeamName: input.teams.home.name,
        awayTeamName: input.teams.away.name,
        homeTeamApiId: input.teams.home.id,
        awayTeamApiId: input.teams.away.id
      })));
      if (selected) {
        const input = fixtures.find((item) =>
          item.teams.home.id === selected.homeTeamApiId && item.teams.away.id === selected.awayTeamApiId
        );
        if (input) {
          await upsertApiFootballFixture(input);
          return loadApiFixture(match);
        }
      }
    }
  } catch (error) {
    logger.error({ error, homeTeam: match.homeTeam.name, awayTeam: match.awayTeam.name }, "API-Football match lookup failed");
  }
  return undefined;
}

async function apiFootballDetails(match: MatchForDetails): Promise<string | undefined> {
  let fixture = await loadApiFixture(match);
  try {
    fixture ??= await fetchAndCacheApiFixture(match);
    if (fixture && !fixture.detailsFetchedAt) {
      await hydrateApiFootballFixture(fixture.id, fixture.fixtureId);
      fixture = await loadApiFixture(match);
    }
  } catch (error) {
    logger.error({ error, fixture: fixture?.fixtureId, homeTeam: match.homeTeam.name, awayTeam: match.awayTeam.name }, "API-Football match details hydration failed");
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
      return `${minute} ${event.type === "Goal" ? "⚽" : "🟨"} ${event.playerName ?? event.teamName} — ${event.detail ?? ""}`.trim();
    });

  return [
    "📊 Подробная статистика",
    `${fixture.homeTeamName} — ${fixture.awayTeamName}`,
    fixture.homeGoals !== null && fixture.awayGoals !== null ? `Счёт: ${fixture.homeGoals}:${fixture.awayGoals}` : undefined,
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
  const center = dayBounds(match.kickoffAt);
  const candidates = await prisma.statsBombMatch.findMany({
    where: { matchDate: { gte: new Date(center.gte.valueOf() - 86_400_000), lt: new Date(center.lt.valueOf() + 86_400_000) } },
    include: { events: true, lineup: true },
    take: 100
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
      include: { homeTeam: true, awayTeam: true, season: { include: { league: true } } }
    });
    if (!match) return undefined;
    return (await apiFootballDetails(match)) ?? (await statsBombDetails(match));
  }
};
