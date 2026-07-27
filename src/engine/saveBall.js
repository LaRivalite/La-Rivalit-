import { createBall } from "./createBall";
import { saveDeliveryToDB } from "../lib/matchApi";

export function saveBall(match, setMatch, data, closeSheet, syncInningsToDB) {
  const ball = createBall({
    over:       match.over,
    ball:       match.ball,
    striker:    match.striker.id,
    nonStriker: match.nonStriker.id,
    bowler:     match.bowler.id,
    runsOffBat: data.runsOffBat ?? 0,
    wide:       data.wide    ?? 0,
    noBall:     data.noBall  ?? 0,
    byes:       data.byes    ?? 0,
    wicket:     data.wicket  ?? null,
    freeHit:    data.freeHit ?? false,
  });

  let nextStateForDB = null;

  setMatch((prev) => {
    const next = applyBall(prev, ball);

    if (data.newBatter) {
      const newBatterObj = {
        id: data.newBatter.id, name: data.newBatter.name,
        runs: 0, balls: 0, fours: 0, sixes: 0,
      };

      const originalStrikerId = prev.striker.id;
const originalNonStrikerId = prev.nonStriker.id;

const outId = data.wicket?.outBatterId ?? originalStrikerId;

// Replace whichever batter in NEXT has the dismissed player's ID
if (next.striker.id === outId) {
  next.striker = newBatterObj;
} else if (next.nonStriker.id === outId) {
  next.nonStriker = newBatterObj;
}

      next.players = next.players.map(p =>
        p.id === data.newBatter.id ? { ...p, battingInnings: p.battingInnings + 1 } : p
      );
    }

    if (data.isRetiredHurt && data.retiredPlayerId) {
      next.players = next.players.map(p =>
        p.id === data.retiredPlayerId ? { ...p, retiredHurt: true } : p
      );
    }

    nextStateForDB = next;
    return next;
  });

  // Save to DB and store queueId/deliveryId back into the last history entry
  if (match.matchId) {
    saveDeliveryToDB({
      matchId:      match.matchId,
      inningsNum:   match.innings,
      overNum:      match.over,
      ballNum:      match.ball,
      strikerId:    match.striker.id,
      nonStrikerId: match.nonStriker.id,
      bowlerId:     match.bowler.id,
      runsOffBat:   ball.runsOffBat,
      wide:         ball.extras.wide,
      noBall:       ball.extras.noBall,
      byes:         ball.extras.byes,
      totalRuns:    ball.totalRuns,
      isWicket:     !!ball.wicket,
      wicketType:   ball.wicket?.type ?? null,
      wicketBatter: ball.wicket?.outBatterId ?? null,
      fielderId:    ball.wicket?.fielder ?? null,
      isFreeHit:    ball.freeHit,
    }).then(result => {
      if (!result) return;
      // Store the queueId or deliveryId into the last history ball
      // so undoLastBall knows how to delete it
      setMatch(prev => {
        if (!prev || prev.history.length === 0) return prev;
        const history = [...prev.history];
        const last = { ...history[history.length - 1] };
        last.queueId    = result.queueId    ?? null;
        last.deliveryId = result.deliveryId ?? null;
        history[history.length - 1] = last;
        return { ...prev, history };
      });
    }).catch(err => console.error("Delivery save failed:", err));
  }


  if (syncInningsToDB && nextStateForDB) {
    syncInningsToDB(nextStateForDB).catch(err => console.error("Innings sync failed:", err));
  }

  if (closeSheet) closeSheet();
}

export function applyBall(prev, ball) {
  let striker         = { ...prev.striker };
  let nonStriker      = { ...prev.nonStriker };
  let bowler          = { ...prev.bowler };
  let players         = prev.players.map(p => ({ ...p }));
  let fieldingPlayers = (prev.fieldingPlayers || []).map(p => ({ ...p }));

  let score   = prev.score + ball.totalRuns;
  let wickets = prev.wickets;
  let over    = prev.over;
  let ballNum = prev.ball;
  let freeHit = prev.freeHit;

  let lastOver          = [...prev.lastOver];
  let completedOvers    = prev.completedOvers.map(o => ({ ...o }));
  let overJustCompleted = false;
  let inningsJustEnded  = false;

  if (ball.legalDelivery) {
    striker.runs  += ball.runsOffBat;
    striker.balls += 1;
    if (ball.runsOffBat === 4) striker.fours++;
    if (ball.runsOffBat === 6) striker.sixes++;
  }

  bowler.runs += ball.totalRuns;
  if (ball.legalDelivery) {
    bowler.balls = (bowler.balls || 0) + 1;
    bowler.overs = Math.floor(bowler.balls / 6) + (bowler.balls % 6) / 10;
  }

  let label;
  if (ball.wicket) {
    const runsOnWicketBall = ball.runsOffBat + ball.extras.byes;
    label = runsOnWicketBall > 0 ? `${runsOnWicketBall}W` : "W";
  } else if (ball.extras.wide) {
    label = ball.extras.byes > 0 ? `${1 + ball.extras.byes}wd` : "wd";
  } else if (ball.extras.noBall) {
    const runsOnNB = ball.runsOffBat + ball.extras.byes;
    label = runsOnNB > 0 ? `${1 + runsOnNB}nb` : "nb";
  } else if (ball.extras.byes) {
    label = `${ball.extras.byes}b`;
  } else {
    label = ball.runsOffBat.toString();
  }

  lastOver.push(label);

  if (ball.wicket) {
    wickets++;
    if (ball.wicket.type !== "retired" && ball.wicket.type !== "runout") {
      bowler.wickets++;
    }
    const dismissedId = ball.wicket?.outBatterId ?? ball.striker;
    players = players.map(p =>
      p.id === dismissedId ? { ...p, dismissals: p.dismissals + 1 } : p
    );
  }

  const target = prev.target;
  if (target && score >= target) inningsJustEnded = true;
  if (wickets >= 10) inningsJustEnded = true;

  freeHit = ball.extras.noBall > 0;

  if (ball.legalDelivery && !inningsJustEnded) {
    ballNum++;

    if (ballNum === 6) {
      const completedOverNumber = over + 1;
      completedOvers = [
        {
          over: completedOverNumber,
          balls: [...lastOver],
          runs: lastOver.reduce((sum, b) => sum + (parseInt(b) || 0), 0),
          wickets: lastOver.filter(b => b.includes("W")).length,
        },
        ...completedOvers,
      ];

      lastOver = [];
      over++;
      ballNum = 0;

      if (over >= 20) inningsJustEnded = true;
      else overJustCompleted = true;

      fieldingPlayers = fieldingPlayers.map(p =>
        p.id === bowler.id
          ? { ...p, bowlingOvers: p.bowlingOvers + 1, lastBowledOver: over - 1 }
          : p
      );

      if (!inningsJustEnded) [striker, nonStriker] = [nonStriker, striker];
    }
  }

  // Strike rotation for ALL balls including wickets (run outs with runs)
  if (!inningsJustEnded) {
    const runsForStrike = ball.runsOffBat + ball.extras.byes;
    if (runsForStrike % 2 === 1) [striker, nonStriker] = [nonStriker, striker];
  }

  const snapshot = { ...prev, overJustCompleted: false, inningsJustEnded: false };

  return {
    ...prev,
    score, wickets, over, ball: ballNum, freeHit,
    striker, nonStriker, bowler,
    players, fieldingPlayers,
    lastOver, completedOvers,
    overJustCompleted,
    inningsJustEnded,
    history: [...prev.history, { ...ball, snapshot }],
  };
}