// Computes how many times each player needs to bat to simulate 11 total
// batting slots from N real players.
//
// Example: N=6  -> floor(11/6)=1 base innings each, 11-6=5 players get +1 (so 5 bat twice, 1 bats once)
// Example: N=5  -> floor(11/5)=2 base innings each, 11-10=1 player gets +1 (so 4 bat twice, 1 bats thrice)
// Example: N=11 -> floor(11/11)=1 base innings each, 0 extra (everyone bats exactly once)
//
// Players are allotted extra innings in batting order (first N-in-order get
// the extra turn) so it's deterministic and fair across a match.

export function computeInningsAllowance(playerCount) {
  if (playerCount <= 0) return { baseInnings: 0, extraPlayers: 0, maxInnings: 0 };

  const baseInnings  = Math.floor(11 / playerCount);
  const extraPlayers = 11 - baseInnings * playerCount; // how many players get +1 turn
  const maxInnings    = extraPlayers > 0 ? baseInnings + 1 : baseInnings;

  return { baseInnings, extraPlayers, maxInnings };
}

// Per-player max innings allowed, assigned in batting order.
// Returns a map: playerId -> maxInningsForThisPlayer
export function buildPerPlayerAllowance(roster) {
  const { n } = { n: roster.length };
  const { baseInnings, extraPlayers } = computeInningsAllowance(roster.length);

  const allowance = {};
  roster.forEach((player, index) => {
    // First `extraPlayers` players (in given order) get the bonus innings
    allowance[player.id] = index < extraPlayers ? baseInnings + 1 : baseInnings;
  });

  return allowance;
}

// Human-readable summary for the roster setup screen
export function describeInningsAllowance(playerCount) {
  const { baseInnings, extraPlayers, maxInnings } = computeInningsAllowance(playerCount);

  if (playerCount >= 11) {
    return "All players bat once";
  }

  if (baseInnings === 1 && extraPlayers > 0) {
    return `${extraPlayers} player${extraPlayers > 1 ? "s" : ""} will bat twice`;
  }

  if (baseInnings >= 2 && extraPlayers === 0) {
    return `All players will bat ${baseInnings} times`;
  }

  if (baseInnings >= 2 && extraPlayers > 0) {
    return `${extraPlayers} player${extraPlayers > 1 ? "s" : ""} will bat ${maxInnings} times, rest bat ${baseInnings} times`;
  }

  return `Players bat up to ${maxInnings} times`;
}