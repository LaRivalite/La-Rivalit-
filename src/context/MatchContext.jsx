import { createContext, useContext, useState, useEffect } from "react";
import {
  createMatchInDB,
  createInningsInDB,
  updateInningsInDB,
  completeMatchInDB,
  ensurePlayerInDB,
  getOrCreateActiveSeries,
  fetchLiveMatchForRecovery,
  saveMatchPlayers,
} from "../lib/matchApi";

const MatchContext = createContext();

export const WICKETS_PER_INNINGS = 10;
export const MAX_OVERS = 20;

const STORAGE_KEY = "la-rivalite-active-match";

export const DEFAULT_ROSTERS = {
  mavericks: [
    { id: "m1", name: "Asmar Shahid" },
    { id: "m2", name: "Moeez Shahid" },
    { id: "m3", name: "Abdullah Saeed" },
    { id: "m4", name: "Ghulam Muhammad" },
    { id: "m5", name: "Afnan Sheikh" },
    { id: "m6", name: "Zaroon Tauseef" },
  ],
  spartans: [
    { id: "s1", name: "Zaid Shahid" },
    { id: "s2", name: "Faiq Haseeb" },
    { id: "s3", name: "Tanzeel Sheikh" },
    { id: "s4", name: "Hanzala Khalid" },
    { id: "s5", name: "Talha Tariq" },
    { id: "s6", name: "Ayyan Tauseef" },
  ],
};

function makePlayers(roster) {
  return roster.map(p => ({
    ...p,
    battingInnings: 0,
    dismissals: 0,
    retiredHurt: false,
    bowlingOvers: 0,
    lastBowledOver: null,
  }));
}

function makeInningsState({ battingTeam, fieldingTeam, battingRoster, fieldingRoster, striker, nonStriker, bowler, innings, matchId, inningsId }) {
  return {
    innings,
    battingTeam,
    fieldingTeam,
    matchId,
    inningsId,

    score: 0,
    wickets: 0,
    over: 0,
    ball: 0,

    freeHit: false,
    overJustCompleted: false,
    inningsJustEnded: false,

    lastOver: [],
    completedOvers: [],

    players: makePlayers(battingRoster).map(p =>
      p.id === striker.id || p.id === nonStriker.id
        ? { ...p, battingInnings: 1 }
        : p
    ),
    fieldingPlayers: makePlayers(fieldingRoster),

    striker: { id: striker.id, name: striker.name, runs: 0, balls: 0, fours: 0, sixes: 0 },
    nonStriker: { id: nonStriker.id, name: nonStriker.name, runs: 0, balls: 0, fours: 0, sixes: 0 },
    bowler: { id: bowler.id, name: bowler.name, overs: 0, balls: 0, runs: 0, wickets: 0 },

    partnership: { runs: 0, balls: 0 },
    history: [],
  };
}

// ── localStorage persistence helpers ──────────────────
function saveToStorage(state) {
  try {
    // Strip snapshots from history before saving — they contain full state
    // copies which grow exponentially and blow the localStorage quota.
    // We only need snapshots in memory for undo; on reload undo is reset anyway.
    const stripped = {
      ...state,
      match: state.match ? {
        ...state.match,
        history: (state.match.history ?? [])
          .slice(-20) // keep last 20 balls max
          .map(({ snapshot, ...ball }) => ball), // remove snapshot from each ball
      } : null,
      innings1: state.innings1 ? {
        ...state.innings1,
        history: [], // innings1 is done, no need to keep history at all
      } : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
  } catch (e) {
    console.error("Failed to save match to localStorage:", e);
    // If still failing (very long match), try saving without history at all
    try {
      const minimal = {
        ...state,
        match: state.match ? { ...state.match, history: [] } : null,
        innings1: state.innings1 ? { ...state.innings1, history: [] } : null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch (e2) {
      console.error("localStorage save failed even with minimal state:", e2);
    }
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function MatchProvider({ children }) {
  // Restore from localStorage — but if the saved match is already completed,
  // clear it so the scorer starts fresh on reload instead of showing old result
  const rawRestored = loadFromStorage();
  const restored = rawRestored?.matchResult ? null : rawRestored;
  if (rawRestored?.matchResult) clearStorage();

  const [match, setMatch]             = useState(restored?.match ?? null);
  const [innings1, setInnings1]       = useState(restored?.innings1 ?? null);
  const [matchResult, setMatchResult] = useState(restored?.matchResult ?? null);
  const [competition, setCompetition] = useState(restored?.competition ?? null);
  const [allRosters, setAllRosters]   = useState(restored?.allRosters ?? null);
  const [recovering, setRecovering]   = useState(false);

  // If localStorage is empty but a live match exists in Supabase,
  // show a recovery prompt on the scorer page
  const [recoveryMatch, setRecoveryMatch] = useState(null);
  useEffect(() => {
    if (match) return; // already have state, no need to recover
    async function checkForLiveMatch() {
      const liveMatch = await fetchLiveMatchForRecovery();
      if (liveMatch) setRecoveryMatch(liveMatch);
    }
    checkForLiveMatch();
  }, []);

  // Persist to localStorage whenever core state changes
  // But never save a completed match — endMatch already cleared storage
  useEffect(() => {
    if (matchResult) return; // match is over, don't re-save
    if (match || innings1) {
      saveToStorage({ match, innings1, matchResult, competition, allRosters });
    }
  }, [match, innings1, matchResult, competition, allRosters]);

  async function startMatch({ competition: comp, battingTeam, fieldingTeam, battingRoster, fieldingRoster, striker, nonStriker, bowler, tossWinner, tossChoice }) {
    setCompetition(comp);
    setAllRosters({ [battingTeam.toLowerCase()]: battingRoster, [fieldingTeam.toLowerCase()]: fieldingRoster });
    setInnings1(null);
    setMatchResult(null);

    // Safety net: make sure every player in both rosters exists in Supabase
    // before any deliveries reference them (avoids foreign key errors)
    const allPlayers = [
      ...battingRoster.map(p => ({ ...p, team: battingTeam })),
      ...fieldingRoster.map(p => ({ ...p, team: fieldingTeam })),
    ];
    await Promise.all(allPlayers.map(p => ensurePlayerInDB({ id: p.id, name: p.name, team: p.team })));

    // Find or create the active series for this competition
    const series = await getOrCreateActiveSeries(comp);
    const seriesId = series?.id ?? null;

    const matchRow = await createMatchInDB({
      competition: comp,
      battingFirst: battingTeam,
      fieldingFirst: fieldingTeam,
      tossWinner,
      tossChoice,
      seriesId,
    });

    const matchId = matchRow?.id ?? null;

if (matchId) {
  await saveMatchPlayers(matchId, [
    ...battingRoster.map(p => ({ ...p, team: battingTeam })),
    ...fieldingRoster.map(p => ({ ...p, team: fieldingTeam })),
  ]);
}

    let inningsId = null;
    if (matchId) {
      const inningsRow = await createInningsInDB({
        matchId, inningsNum: 1, battingTeam, bowlingTeam: fieldingTeam,
      });
      inningsId = inningsRow?.id ?? null;
    }

    setMatch(makeInningsState({
      innings: 1, battingTeam, fieldingTeam, battingRoster, fieldingRoster,
      striker, nonStriker, bowler, matchId, inningsId,
    }));
  }

  function saveInnings1() {
    setInnings1(prev => prev ?? { ...match });
  }

  async function startInnings2({ striker, nonStriker, bowler }) {
    if (!match) return;
    setInnings1(prev => prev ?? { ...match });

    const target = match.score + 1;
    const newBattingTeam  = match.fieldingTeam;
    const newFieldingTeam = match.battingTeam;
    const newBattingRoster  = match.fieldingPlayers;
    const newFieldingRoster = match.players;

    let inningsId = null;
    if (match.matchId) {
      const inningsRow = await createInningsInDB({
        matchId: match.matchId, inningsNum: 2,
        battingTeam: newBattingTeam, bowlingTeam: newFieldingTeam, target,
      });
      inningsId = inningsRow?.id ?? null;
    }

    const newState = makeInningsState({
      innings: 2, battingTeam: newBattingTeam, fieldingTeam: newFieldingTeam,
      battingRoster: newBattingRoster, fieldingRoster: newFieldingRoster,
      striker, nonStriker, bowler, matchId: match.matchId, inningsId,
    });

    setMatch({ ...newState, target });
  }

  async function endMatch(finalMatch) {
    const inn1 = innings1 || match;
    const inn2 = finalMatch || match;
    const target = inn2.target;

    let result;
    if (inn2.score >= target) {
      const wicketsLeft = 10 - inn2.wickets;
      result = { winner: inn2.battingTeam, margin: `${wicketsLeft} wicket${wicketsLeft !== 1 ? "s" : ""}`, type: "wickets" };
    } else if (inn2.score === target - 1) {
      result = { winner: null, margin: "Tie", type: "tie" };
    } else {
      const runsMargin = (target - 1) - inn2.score;
      result = { winner: inn2.fieldingTeam, margin: `${runsMargin} run${runsMargin !== 1 ? "s" : ""}`, type: "runs" };
    }

    setMatchResult(result);

    // Clear localStorage immediately when match ends — don't wait for "New Match" tap.
    // This prevents the scorer from reopening a finished match on page reload.
    clearStorage();

    if (inn2.matchId) {
      await completeMatchInDB({ matchId: inn2.matchId, winner: result.winner, margin: result.margin, type: result.type });
    }
  }

  async function syncInningsToDB(matchState) {
    if (!matchState.inningsId) return;
    const overs = matchState.over + matchState.ball / 10;
    await updateInningsInDB({
      inningsId: matchState.inningsId,
      score: matchState.score,
      wickets: matchState.wickets,
      overs,
    });
  }

  function undoLastBall() {
    setMatch(prev => {
      if (!prev || prev.history.length === 0) return prev;
      const lastBall = prev.history[prev.history.length - 1];
      return { ...lastBall.snapshot, history: prev.history.slice(0, -1) };
    });
  }

  // Call this to fully end the match session and clear local storage
  // (e.g. from a "New Match" button after viewing the result)
  function clearMatchSession() {
    setMatch(null);
    setInnings1(null);
    setMatchResult(null);
    setCompetition(null);
    setAllRosters(null);
    clearStorage();
  }

  return (
    <MatchContext.Provider value={{
      match, setMatch,
      innings1,
      matchResult,
      competition,
      allRosters,
      recovering,
      recoveryMatch,
      startMatch,
      saveInnings1,
      startInnings2,
      endMatch,
      syncInningsToDB,
      undoLastBall,
      clearMatchSession,
      dismissRecovery: () => setRecoveryMatch(null),
    }}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  return useContext(MatchContext);
}