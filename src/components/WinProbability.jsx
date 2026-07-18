// Win probability component for LiveMatch page
// Uses current match situation + historical chase data

export default function WinProbability({ card, match, scorecard, history }) {
  if (!card || !match) return null;

  const isInnings2 = match.innings?.length === 2;
  if (!isInnings2) return null; // only show in 2nd innings

  const inn2 = match.innings?.find(i => i.innings_num === 2);
  if (!inn2?.target) return null;

  const target      = inn2.target;
  const scored      = card.score;
  const wickets     = card.wickets;
  const ballsBowled = Math.floor(card.overs) * 6 + Math.round((card.overs % 1) * 10);
  const ballsLeft   = 120 - ballsBowled;
  const runsNeeded  = Math.max(target - scored, 0);

  if (ballsLeft <= 0 || runsNeeded <= 0) return null;

  const rrr = (runsNeeded / ballsLeft) * 6;
  const crr = ballsBowled > 0 ? (scored / ballsBowled) * 6 : 0;

  // Win probability model:
  // Base: compare CRR vs RRR
  // Adjust for wickets in hand (more wickets = better)
  // Adjust for balls left (more balls = more time to accelerate)

  const wicketsLeft  = 10 - wickets;
  const rrrRatio     = crr / Math.max(rrr, 0.1); // > 1 means batting ahead

  // Base probability from run rate comparison
  // rrrRatio of 1.0 = 50%, above 1 = batting team advantage
  let prob = 50 + (rrrRatio - 1) * 35;

  // Wicket adjustment: each wicket lost reduces probability
  prob -= (10 - wicketsLeft) * 2.5;

  // Phase adjustment: if in death overs with wickets, harder
  if (ballsLeft < 24 && wicketsLeft < 4) prob -= 10;

  // Historical chase factor: use passed history if available
  // (simple: if chases are historically rare, reduce slightly)
  if (history) {
    const chaseRate = history.chaseSuccessRate ?? 0.5;
    prob = prob * 0.8 + chaseRate * 100 * 0.2;
  }

  // Clamp to 5-95 (never certainty until match over)
  prob = Math.max(5, Math.min(95, Math.round(prob)));

  const battingTeam  = card.inningsNum === 2
    ? (match.fielding_first)
    : match.batting_first;
  const bowlingTeam  = card.inningsNum === 2
    ? match.batting_first
    : match.fielding_first;

  const battingProb  = prob;
  const bowlingProb  = 100 - prob;

  const color = battingProb > 60 ? "text-green-400"
              : battingProb < 40 ? "text-red-400"
              : "text-amber-400";

  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4 text-center">
        Win Probability
      </p>

      {/* Bar */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-zinc-400 w-20 truncate text-right">{battingTeam}</span>
        <div className="flex flex-1 rounded-full overflow-hidden h-3 bg-zinc-800">
          <div
            className="bg-green-500 transition-all duration-700"
            style={{ width: `${battingProb}%` }}
          />
          <div
            className="bg-red-500 transition-all duration-700"
            style={{ width: `${bowlingProb}%` }}
          />
        </div>
        <span className="text-xs text-zinc-400 w-20 truncate">{bowlingTeam}</span>
      </div>

      <div className="flex justify-between text-sm font-bold px-1">
        <span className="text-green-400">{battingProb}%</span>
        <span className="text-xs text-zinc-500 self-center">
          Need {runsNeeded} from {ballsLeft} balls • RRR {rrr.toFixed(2)}
        </span>
        <span className="text-red-400">{bowlingProb}%</span>
      </div>

      {/* Momentum indicator */}
      <div className="mt-4 pt-4 border-t border-white/5 text-center">
        <p className={`text-sm font-semibold ${color}`}>
          {battingProb > 65 ? `${battingTeam} heavily favoured` :
           battingProb > 55 ? `${battingTeam} slight edge` :
           battingProb > 45 ? "Too close to call" :
           battingProb > 35 ? `${bowlingTeam} slight edge` :
                              `${bowlingTeam} heavily favoured`}
        </p>
        <p className="text-xs text-zinc-600 mt-1">
          {wicketsLeft} wickets left • CRR {crr.toFixed(2)}
        </p>
      </div>
    </div>
  );
}