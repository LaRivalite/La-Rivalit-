import { useEffect, useState } from "react";
import WinProbability from "../components/WinProbability";
import { useNavigate } from "react-router-dom";
import { fetchCurrentLiveMatch, fetchMatchDeliveries, fetchPlayersById } from "../lib/matchApi";
import { buildScorecard, buildOverTimeline } from "../lib/scorecardBuilder";
import mavs from '../assets/logos/mavs.jpg'
import sparts from '../assets/logos/sparts.jpg';

const POLL_INTERVAL = 5000; // refresh every 5s while live

export default function LiveMatch() {
  const navigate = useNavigate();

  const [match, setMatch]         = useState(null);
  const [scorecard, setScorecard] = useState([]);
  const [overTimeline, setOverTimeline] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    let cancelled = false;
    let interval;

    async function load() {
      const matchData = await fetchCurrentLiveMatch();

      if (cancelled) return;

      if (!matchData) {
        setMatch(null);
        setLoading(false);
        return;
      }

      const [deliveries, playersById] = await Promise.all([
        fetchMatchDeliveries(matchData.id),
        fetchPlayersById(),
      ]);

      if (cancelled) return;

      setMatch(matchData);
      setScorecard(buildScorecard(deliveries, playersById));
      setOverTimeline(buildOverTimeline(deliveries, playersById));
      setLoading(false);
    }

    load();
    interval = setInterval(load, POLL_INTERVAL);

    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return <div className="px-4 py-20 text-center text-zinc-500">Loading live match...</div>;
  }

  if (!match) {
    return (
      <div className="px-4 py-20 text-center max-w-md mx-auto">
        <p className="text-5xl mb-4">🏏</p>
        <h2 className="text-xl font-bold">No Live Match</h2>
        <p className="text-zinc-500 mt-2">Check back when a match is in progress.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3 font-semibold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const currentInningsNum = match.innings?.length === 2 ? 2 : 1;
  const currentInnings    = match.innings?.find(i => i.innings_num === currentInningsNum);
  const card              = scorecard.find(i => i.inningsNum === currentInningsNum);

  const battingTeam  = currentInningsNum === 1 ? match.batting_first : match.fielding_first;
  const bowlingTeam  = currentInningsNum === 1 ? match.fielding_first : match.batting_first;
  const firstInningsCard = scorecard.find(i => i.inningsNum === 1);

  // Current striker/non-striker/bowler from latest deliveries in this innings
  const currentOverDeliveries = overTimeline.filter(o => o.innings === currentInningsNum);
  const latestOver = currentOverDeliveries[currentOverDeliveries.length - 1];

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">

      {/* Score Bar */}
      <div className="relative rounded-full border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-full overflow-hidden border border-white/15 bg-white/5">
                          <img
                            src={battingTeam == "Mavericks" ? mavs : sparts}
                            alt={battingTeam}
                            className="h-full w-full object-cover"
                          />
                        </div>
            <div>
              <div className="font-bold">
                {card ? `${card.score}/${card.wickets}` : "0/0"}
              </div>
              <div className="text-xs text-zinc-500">
                {card ? card.overs.toFixed(1) : "0.0"} Overs
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl">
            {match.competition === "silver" ? "🥈" : "🥇"}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-bold text-right">
                {currentInningsNum === 2 && firstInningsCard
                  ? `${firstInningsCard.score}/${firstInningsCard.wickets}`
                  : "Yet To Bat"}
              </div>
              {currentInningsNum === 2 && (
                <div className="text-xs text-zinc-500 text-right">
                  Target {currentInnings?.target ?? "—"}
                </div>
              )}
            </div>
            <div className="h-16 w-16 rounded-full overflow-hidden border border-white/15 bg-white/5">
                          <img
                            src={bowlingTeam == "Mavericks" ? mavs : sparts}
                            alt={bowlingTeam}
                            className="h-full w-full object-cover"
                          />
                        </div>
          </div>

        </div>
      </div>

      {/* Match Situation */}
      {currentInningsNum === 2 && currentInnings?.target && card && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-center">
            <p className="text-zinc-500">Match Situation</p>
            <h2 className="mt-2 text-3xl font-black">
              Need {Math.max(currentInnings.target - card.score, 0)} from{" "}
              {Math.max((20 - Math.floor(card.overs)) * 6 - Math.round((card.overs % 1) * 10), 0)}
            </h2>
            <p className="mt-2 text-zinc-400">
              Required RR: {requiredRunRate(currentInnings.target, card)}
            </p>
          </div>
        </div>
      )}

      {/* Win Probability */}
      <WinProbability
        card={card}
        match={match}
        scorecard={scorecard}
      />

      {/* Live status */}
      <div className="mt-6 flex items-center justify-center gap-2 text-sm">
        {match.status === "live" ? (
          <span className="flex items-center gap-2 text-red-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Live
          </span>
        ) : (
          <span className="text-zinc-500">Match Completed</span>
        )}
      </div>

      {/* Current Over */}
      {latestOver && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-bold text-lg">Current Over</h2>
          <div className="flex gap-2 mt-4 flex-wrap">
            {latestOver.balls.map((b, i) => <BallChip key={i} value={b} />)}
          </div>
        </div>
      )}

      {/* Top batters this innings */}
      {card && card.batting.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {card.batting.filter(b => !b.out).slice(0, 2).map(b => (
            <PlayerCard key={b.id} title="Batting" name={b.name} stats={`${b.runs} (${b.balls})`} />
          ))}
        </div>
      )}

      {/* Full Timeline */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Overs</h2>
        {currentOverDeliveries.length === 0 ? (
          <p className="text-zinc-500">No deliveries yet.</p>
        ) : (
          <div className="space-y-4">
            {[...currentOverDeliveries].reverse().map(o => (
              <div key={o.over} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Over {o.over + 1}</h3>
                  <div className="mt-2 text-sm text-zinc-400 space-y-1">
                    <div>🎯 {o.bowler.name}</div>
                    <div>
                      🏏 {o.striker.name}* &nbsp;•&nbsp; {o.nonStriker.name}
                    </div>
                  </div>
                  <span className="text-zinc-500 text-sm">
                    {o.runs} Runs{o.wickets > 0 && ` • ${o.wickets} W`}
                  </span>
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {o.balls.map((b, i) => <BallChip key={i} value={b} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => navigate(`/match/${match.id}`)}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3 font-semibold"
        >
          Full Scorecard →
        </button>
      </div>

    </div>
  );
}

function requiredRunRate(target, card) {
  const ballsBowled = Math.floor(card.overs) * 6 + Math.round((card.overs % 1) * 10);
  const ballsLeft    = 120 - ballsBowled;
  if (ballsLeft <= 0) return "—";
  const runsNeeded = Math.max(target - card.score, 0);
  return ((runsNeeded / ballsLeft) * 6).toFixed(2);
}

function PlayerCard({ title, name, stats }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-zinc-500 text-sm">{title}</p>
      <p className="mt-2 font-bold">{name}</p>
      <p className="text-zinc-400 text-sm mt-1">{stats}</p>
    </div>
  );
}

function BallChip({ value }) {
  let bg = "bg-zinc-700";
  if (value === "4") bg = "bg-green-600";
  if (value === "6") bg = "bg-yellow-500 text-black";
  if (value === "W") bg = "bg-red-600";
  if (value?.startsWith("WD")) bg = "bg-purple-600";
  if (value?.startsWith("NB")) bg = "bg-orange-500";
  if (value?.startsWith("BYE")) bg = "bg-sky-600";

  return (
    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${bg}`}>
      {value}
    </div>
  );
}