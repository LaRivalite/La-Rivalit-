// statsEngine.js
// Computes batting, bowling, fielding, H2H stats from raw deliveries + filters.

import { last } from "lodash";

function getMatchesPlayed(playerId, matchPlayers) {
  return new Set(
    matchPlayers
      .filter(mp => mp.player_id === playerId)
      .map(mp => mp.match_id)
  ).size;
}

// ── Filter deliveries ─────────────────────────────────────────────────────────

export function filterDeliveries(deliveries, { matchIds = null, overRange = null }) {
  return deliveries.filter(d => {
    if (matchIds && !matchIds.includes(d.match_id)) return false;
    if (overRange) {
      const over = d.over_num + 1; // 1-indexed
      if (overRange === "powerplay" && over > 6)              return false;
      if (overRange === "middle"    && (over < 7 || over > 15)) return false;
      if (overRange === "death"     && over < 16)             return false;
    }
    return true;
  });
}

// ── Batting stats ─────────────────────────────────────────────────────────────

export function computeBattingStats(deliveries, playersById, matchPlayers = []) {
  const stats = {};
  const dismissalCounts = {};
  const notOutCounts = {};

  function ensure(id) {
    if (!stats[id]) stats[id] = {
      id,
      name:      playersById[id]?.name ?? "Unknown",
      team:      playersById[id]?.team ?? "?",
      matches:   new Set(),
      innings:   0,
      notOuts:   0,
      runs:      0,
      balls:     0,
      fours:     0,
      sixes:     0,
      highest:   0,
      highestNotOut: false,
      inningsLog: [],
    };
    return stats[id];
  }

  // Build batting spells — a new spell starts each time a player comes to bat.
  // Key: matchId-inningsNum-strikerId-spellIndex (tracks multiple spells per innings)
  // We detect a new spell by tracking whether a player was dismissed in a previous
  // ball in the same match+innings, then appeared again.
  const spells = {}; // spellKey -> { strikerId, runs, balls, dismissed }
  const dismissedInInnings = {}; // `matchId-inningsNum-strikerId` -> count of dismissals so far

  // Sort deliveries chronologically so we process in order
  const sorted = [...deliveries].sort((a, b) =>
    a.over_num !== b.over_num ? a.over_num - b.over_num : a.ball_num - b.ball_num
  );

  const lastBallByInnings = {};

  for (const d of sorted) {
    const s = ensure(d.striker_id);
    s.matches.add(d.match_id);

    const inningsKey = `${d.match_id}-${d.innings_num}-${d.striker_id}`;
    const spellIdx = dismissedInInnings[inningsKey] ?? 0;
    const spellKey = `${inningsKey}-${spellIdx}`;

    if (!spells[spellKey]) {
      spells[spellKey] = { strikerId: d.striker_id, runs: 0, balls: 0, dismissed: false };
    }

    const isLegal = d.wide === 0 && d.no_ball === 0;
    spells[spellKey].runs += d.runs_off_bat;
    if (isLegal) spells[spellKey].balls += 1;

    if (d.is_wicket) {
        if (dismissalCounts[d.wicket_batter])
          dismissalCounts[d.wicket_batter] = dismissalCounts[d.wicket_batter] + 1;
        else
          dismissalCounts[d.wicket_batter] = 1;
      }

    const key = `${d.match_id}-${d.innings_num}`;

      if (
        !lastBallByInnings[key] ||
        d.over_num > lastBallByInnings[key].over_num ||
        (
          d.over_num === lastBallByInnings[key].over_num &&
          d.ball_num > lastBallByInnings[key].ball_num
        )
      ) {
        lastBallByInnings[key] = d;
      }

    if (d.is_wicket) {
      spells[spellKey].dismissed = true;
      // Increment spell index so next appearance is a new spell
      dismissedInInnings[inningsKey] = spellIdx + 1;
    }

    // Global counters
    s.runs += d.runs_off_bat;
    if (isLegal) s.balls += 1;
    if (d.runs_off_bat === 4) s.fours++;
    if (d.runs_off_bat === 6) s.sixes++;
  }

  // Process spells for innings count, highest, average
  for (const entry of Object.values(spells)) {
    const s = ensure(entry.strikerId);
    s.innings++;
    if (!entry.dismissed) s.notOuts++;
    s.inningsLog.push({ runs: entry.runs, dismissed: entry.dismissed });

    if (entry.runs > s.highest) {
      s.highest = entry.runs;
      s.highestNotOut = !entry.dismissed;
    }
  }

  for (const lastBall of Object.values(lastBallByInnings)) {
    
      if (lastBall.striker_id && lastBall.striker_id != lastBall.wicket_batter) {
        if (notOutCounts[lastBall.striker_id])
          notOutCounts[lastBall.striker_id] = notOutCounts[lastBall.striker_id] + 1;
        else
          notOutCounts[lastBall.striker_id] = 1
      }

      if (
        lastBall.non_striker_id &&
        lastBall.non_striker_id !== lastBall.striker_id &&
        lastBall.non_striker_id != lastBall.wicket_batter
      ) {
        if (notOutCounts[lastBall.non_striker_id])
          notOutCounts[lastBall.non_striker_id] = notOutCounts[lastBall.non_striker_id] + 1;
        else
          notOutCounts[lastBall.non_striker_id] = 1
      }
    }


  return Object.values(stats).map(s => {
    const dismissals = dismissalCounts[s.id] || 0;
    const notOuts = notOutCounts[s.id] || 0;
    const innings = dismissals + notOuts;
    const avg = dismissals > 0 ? s.runs / dismissals : (s.runs > 0 ? Infinity : 0);
    const sr  = s.balls > 0 ? (s.runs / s.balls) * 100 : 0;

    return {
      ...s,
      matchesPlayed: getMatchesPlayed(s.id, matchPlayers),
      innings: innings,
      average:    avg === Infinity ? "N/O" : avg.toFixed(1),
      strikeRate: sr.toFixed(1),
      highestDisplay: `${s.highest}${s.highestNotOut ? "*" : ""}`,
    };
  }).sort((a, b) => b.runs - a.runs);
}

// ── Bowling stats ─────────────────────────────────────────────────────────────

export function computeBowlingStats(deliveries, playersById, matchPlayers = []) {
  const stats = {};

  function ensure(id) {
    if (!stats[id]) stats[id] = {
      id,
      name:    playersById[id]?.name ?? "Unknown",
      team:    playersById[id]?.team ?? "?",
      matches: new Set(),
      balls:   0,
      runs:    0,
      wickets: 0,
      maidens: 0,
      best:    { wickets: 0, runs: 999 },
      spells:  {},
    };
    return stats[id];
  }

  for (const d of deliveries) {
    const s = ensure(d.bowler_id);
    s.matches.add(d.match_id);

    const isLegal = d.wide === 0 && d.no_ball === 0;
    s.runs += d.total_runs;
    if (isLegal) s.balls += 1;
    if (d.is_wicket && d.wicket_type !== "retired" && d.wicket_type !== "runout") {
      s.wickets++;
    }

    const spellKey = `${d.match_id}-${d.innings_num}`;
    if (!s.spells[spellKey]) s.spells[spellKey] = { balls: 0, runs: 0, wickets: 0, overRuns: {} };
    const spell = s.spells[spellKey];
    if (isLegal) spell.balls += 1;
    spell.runs += d.total_runs;
    if (d.is_wicket && d.wicket_type !== "retired" && d.wicket_type !== "runout") {
      spell.wickets++;
    }
    spell.overRuns[d.over_num] = (spell.overRuns[d.over_num] ?? 0) + d.total_runs;
  }

  return Object.values(stats).map(s => {
    let best = { wickets: 0, runs: 999 };
    let maidens = 0;

    for (const spell of Object.values(s.spells)) {
      if (spell.wickets > best.wickets || (spell.wickets === best.wickets && spell.runs < best.runs)) {
        best = { wickets: spell.wickets, runs: spell.runs };
      }
      for (const runs of Object.values(spell.overRuns)) {
        if (runs === 0) maidens++;
      }
    }

    const economy    = s.balls > 0 ? (s.runs / (s.balls / 6)).toFixed(2) : "—";
    const average    = s.wickets > 0 ? (s.runs / s.wickets).toFixed(1) : "—";
    const strikeRate = s.wickets > 0 ? (s.balls / s.wickets).toFixed(1) : "—";

    return {
      ...s,
      matchesPlayed: getMatchesPlayed(s.id, matchPlayers),
      maidens,
      best,
      oversDisplay: `${Math.floor(s.balls / 6)}.${s.balls % 6}`,
      economy, average, strikeRate,
      bestDisplay: best.wickets > 0 ? `${best.wickets}/${best.runs}` : "—",
    };
  }).sort((a, b) => b.wickets - a.wickets || Number(a.economy) - Number(b.economy));
}

// ── Fielding stats ─────────────────────────────────────────────────────────────

export function computeFieldingStats(deliveries, playersById, matchPlayers = []) {
  const stats = {};

  function ensure(id) {
    if (!stats[id]) stats[id] = {
      id,
      name:      playersById[id]?.name ?? "Unknown",
      team:      playersById[id]?.team ?? "?",
      matches:   new Set(),
      catches:   0,
      runOuts:   0,
      stumpings: 0,
    };
    return stats[id];
  }

  for (const d of deliveries) {
    if (!d.is_wicket || !d.fielder_id) continue;
    const s = ensure(d.fielder_id);
    s.matches.add(d.match_id);
    if (d.wicket_type === "caught")  s.catches++;
    if (d.wicket_type === "runout")  s.runOuts++;
    if (d.wicket_type === "stumped") s.stumpings++;
  }

  return Object.values(stats).map(s => ({
    ...s,
    matchesPlayed: getMatchesPlayed(s.id, matchPlayers),
    total: s.catches + s.runOuts + s.stumpings,
  })).sort((a, b) => b.total - a.total);
}

// ── Head to Head ──────────────────────────────────────────────────────────────

export function computeH2H(deliveries, batterId, bowlerId) {
  const relevant = deliveries.filter(
    d => d.striker_id === batterId && d.bowler_id === bowlerId
  );
  if (relevant.length === 0) return null;

  const dismissalCounts = {};
  const notOutCounts = {};

  for (const d of deliveries) {
    if (d.wicket_batter && d.bowler_id == bowlerId) {
      dismissalCounts[d.wicket_batter] =
        (dismissalCounts[d.wicket_batter] || 0) + 1;
    }
  }

  const lastBallByInnings = {};

for (const d of deliveries) {
  const key = `${d.match_id}-${d.innings_num}`;

  if (
    !lastBallByInnings[key] ||
    d.over_num > lastBallByInnings[key].over_num ||
    (
      d.over_num === lastBallByInnings[key].over_num &&
      d.ball_num > lastBallByInnings[key].ball_num
    )
  ) {
    lastBallByInnings[key] = d;
  }
}

for (const lastBall of Object.values(lastBallByInnings)) {
  if (lastBall.striker_id) {
    notOutCounts[lastBall.striker_id] =
      (notOutCounts[lastBall.striker_id] || 0) + 1;
  }

  if (
    lastBall.non_striker_id &&
    lastBall.non_striker_id !== lastBall.striker_id
  ) {
    notOutCounts[lastBall.non_striker_id] =
      (notOutCounts[lastBall.non_striker_id] || 0) + 1;
  }
}

const dismissals = dismissalCounts[batterId] || 0;
const notOuts = notOutCounts[batterId] || 0;
const innings = dismissals + notOuts;

  let runs = 0, balls = 0, fours = 0, sixes = 0;
  for (const d of relevant) {
    const isLegal = d.wide === 0 && d.no_ball === 0;
    runs += d.runs_off_bat;
    if (isLegal) balls++;
    if (d.runs_off_bat === 4) fours++;
    if (d.runs_off_bat === 6) sixes++;
  }

  return {
    runs, balls, dismissals, innings, fours, sixes,
    strikeRate: balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0.0",
    average:    dismissals > 0 ? (runs / dismissals).toFixed(1) : "N/O",
    dotBalls:   relevant.filter(d => d.runs_off_bat === 0 && d.wide === 0).length,
  };
}

// ── Build filter options ──────────────────────────────────────────────────────

export function buildFilterOptions(series) {
  return {
    series: series.map(s => ({
      id:    s.id,
      label: s.name,
      matchIds: (s.matches ?? []).map(m => m.id),
    })),
    overRanges: [
      { id: "powerplay", label: "Powerplay (1-6)" },
      { id: "middle",    label: "Middle (7-15)"   },
      { id: "death",     label: "Death (16-20)"   },
    ],
  };
}

// ── Full H2H comparison ───────────────────────────────────────────────────────

export function computeFullH2H(deliveries, playerAId, playerBId, playersById, matchPlayers = []) {
  const allBatting  = computeBattingStats(deliveries, playersById, matchPlayers);
  const allBowling  = computeBowlingStats(deliveries, playersById, matchPlayers);
  const allFielding = computeFieldingStats(deliveries, playersById, matchPlayers);

  const batA = allBatting.find(p => p.id === playerAId)  ?? null;
  const batB = allBatting.find(p => p.id === playerBId)  ?? null;
  const bowA = allBowling.find(p => p.id === playerAId)  ?? null;
  const bowB = allBowling.find(p => p.id === playerBId)  ?? null;
  const fldA = allFielding.find(p => p.id === playerAId) ?? null;
  const fldB = allFielding.find(p => p.id === playerBId) ?? null;

  const fromOppositeTeams = playersById[playerAId]?.team !== playersById[playerBId]?.team;

  // Vs stats: how A bowls to B, and how B bowls to A
  const vsABowlsB = computeH2H(deliveries, playerBId, playerAId); // B bats, A bowls
  const vsBBowlsA = computeH2H(deliveries, playerAId, playerBId); // A bats, B bowls

  // ── Dominance scoring ─────────────────────────────────────────────────────
  // Each metric returns { aScore, bScore } — raw values, then we normalize
  // We collect weighted points for A and B, then compute A% = aPoints/(aPoints+bPoints)

  const categories = [];

  // ── Batting (weight 3) ────────────────────────────────────────────────────
  // Metrics: runs per innings, SR, average
  // ── Batting (weight 3) ────────────────────────────────────────────────────
if (batA || batB) {

  const aRuns = batA?.runs ?? 0;
  const bRuns = batB?.runs ?? 0;

  const aSR = batA ? parseFloat(batA.strikeRate) || 0 : 0;
  const bSR = batB ? parseFloat(batB.strikeRate) || 0 : 0;

  const aAvg =
    batA?.average === "N/O"
      ? aRuns
      : parseFloat(batA?.average) || 0;

  const bAvg =
    batB?.average === "N/O"
      ? bRuns
      : parseFloat(batB?.average) || 0;


  // Main batting strength
  const runScore = splitScore(
    Math.sqrt(aRuns),
    Math.sqrt(bRuns)
  );


  // Average matters, but less
  const avgScore = splitScore(
    Math.sqrt(aAvg),
    Math.sqrt(bAvg)
  );


  // Strike rate adjustment
  // Small bonus/penalty only
  const aSRModifier = battingStrikeRateModifier(aSR);
  const bSRModifier = battingStrikeRateModifier(bSR);


  let aPoints =
    (runScore.a * 0.70) +
    (avgScore.a * 0.20);

  let bPoints =
    (runScore.b * 0.70) +
    (avgScore.b * 0.20);


  // Apply SR after main scoring
  aPoints *= (1 + aSRModifier);
  bPoints *= (1 + bSRModifier);


  categories.push({
    label: "Batting",
    aPoints,
    bPoints,
    weight: 3
  });
}

  // ── Bowling (weight 3) ────────────────────────────────────────────────────
  // Metrics: wickets per over, economy (lower=better → invert), average (lower=better → invert)
  if (bowA || bowB) {
    const aWPO  = bowA && bowA.balls > 0 ? bowA.wickets / (bowA.balls / 6) : 0;
    const bWPO  = bowB && bowB.balls > 0 ? bowB.wickets / (bowB.balls / 6) : 0;
    const aEcon = bowA ? parseFloat(bowA.economy) || 99 : 99;
    const bEcon = bowB ? parseFloat(bowB.economy) || 99 : 99;
    const aAvg  = bowA ? parseFloat(bowA.average) || 999 : 999;
    const bAvg  = bowB ? parseFloat(bowB.average) || 999 : 999;

    const wpoScore  = splitScore(aWPO, bWPO);         // higher = better
    const aEconAdjusted = aEcon - (economyPenalty(aEcon) * 10);
const bEconAdjusted = bEcon - (economyPenalty(bEcon) * 10);

const econScore = splitScore(
  bEconAdjusted,
  aEconAdjusted
);

const avgScore = splitScore(bAvg, aAvg);


// Economy gets more weight
const aPoints =
  (wpoScore.a * 0.35) +
  (econScore.a * 0.45) +
  (avgScore.a * 0.20);

const bPoints =
  (wpoScore.b * 0.35) +
  (econScore.b * 0.45) +
  (avgScore.b * 0.20);
    categories.push({ label: "Bowling", aPoints, bPoints, weight: 3 });
  }

  // ── Fielding (weight 1) ───────────────────────────────────────────────────
  if (fldA || fldB) {
    const aTotal = fldA?.total ?? 0;
    const bTotal = fldB?.total ?? 0;
    const s = splitScore(aTotal, bTotal);
    categories.push({ label: "Fielding", aPoints: s.a, bPoints: s.b, weight: 1 });
  }

  // ── Head to Head (weight 2, only opposite teams) ──────────────────────────
  if (fromOppositeTeams && (vsABowlsB || vsBBowlsA)) {
    // When A bowls to B: lower SR for B = A wins as bowler
    // When B bowls to A: lower SR for A = B wins as bowler
    // We score from A's perspective:
    //   A bowling well = A gets points
    //   A batting well = A gets points

    let aPoints = 0, bPoints = 0, count = 0;

    if (vsABowlsB && vsABowlsB.balls > 0) {
      // B's SR when facing A — lower is better FOR A
      const bSR = parseFloat(vsABowlsB.strikeRate) || 0;
      const bDismRate = vsABowlsB.balls > 0 ? vsABowlsB.dismissals / vsABowlsB.balls * 6 : 0;
      // A gets points for lower B SR and higher dismissal rate
      aPoints += (100 - Math.min(bSR, 100)) / 100; // 0-1, higher=A wins
      aPoints += Math.min(bDismRate, 1);             // dismissals per over, capped at 1
      bPoints += Math.min(bSR, 100) / 100;
      bPoints += Math.max(0, 1 - bDismRate);
      count += 2;
    }

    if (vsBBowlsA && vsBBowlsA.balls > 0) {
      // A's SR when facing B — higher is better FOR A
      const aSR = parseFloat(vsBBowlsA.strikeRate) || 0;
      const aDismRate = vsBBowlsA.balls > 0 ? vsBBowlsA.dismissals / vsBBowlsA.balls * 6 : 0;
      aPoints += Math.min(aSR, 200) / 200;
      aPoints += Math.max(0, 1 - aDismRate);
      bPoints += (200 - Math.min(aSR, 200)) / 200;
      bPoints += Math.min(aDismRate, 1);
      count += 2;
    }

    if (count > 0) {
      categories.push({
        label: "Head to Head",
        aPoints: aPoints / count,
        bPoints: bPoints / count,
        weight: 2,
      });
    }
  }

  // ── Final dominance ───────────────────────────────────────────────────────
  let dominanceA = 50;
  const categoryScores = categories.map(c => {
    const total = c.aPoints + c.bPoints;
    const aFrac = total > 0 ? c.aPoints / total : 0.5;
    return { ...c, score: aFrac };
  });

  if (categoryScores.length > 0) {
    const totalWeight = categoryScores.reduce((s, c) => s + c.weight, 0);
    const weighted    = categoryScores.reduce((s, c) => s + c.score * c.weight, 0);
    dominanceA = Math.round((weighted / totalWeight) * 100);
  }

  return {
    playerA: playersById[playerAId],
    playerB: playersById[playerBId],
    batting:  { a: batA,  b: batB  },
    bowling:  { a: bowA,  b: bowB  },
    fielding: { a: fldA,  b: fldB  },
    vsABowlsB,
    vsBBowlsA,
    dominanceA,
    dominanceB: 100 - dominanceA,
    categoryScores,
    fromOppositeTeams,
  };
}

function battingStrikeRateModifier(sr) {

  // Strike rate is a secondary factor.
  // It should not overturn huge run differences.

  if (sr >= 130) return 0.08;
  if (sr >= 110) return 0.04;
  if (sr >= 90)  return 0;

  if (sr >= 80)  return -0.03;
  if (sr >= 70)  return -0.06;
  if (sr >= 60)  return -0.10;
  
  return -0.15;
}


function economyPenalty(econ) {
  // Economy is a major factor.
  // 6.0  = 0
  // 8.0  = -0.20
  // 10.0 = -0.50
  // 12+  = -0.80

  if (econ <= 6) return 0;

  return Math.max(-0.8, -(econ - 6) / 7.5);
}
// Returns { a, b } points where a+b=1, both in [0,1]
// If a > b: a gets more; if equal: 0.5/0.5
function splitScore(a, b) {
  if (a === b || (a === 0 && b === 0)) return { a: 0.5, b: 0.5 };
  const total = Math.abs(a) + Math.abs(b);
  return { a: Math.abs(a) / total, b: Math.abs(b) / total };
}