// crypto.randomUUID() fails on HTTP (non-HTTPS) and older Android browsers
// Use a simple fallback ID generator instead
function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBall({
  over,
  ball,
  striker,
  nonStriker,
  bowler,
  runsOffBat = 0,
  wide    = 0,
  noBall  = 0,
  byes    = 0,
  wicket  = null,
  freeHit = false,
}) {
  return {
    id: makeId(),
    over,
    ball,
    striker,
    nonStriker,
    bowler,
    legalDelivery: wide === 0 && noBall === 0,
    runsOffBat,
    extras: { wide, noBall, byes },
    totalRuns: runsOffBat + wide + noBall + byes,
    wicket,
    freeHit,
    timestamp: Date.now(),
  };
}