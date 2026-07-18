import { computeInningsAllowance } from "./inningsAllowance";

// Who can come in to bat next?
export function availableBatters(match) {
  const strikerId    = match.striker.id;
  const nonStrikerId = match.nonStriker.id;
  const players      = match.players;

  const { baseInnings, extraPlayers } = computeInningsAllowance(players.length);

  // Everyone must have batted at least once before anyone bats again
  // const everyoneBattedOnce = players.every(p => p.battingInnings >= 1);
  const everyoneBattedOnce = players.every(p => p.battingInnings >= 0);

  // Everyone must have batted their base innings before anyone bats again
  const everyoneBattedBase = players.every(p => p.battingInnings >= baseInnings);

  return players.filter((p, index) => {
    if (p.id === strikerId || p.id === nonStrikerId) return false;
    if (p.retiredHurt) return false;

    // Per-player max: first extraPlayers in list get +1
    // const myMax = index < extraPlayers ? baseInnings + 1 : baseInnings;
    const myMax = 5;

    // Already used all their turns
    if (p.dismissals >= myMax) return false;

    // Gate: can't come back for next innings until everyone has finished
    // their current round of batting
    if (p.battingInnings >= 1 && !everyoneBattedOnce) return false;
    if (baseInnings >= 2 && p.battingInnings >= baseInnings && !everyoneBattedBase) return false;

    return true;
  });
}

// Who can bowl next over?
export function availableBowlers(match) {
  const strikerId    = match.striker.id;
  const nonStrikerId = match.nonStriker.id;
  const currentOver  = match.over;
  const maxOvers     = 4;

  return (match.fieldingPlayers || []).filter(p => {
    if (p.id === strikerId || p.id === nonStrikerId) return false;
    // Can't bowl consecutive overs
    if (p.lastBowledOver === currentOver - 1) return false;
    // Max 4 overs
    if (p.bowlingOvers >= maxOvers) return false;
    return true;
  });
}

export function isInningsOver(match, maxOvers = 20) {
  if (match.wickets >= 10) return true;
  if (match.over >= maxOvers) return true;
  return false;
}