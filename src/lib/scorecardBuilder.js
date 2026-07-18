export function buildScorecard(deliveries, playersById) {
  const byInnings = {};
  for (const d of deliveries) {
    if (!byInnings[d.innings_num]) byInnings[d.innings_num] = [];
    byInnings[d.innings_num].push(d);
  }

  return Object.keys(byInnings)
    .sort((a, b) => a - b)
    .map(num => buildInningsCard(byInnings[num], playersById, Number(num)));
}

function buildInningsCard(deliveries, playersById, inningsNum) {
  // Track batting spells — each dismissal starts a new spell for same player
  const spells = [];
  const spellMap = {}; // strikerId -> current spell index in spells array
  const dismissedCount = {}; // strikerId -> how many times dismissed so far

  const bowling = {};
  const overRunsByBowler = {};

  let score = 0, wickets = 0, legalBalls = 0;
  const extras = { wide: 0, noBall: 0, byes: 0 };

  const sorted = [...deliveries].sort((a, b) =>
    a.over_num !== b.over_num ? a.over_num - b.over_num : a.ball_num - b.ball_num
  );

  function ensureSpell(playerId) {
  if (!playerId) return;

  if (spellMap[playerId] === undefined) {
    spellMap[playerId] = spells.length;

    spells.push({
      id: playerId,
      name: playersById[playerId]?.name ?? "Unknown",
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      dismissed: false,
      howOut: null,
      spellIndex: dismissedCount[playerId] ?? 0,
    });
  }
}

  for (const d of sorted) {
    const sid = d.striker_id;
    const isLegal = d.wide === 0 && d.no_ball === 0;

    ensureSpell(d.striker_id);
    ensureSpell(d.non_striker_id);

    const spell = spells[spellMap[sid]];
    spell.runs += d.runs_off_bat;
    if (isLegal) spell.balls += 1;
    if (d.runs_off_bat === 4) spell.fours++;
    if (d.runs_off_bat === 6) spell.sixes++;

    if (d.is_wicket) {
  wickets++;

  const outId = d.wicket_batter;

  if (outId && spellMap[outId] !== undefined) {
      const outSpell = spells[spellMap[outId]];

      outSpell.dismissed = true;
      outSpell.howOut = formatDismissal(d, playersById);

      dismissedCount[outId] = (dismissedCount[outId] ?? 0) + 1;
      delete spellMap[outId];
    }
  }

    // ── Bowling ──
    if (!bowling[d.bowler_id]) {
      bowling[d.bowler_id] = {
        id: d.bowler_id,
        name: playersById[d.bowler_id]?.name ?? "Unknown",
        balls: 0, runs: 0, wickets: 0, maidens: 0,
      };
    }
    const bwl = bowling[d.bowler_id];
    bwl.runs += d.total_runs;
    if (isLegal) { bwl.balls += 1; legalBalls += 1; }
    if (d.is_wicket && d.wicket_type !== "retired" && d.wicket_type !== "runout") {
      bwl.wickets++;
    }

    const overKey = `${d.bowler_id}-${d.over_num}`;
    overRunsByBowler[overKey] = (overRunsByBowler[overKey] ?? 0) + d.total_runs;

    extras.wide   += d.wide;
    extras.noBall += d.no_ball;
    extras.byes   += d.byes;
    score += d.total_runs;
  }

  // Maidens
  for (const [key, runs] of Object.entries(overRunsByBowler)) {
    const bid = key.split("-")[0];
    if (bowling[bid] && runs === 0) bowling[bid].maidens++;
  }

  const overs = Math.floor(legalBalls / 6) + (legalBalls % 6) / 10;

  // Fall of wickets — in order
  const fallOfWickets = [];
  let runningScore = 0, wktNum = 0;
  for (const d of sorted) {
    runningScore += d.total_runs;
    if (d.is_wicket) {
      wktNum++;
      fallOfWickets.push({
        wicketNum: wktNum,
        score: runningScore,
        batterName: playersById[d.wicket_batter]?.name ?? "?",
        over: `${d.over_num}.${d.ball_num + 1}`,
      });
    }
  }

  return {
    inningsNum,
    score,
    wickets,
    overs,
    extras,
    totalExtras: extras.wide + extras.noBall + extras.byes,
    batting: spells, // all spells in batting order
    bowling: Object.values(bowling),
    fallOfWickets,
  };
}

function formatDismissal(d, playersById) {
  const fielder = d.fielder_id ? playersById[d.fielder_id]?.name : null;
  const bowler  = playersById[d.bowler_id]?.name ?? "?";
  switch (d.wicket_type) {
    case "bowled":     return `b ${bowler}`;
    case "lbw":        return `lbw b ${bowler}`;
    case "hitwicket":  return `hit wicket b ${bowler}`;
    case "caught":     return `c ${fielder ?? "?"} b ${bowler}`;
    case "stumped":    return `st ${fielder ?? "?"} b ${bowler}`;
    case "runout":     return `run out (${fielder ?? "?"})`;
    default:           return d.wicket_type ?? "out";
  }
}

export function buildOverTimeline(deliveries) {
  const byOver = {};
  for (const d of deliveries) {
    const key = `${d.innings_num}-${d.over_num}`;
    if (!byOver[key]) byOver[key] = { innings: d.innings_num, over: d.over_num, balls: [], runs: 0, wickets: 0 };

    let label;
    if (d.is_wicket) {
      label = d.runs_off_bat > 0 ? d.runs_off_bat.toString() + "W" : "W";
    }
    else if (d.wide > 0) {
      label = d.byes > 0 ? `${d.byes}WD` : "WD";
    }
    else if (d.no_ball > 0) {
      label = d.byes > 0 ? `${d.byes}NB` : d.runs_off_bat > 0 ? `${d.runs_off_bat}NB` : "NB";
    }
    else if (d.byes > 0)    label = `${d.byes}B`;
    else                    label = d.runs_off_bat.toString();

    byOver[key].balls.push(label);
    byOver[key].runs += d.total_runs;
    if (d.is_wicket) byOver[key].wickets++;
  }

  return Object.values(byOver).sort((a, b) =>
    a.innings !== b.innings ? a.innings - b.innings : a.over - b.over
  );
}