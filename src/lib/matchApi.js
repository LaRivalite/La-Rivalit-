import { supabase } from "./supabaseClient";
import { queueWrite, registerHandler } from "./writeQueue";

// ── Register handlers so queued writes know how to execute ──

registerHandler("delivery", async (payload) => {
  const { error } = await supabase.from("deliveries").insert(payload);
  if (error) throw error;
});

registerHandler("innings_update", async (payload) => {
  const { inningsId, ...fields } = payload;
  const { error } = await supabase.from("innings").update(fields).eq("id", inningsId);
  if (error) throw error;
});

registerHandler("match_update", async (payload) => {
  const { matchId, ...fields } = payload;
  const { error } = await supabase.from("matches").update(fields).eq("id", matchId);
  if (error) throw error;
});

// ── Create a new match row (not queued — we need the ID back immediately) ──
export async function createMatchInDB({ competition, battingFirst, fieldingFirst, tossWinner, tossChoice, seriesId = null }) {
  const { data, error } = await supabase
    .from("matches")
    .insert({
      series_id: seriesId,
      competition,
      batting_first: battingFirst,
      fielding_first: fieldingFirst,
      toss_winner: tossWinner,
      toss_choice: tossChoice,
      status: "live",
    })
    .select()
    .single();

  if (error) {
    console.error("createMatchInDB error:", error);
    return null;
  }
  return data;
}

export async function saveMatchPlayers(matchId, players) {
  const rows = players.map(p => ({
    match_id: matchId,
    player_id: p.id,
    team: p.team,
  }));

  const { error } = await supabase
    .from("match_players")
    .insert(rows);

  if (error) {
    console.error("saveMatchPlayers error:", error);
  }
}

// ── Create innings row (not queued — we need the ID back) ──
export async function createInningsInDB({ matchId, inningsNum, battingTeam, bowlingTeam, target = null }) {
  const { data, error } = await supabase
    .from("innings")
    .insert({
      match_id: matchId,
      innings_num: inningsNum,
      batting_team: battingTeam,
      bowling_team: bowlingTeam,
      target,
    })
    .select()
    .single();

  if (error) {
    console.error("createInningsInDB error:", error);
    return null;
  }
  return data;
}

// ── Update innings — QUEUED (safe if offline) ──
export async function updateInningsInDB({ inningsId, score, wickets, overs }) {
  await queueWrite("innings_update", { inningsId, score, wickets, overs });
}

// ── Insert a delivery — QUEUED (safe if offline) ──
export async function saveDeliveryToDB(payload) {
  await queueWrite("delivery", {
    match_id: payload.matchId,
    innings_num: payload.inningsNum,
    over_num: payload.overNum,
    ball_num: payload.ballNum,
    striker_id: payload.strikerId,
    non_striker_id: payload.nonStrikerId,
    bowler_id: payload.bowlerId,
    runs_off_bat: payload.runsOffBat,
    wide: payload.wide,
    no_ball: payload.noBall,
    byes: payload.byes,
    total_runs: payload.totalRuns,
    is_wicket: payload.isWicket,
    wicket_type: payload.wicketType,
    wicket_batter: payload.wicketBatter,
    fielder_id: payload.fielderId,
    is_free_hit: payload.isFreeHit,
  });
}

// ── Mark match complete — QUEUED ──
export async function completeMatchInDB({ matchId, winner, margin, type }) {
  await queueWrite("match_update", {
    matchId,
    status: "completed",
    result_winner: winner,
    result_margin: margin,
    result_type: type,
  });
}

// ── Fetch all players ──
export async function fetchAllPlayers() {
  const { data, error } = await supabase.from("players").select("*");
  if (error) { console.error("fetchAllPlayers error:", error); return []; }
  return data;
}

export async function fetchPlayersById() {
  const players = await fetchAllPlayers();
  const byId = {};
  for (const p of players) byId[p.id] = p;
  return byId;
}

// ── Fetch a single match by ID with innings ──
export async function fetchMatchById(matchId) {
  const { data, error } = await supabase
    .from("matches")
    .select("*, innings(*)")
    .eq("id", matchId)
    .single();

  if (error) { console.error("fetchMatchById error:", error); return null; }
  return data;
}

// ── Fetch most recent live match ──
export async function fetchCurrentLiveMatch() {
  const { data, error } = await supabase
    .from("matches")
    .select("*, innings(*)")
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { console.error("fetchCurrentLiveMatch error:", error); return null; }
  return data;
}

// ── Fetch deliveries for a match ──
export async function fetchMatchDeliveries(matchId) {
  const { data, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("match_id", matchId)
    .order("innings_num", { ascending: true })
    .order("over_num", { ascending: true })
    .order("ball_num", { ascending: true });

  if (error) { console.error("fetchMatchDeliveries error:", error); return []; }
  return data;
}

// ── Fetch all completed matches (for history list) ──
export async function fetchCompletedMatches() {
  const { data, error } = await supabase
    .from("matches")
    .select("*, innings(*)")
    .eq("status", "completed")
    .neq("result_type", "abandoned")
    .order("date", { ascending: false });

  if (error) { console.error("fetchCompletedMatches error:", error); return []; }
  return data;
}

// ── Fetch ALL matches regardless of status (for admin/debug) ──
export async function fetchAllMatches() {
  const { data, error } = await supabase
    .from("matches")
    .select("*, innings(*)")
    .order("created_at", { ascending: false });

  if (error) { console.error("fetchAllMatches error:", error); return []; }
  return data;
}

// ── Mark a match as abandoned (status becomes 'completed' but no winner) ──
export async function abandonMatchInDB(matchId) {
  // Use status "abandoned" — separate from "completed" so stats queries
  // can simply filter by status = "completed" and never see abandoned matches
  const { error } = await supabase
    .from("matches")
    .update({ status: "abandoned", result_type: "abandoned" })
    .eq("id", matchId);

  if (error) console.error("abandonMatchInDB error:", error);
}

// ── Insert a new player (called when scorer adds a custom player in setup) ──
export async function ensurePlayerInDB({ id, name, team }) {
  const { error } = await supabase
    .from("players")
    .upsert({ id, name, team }, { onConflict: "id" });

  if (error) console.error("ensurePlayerInDB error:", error);
}

// ── Fetch all players grouped by team (for match setup roster screen) ──
export async function fetchPlayersByTeam() {
  const { data, error } = await supabase.from("players").select("*").order("name");
  if (error) {
    console.error("fetchPlayersByTeam error:", error);
    return { Mavericks: [], Spartans: [] };
  }

  const grouped = { Mavericks: [], Spartans: [] };
  for (const p of data) {
    if (grouped[p.team]) grouped[p.team].push(p);
  }
  return grouped;
}

// ── Generate a unique name if a duplicate exists (e.g. "Ali" -> "Ali 2") ──
export function dedupeName(name, existingNames) {
  if (!existingNames.includes(name)) return name;
  let counter = 2;
  while (existingNames.includes(`${name} ${counter}`)) counter++;
  return `${name} ${counter}`;
}

// ─────────────────────────────────────────────────────
// SERIES LOGIC
// ─────────────────────────────────────────────────────

// Find the current "open" series for a competition (status = active, < 3 matches, not manually ended)
// or create a new one if none exists / previous one is full/ended.
export async function getOrCreateActiveSeries(competition) {
  // Look for the most recent series for this competition
  const { data: existingSeries, error: seriesErr } = await supabase
    .from("series")
    .select("*, matches(*)")
    .eq("competition", competition)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seriesErr) {
    console.error("getOrCreateActiveSeries fetch error:", seriesErr);
  }

  if (existingSeries) {
    const matchCount = existingSeries.matches?.length ?? 0;
    const isEnded = existingSeries.ended ?? false;

    // Series still has room and hasn't been manually ended
    if (matchCount < 3 && !isEnded) {
      return existingSeries;
    }
  }

  // Need a new series — figure out next series number for this competition
  const { count, error: countErr } = await supabase
    .from("series")
    .select("*", { count: "exact", head: true })
    .eq("competition", competition);

  if (countErr) console.error("series count error:", countErr);

  const nextNum = (count ?? 0) + 1;

  const { data: newSeries, error: createErr } = await supabase
    .from("series")
    .insert({
      competition,
      name: `Series ${nextNum}`,
    })
    .select()
    .single();

  if (createErr) {
    console.error("getOrCreateActiveSeries create error:", createErr);
    return null;
  }

  return newSeries;
}

// Get series winner status — used to decide if 3rd match is even needed
export function getSeriesStatus(seriesMatches, teamA, teamB) {
  const completed = seriesMatches.filter(m => m.status === "completed" && m.result_winner);
  const winsA = completed.filter(m => m.result_winner === teamA).length;
  const winsB = completed.filter(m => m.result_winner === teamB).length;

  let decided = false;
  let winner  = null;

  if (winsA >= 2) { decided = true; winner = teamA; }
  if (winsB >= 2) { decided = true; winner = teamB; }

  return { winsA, winsB, decided, winner, matchesPlayed: completed.length };
}

// ── Fetch latest series for a competition ──
export async function fetchLatestSeries(competition) {
  const { data, error } = await supabase
    .from("series")
    .select("*")
    .eq("competition", competition) // omit this if you only have one competition
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchLatestSeries error:", error);
    return null;
  }

  return data;
}

// Manually mark a series as ended (e.g. winner decided 2-0, skip match 3)
export async function endSeriesInDB(seriesId, winner = null) {
  const { error } = await supabase
    .from("series")
    .update({ ended: true, winner })
    .eq("id", seriesId);

  if (error) console.error("endSeriesInDB error:", error);
}

// Fetch all series for a competition (for series list page later)
export async function fetchSeriesByCompetition(competition) {
  const { data, error } = await supabase
    .from("series")
    .select("*, matches(*)")
    .eq("competition", competition)
    .order("created_at", { ascending: false });

  if (error) { console.error("fetchSeriesByCompetition error:", error); return []; }
  return data;
}

// ── Fetch all data needed for stats page ─────────────────────────────────────
// Returns series, matches, deliveries, players all in one go for a competition
export async function fetchStatsData(competition) {
  const [matchPlayersRes, seriesRes, matchesRes, playersRes] = await Promise.all([
  supabase
    .from("match_players")
    .select("*"),

  supabase
    .from("series")
    .select("*, matches(id, date, batting_first, fielding_first, result_winner, status)")
    .eq("competition", competition)
    .order("created_at", { ascending: true }),

  supabase
    .from("matches")
    .select("id, date, batting_first, fielding_first, result_winner, status, series_id")
    .eq("competition", competition)
    .eq("status", "completed")
    .neq("result_type", "abandoned"),

  supabase
    .from("players")
    .select("*"),
]);

const series = seriesRes.data ?? [];
const matches = matchesRes.data ?? [];
const players = playersRes.data ?? [];
const matchPlayers = matchPlayersRes.data ?? [];

  // Fetch all deliveries for completed matches in one query
  const matchIds = matches.map(m => m.id);
  let deliveries = [];

  if (matchIds.length > 0) {
    const { data: dels } = await supabase
      .from("deliveries")
      .select("*")
      .in("match_id", matchIds)
      .order("over_num",  { ascending: true })
      .order("ball_num",  { ascending: true });

    deliveries = dels ?? [];
  }

  const playersById = {};
  for (const p of players) playersById[p.id] = p;

  return { series, matches, deliveries, players, playersById, matchPlayers };
}

// ── Fetch live match with full state for recovery ─────────────────────────────
export async function fetchLiveMatchForRecovery() {
  const { data: match, error } = await supabase
    .from("matches")
    .select("*, innings(*)")
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !match) return null;
  return match;
}