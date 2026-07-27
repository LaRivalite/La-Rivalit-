import { applyBall } from "./saveBall";
import { saveDeliveryToDB } from "../lib/matchApi";

// Used by ActionGrid for simple run buttons (0,1,2,3,4,6 — no extras/wicket)
export function recordBall(ball, match, setMatch, syncInningsToDB) {
  let nextStateForDB = null;

  setMatch(prev => {
    const next = applyBall(prev, ball);
    nextStateForDB = next;
    return next;
  });

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
    wide: 0,
    noBall: 0,
    byes: 0,
    totalRuns:    ball.totalRuns,
    isWicket:     false,
    wicketType:   null,
    fielderId:    null,
    isFreeHit:    ball.freeHit,
  })
  .then(result => {
    if (!result) return;

    setMatch(prev => {

      if (!prev || prev.history.length === 0) return prev;


      const history = [...prev.history];

      const last = {
        ...history[history.length - 1],
        queueId: result.queueId ?? null,
        deliveryId: result.deliveryId ?? null,
      };

      history[history.length - 1] = last;

      return {
        ...prev,
        history,
      };
    });
  })
  .catch(err => console.error("Delivery save failed:", err));
}

  if (syncInningsToDB && nextStateForDB) {
    syncInningsToDB(nextStateForDB).catch(err => console.error("Innings sync failed:", err));
  }
}