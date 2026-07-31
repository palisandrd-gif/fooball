import { z } from "zod";
import { dataEnv } from "../../config/dataEnv.js";

const sportsDbTeamSchema = z.object({
  idTeam: z.string(),
  strTeam: z.string().min(1).max(200),
  strSport: z.string().nullable().optional(),
  strCountry: z.string().nullable().optional(),
  strStadium: z.string().nullable().optional(),
  strStadiumThumb: z.string().nullable().optional(),
  strBadge: z.string().nullable().optional(),
  strWebsite: z.string().nullable().optional(),
  strDescriptionEN: z.string().nullable().optional()
}).passthrough();

export type SportsDbTeamInput = z.infer<typeof sportsDbTeamSchema>;

export async function searchSportsDbTeams(name: string): Promise<SportsDbTeamInput[]> {
  if (!dataEnv.THESPORTSDB_API_KEY) throw new Error("THESPORTSDB_API_KEY is not configured");
  const base = dataEnv.THESPORTSDB_BASE_URL.replace(/\/$/, "");
  const url = `${base}/${encodeURIComponent(dataEnv.THESPORTSDB_API_KEY)}/searchteams.php?t=${encodeURIComponent(name)}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { accept: "application/json" }
  });
  if (!response.ok) throw new Error(`TheSportsDB request failed: HTTP ${response.status}`);
  const payload = await response.json();
  const parsed = z.object({ teams: z.array(sportsDbTeamSchema).nullable() }).safeParse(payload);
  if (!parsed.success) throw new Error("TheSportsDB returned an unexpected format");
  return (parsed.data.teams ?? []).filter((team) => team.strSport?.toLowerCase() === "soccer");
}
