import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentLiveMatch, fetchMatchDeliveries, fetchPlayersById } from "../lib/matchApi";
import { buildScorecard } from "../lib/scorecardBuilder";
import mavs from '../assets/logos/mavs.jpg';
import sparts from '../assets/logos/sparts.jpg';

const POLL_INTERVAL = 8000;

export default function LiveMatchBar() {
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [scorecard, setScorecard] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }

    load();
    interval = setInterval(load, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Nothing live — don't show the bar at all
  if (loading || !match) return null;

  const currentInningsNum = match.innings?.length === 2 ? 2 : 1;
  const card1 = scorecard.find(i => i.inningsNum === 1);
  const card2 = scorecard.find(i => i.inningsNum === 2);

  const battingFirstTeam  = match.batting_first;
  const battingSecondTeam = match.fielding_first;

  return (
    <section className="max-w-4xl mx-auto px-2" onClick={() => navigate("/live")}>

      <div className="relative cursor-pointer">

        {/* Trophy */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-[#0b0b0b] border border-white/15 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.08)]">
            <span className="text-3xl">{match.competition === "silver" ? "🥈" : "🥇"}</span>
          </div>
        </div>

        {/* Main Bar */}
        <div className="h-14 sm:h-16 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl flex items-center justify-between">

          {/* Left — batting first */}
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-full overflow-hidden border border-white/15 bg-white/5">
              <img
                src={battingFirstTeam == "Mavericks" ? mavs : sparts}
                alt={battingFirstTeam}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base">
                {card1 ? `${card1.score}/${card1.wickets}` : "0/0"}
              </p>
              <p className="text-[10px] text-zinc-500">
                {card1 ? card1.overs.toFixed(1) : "0.0"} ov
              </p>
            </div>
          </div>

          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />

          {/* Right — batting second */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-semibold text-sm sm:text-base">
                {card2 ? `${card2.score}/${card2.wickets}` : "Yet To Bat"}
              </p>
              {card2 && (
                <p className="text-[10px] text-zinc-500">{card2.overs.toFixed(1)} ov</p>
              )}
            </div>
            <div className="h-16 w-16 rounded-full overflow-hidden border border-white/15 bg-white/5">
              <img
                src={battingSecondTeam == "Mavericks" ? mavs : sparts}
                alt={battingSecondTeam}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

        </div>

      </div>

      {/* Match Type */}
      <div className="mt-4 text-center">
        <span className="text-xs uppercase tracking-[0.4em] text-zinc-500">
          {match.competition === "silver" ? "Silver Ball" : "Golden Ball"} • Live
        </span>
      </div>

    </section>
  );
}