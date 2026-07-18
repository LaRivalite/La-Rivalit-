// ratingEngine.js
// Impact-based player ratings weighted by match phase and context.
//
// Batting:
//   Runs:        powerplay ×1.0, middle ×1.5, death ×2.0
//   Strike Rate: powerplay ×1.0, middle ×1.5, death ×2.0
//   Chase bonus: ×1.3 multiplier if team won chasing
//
// Bowling:
//   Wickets:  powerplay ×1.5, middle ×1.0, death ×2.0
//   Economy:  runs saved vs baseline (8.0 rpo) — death ×2.0, powerplay ×1.5, middle ×1.0
//
// Fielding:
//   Each catch/stumping/runout = fixed 10 points
//
// Final: normalize batting/bowling/fielding separately to 0-100,
//        overall = weighted average (bat 40%, bowl 40%, field 20%)

const PHASE = {
  powerplay: { min: 1,  max: 6  },
  middle:    { min: 7,  max: 15 },
  death:     { min: 16, max: 20 },
};

const BAT_RUN_WEIGHT  = { powerplay: 1.0, middle: 1.5, death: 2.0 };
const BAT_SR_WEIGHT   = { powerplay: 1.0, middle: 1.5, death: 2.0 };
const BOWL_WKT_WEIGHT = { powerplay: 1.5, middle: 1.0, death: 2.0 };
const BOWL_ECO_WEIGHT = { powerplay: 1.5, middle: 1.0, death: 2.0 };
const ECONOMY_BASELINE = 8.0; // runs per over — below this = bonus, above = penalty
const FIELDING_POINTS  = 5;
const CHASE_MULTIPLIER = 1.2;

function getPhase(overNum) {
  const over = overNum + 1; // 1-indexed
  if (over <= 6)  return "powerplay";
  if (over <= 15) return "middle";
  return "death";
}

export function computePlayerRatings(deliveries, matches, playersById) {
  // Build set of match IDs where team batting second won (successful chases)
  const chaseWinMatchIds = new Set(
    matches
      .filter(m => m.status === "completed" && m.result_winner === m.fielding_first)
      .map(m => m.id)
  );

  const raw = {}; // playerId -> { batPoints, bowlPoints, fieldPoints }

  function ensure(id) {
    if (!raw[id]) raw[id] = {
      id,
      name: playersById[id]?.name ?? "Unknown",
      team: playersById[id]?.team ?? "?",
      batPoints:   0,
      bowlPoints:  0,
      fieldPoints: 0,
      // For SR calculation per phase
      batRuns:  { powerplay: 0, middle: 0, death: 0 },
      batBalls: { powerplay: 0, middle: 0, death: 0 },
      // For economy per phase
      bowlRuns:  { powerplay: 0, middle: 0, death: 0 },
      bowlBalls: { powerplay: 0, middle: 0, death: 0 },
    };
    return raw[id];
  }

  // Sort for consistent processing
  const sorted = [...deliveries].sort((a, b) =>
    a.over_num !== b.over_num ? a.over_num - b.over_num : a.ball_num - b.ball_num
  );

  for (const d of sorted) {
    const phase   = getPhase(d.over_num);
    const isLegal = d.wide === 0 && d.no_ball === 0;
    const isChaseMatch = d.innings_num === 2 && chaseWinMatchIds.has(d.match_id);
    const chaseBonus   = isChaseMatch ? CHASE_MULTIPLIER : 1.0;

    // ── Batting ──────────────────────────────────────────
    const batter = ensure(d.striker_id);

    if (d.runs_off_bat > 0) {
      batter.batPoints += d.runs_off_bat * BAT_RUN_WEIGHT[phase] * chaseBonus;
    }

    if (isLegal) {
      batter.batRuns[phase]  += d.runs_off_bat;
      batter.batBalls[phase] += 1;
    }

    // ── Bowling ──────────────────────────────────────────
    const bowler = ensure(d.bowler_id);

    if (d.is_wicket) {
      bowler.bowlPoints += 20 * BOWL_WKT_WEIGHT[phase]; // 20 base points per wicket
    }

    if (isLegal) {
      bowler.bowlRuns[phase]  += d.total_runs;
      bowler.bowlBalls[phase] += 1;
    }

    // ── Fielding ─────────────────────────────────────────
    if (d.is_wicket && d.fielder_id) {
      const fielder = ensure(d.fielder_id);
      fielder.fieldPoints += FIELDING_POINTS;
    }
  }

  // ── Add SR impact to batting points ──────────────────────────────────────
  for (const p of Object.values(raw)) {
    for (const phase of ["powerplay", "middle", "death"]) {
      if (p.batBalls[phase] >= 5) { // min 3 balls to count SR
        const sr = (p.batRuns[phase] / p.batBalls[phase]) * 100;
        // SR impact: (SR - 100) * weight * 0.1
        // So SR 150 in death = (150-100) * 2.0 * 0.1 = +10 pts
        // SR 60 in powerplay = (60-100) * 1.0 * 0.1 = -4 pts
        const srImpact = (sr - 100) * BAT_SR_WEIGHT[phase] * 0.1;
        p.batPoints += srImpact;
      }
    }

    // ── Add economy impact to bowling points ─────────────────────────────
    for (const phase of ["powerplay", "middle", "death"]) {
      if (p.bowlBalls[phase] >= 6) { // min 1 over to count economy
        const overs = p.bowlBalls[phase] / 6;
        const econ  = p.bowlRuns[phase] / overs;
        // Economy impact: (baseline - econ) * weight * 2
        // Below baseline = positive, above = negative
        const econImpact = (ECONOMY_BASELINE - econ) * BOWL_ECO_WEIGHT[phase] * 2;
        p.bowlPoints += econImpact;
      }
    }

    // Clamp to 0 minimum (can't go negative)
    p.batPoints   = Math.max(0, p.batPoints);
    p.bowlPoints  = Math.max(0, p.bowlPoints);
    p.fieldPoints = Math.max(0, p.fieldPoints);
  }

  // ── Normalize each category to 0-100 ────────────────────────────────────
  const allPlayers = Object.values(raw);

  const maxBat   = Math.max(...allPlayers.map(p => p.batPoints),   1);
  const maxBowl  = Math.max(...allPlayers.map(p => p.bowlPoints),  1);
  const maxField = Math.max(...allPlayers.map(p => p.fieldPoints), 1);

  return allPlayers.map(p => {
    const batRating   = Math.round((p.batPoints   / (maxBat*1.1))   * 100);
    const bowlRating  = Math.round((p.bowlPoints  / (maxBowl*1.1))  * 100);
    const fieldRating = Math.round((p.fieldPoints / (maxField*1.1))  * 100);

    // Overall: bat 40%, bowl 40%, field 20%
    const overall = Math.round(batRating * 0.4 + bowlRating * 0.4 + fieldRating * 0.2);

    return {
      id:   p.id,
      name: p.name,
      team: p.team,
      batRating,
      bowlRating,
      fieldRating,
      overall,
      // Raw phase breakdowns for tooltip/detail
      phases: {
        bat:  p.batRuns,
        bowl: p.bowlRuns,
      },
    };
  }).sort((a, b) => b.overall - a.overall);
}

// Rating tier label
export function ratingTier(rating) {
  if (rating >= 85) return { label: "Elite",    color: "text-yellow-400" };
  if (rating >= 70) return { label: "Excellent", color: "text-green-400"  };
  if (rating >= 55) return { label: "Good",      color: "text-blue-400"   };
  if (rating >= 40) return { label: "Average",   color: "text-zinc-300"   };
  return                    { label: "Developing",color: "text-zinc-500"   };
}