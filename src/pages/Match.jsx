import BackButton from "../components/BackButton";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchMatchById, fetchMatchDeliveries, fetchPlayersById } from "../lib/matchApi";
import { buildScorecard, buildOverTimeline } from "../lib/scorecardBuilder";

export default function Match() {
  const { matchId } = useParams();

  const [match, setMatch]           = useState(null);
  const [scorecard, setScorecard]   = useState([]);
  const [overTimeline, setOverTimeline] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [matchData, playersById] = await Promise.all([
        fetchMatchById(matchId),
        fetchPlayersById(),
      ]);

      if (!matchData) {
        if (!cancelled) { setError("Match not found"); setLoading(false); }
        return;
      }

      const deliveries = await fetchMatchDeliveries(matchId);

      if (cancelled) return;

      setMatch(matchData);
      setScorecard(buildScorecard(deliveries, playersById));
      setOverTimeline(buildOverTimeline(deliveries, playersById));
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [matchId]);

  if (loading) {
    return (
      <div className="px-5 py-20 text-center text-zinc-500">
        Loading match...
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="px-5 py-20 text-center">
        <p className="text-zinc-400">{error ?? "Match not found"}</p>
      </div>
    );
  }

  const inn1 = scorecard.find(i => i.inningsNum === 1);
  const inn2 = scorecard.find(i => i.inningsNum === 2);

  return (
    <div className="px-5 lg:px-20 py-10 max-w-6xl mx-auto">
      <BackButton />

      {/* Header */}
      <h1 className="text-4xl font-black uppercase">
        {match.batting_first} vs {match.fielding_first}
      </h1>
      <p className="mt-2 text-zinc-500 capitalize">
        {match.competition === "silver" ? "L'Argente" : "Golden Ball"} •{" "}
        {new Date(match.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
      </p>

      {/* Score Summary */}
      <div className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          {inn1 && (
            <InningsSummary
              team={match.batting_first}
              score={inn1.score} wickets={inn1.wickets} overs={inn1.overs}
            />
          )}
          <div className="hidden sm:flex items-center text-zinc-500">VS</div>
          {inn2 ? (
            <InningsSummary
              team={match.fielding_first}
              score={inn2.score} wickets={inn2.wickets} overs={inn2.overs}
              align="right"
            />
          ) : (
            <div className="text-right text-zinc-500 flex items-center justify-end">
              Yet to bat
            </div>
          )}
        </div>

        {match.status === "completed" && match.result_winner && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="font-semibold text-green-400">
              {match.result_winner} won by {match.result_margin}
            </p>
          </div>
        )}
        {match.status === "completed" && match.result_type === "tie" && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="font-semibold text-amber-400">Match Tied</p>
          </div>
        )}
        {match.status === "live" && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="font-semibold text-red-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Live
            </p>
          </div>
        )}
      </div>

      {/* Scorecards */}
      {scorecard.map(innings => (
        <InningsScorecard key={innings.inningsNum} innings={innings} battingTeam={innings.inningsNum === 1 ? match.batting_first : match.fielding_first} />
      ))}

      {/* Over Timeline */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">Over by Over</h2>
        {overTimeline.length === 0 ? (
          <p className="text-zinc-500">No deliveries recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {[...overTimeline].reverse().map(o => (
              <div key={`${o.innings}-${o.over}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">
                    Innings {o.innings} • Over {o.over + 1}
                  </h3>
                  <span className="text-zinc-500 text-sm">
                    {o.runs} Runs{o.wickets > 0 && ` • ${o.wickets} W`}
                  </span>
                </div>
                <div className="mt-4 space-y-3">

  {o.balls.map((b, i) => (

    <div
  key={i}
  className={`
    border-t
    border-white/10
    pt-3
    rounded-xl
    px-3
    py-3
    ${
      b.wicket
        ? "bg-gradient-to-r from-transparent via-red-600/30 to-transparent"
        : b.totalRuns === 6
          ? "bg-gradient-to-r from-transparent via-purple-600/30 to-transparent"
          : b.totalRuns === 4
            ? "bg-gradient-to-r from-transparent via-green-600/30 to-transparent"
            : ""
    }
  `}
>

      <p className="text-xs text-zinc-500">
        {o.over}.{b.ballNumber + 1}
      </p>


      <p className="text-sm font-semibold">
        {b.bowler.name}
        {" → "}
        {b.striker.name}
      </p>


      <p className="font-bold mt-1">

        {b.wicket
          ? "WICKET"
          : b.totalRuns === 0
            ? "Dot ball"
            : `${b.totalRuns} run${b.totalRuns > 1 ? "s" : ""}`
        }

      </p>


      {b.wicket && b.outBatter && (
        <p className="text-xs text-red-400 mt-1">
          {b.outBatter.name} out ({b.wicketType})
        </p>
      )}

    </div>

  ))}

</div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function InningsSummary({ team, score, wickets, overs, align = "left" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <h2 className="font-bold text-xl">{team}</h2>
      <p className="text-zinc-400 mt-1">{score}/{wickets} ({overs.toFixed(1)})</p>
    </div>
  );
}

function InningsScorecard({ innings, battingTeam }) {
  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold">
        {battingTeam} — {innings.score}/{innings.wickets} ({innings.overs.toFixed(1)})
      </h2>

      <div className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.03] p-6">

        {/* Batting */}
        <p className="font-semibold mb-3 text-zinc-400 text-sm uppercase tracking-wider">Batting</p>
        <div className="space-y-1">
          <div className="grid grid-cols-12 text-xs text-zinc-500 px-1 pb-2">
            <span className="col-span-5">Batter</span>
            <span className="col-span-3 text-right">R (B)</span>
            <span className="col-span-2 text-right">4s/6s</span>
            <span className="col-span-2 text-right">SR</span>
          </div>
          {innings.batting.map(b => (
            <div key={`${b.id}-${b.spellIndex}-${innings.inningsNum}`} className="grid grid-cols-12 items-center py-2 border-b border-white/5 text-sm">
              <div className="col-span-5">
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-zinc-500">{b.dismissed ? b.howOut : "not out"}</p>
              </div>
              <span className="col-span-3 text-right font-semibold">{b.runs} ({b.balls})</span>
              <span className="col-span-2 text-right text-zinc-400">{b.fours}/{b.sixes}</span>
              <span className="col-span-2 text-right text-zinc-400">
                {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-zinc-500 mt-3">
          Extras: {innings.totalExtras} (wd {innings.extras.wide}, nb {innings.extras.noBall}, b {innings.extras.byes})
        </p>

        {/* Bowling */}
        <p className="font-semibold mb-3 mt-8 text-zinc-400 text-sm uppercase tracking-wider">Bowling</p>
        <div className="space-y-1">
          <div className="grid grid-cols-12 text-xs text-zinc-500 px-1 pb-2">
            <span className="col-span-5">Bowler</span>
            <span className="col-span-2 text-right">O</span>
            <span className="col-span-2 text-right">R</span>
            <span className="col-span-1 text-right">W</span>
            <span className="col-span-2 text-right">Econ</span>
          </div>
          {innings.bowling.map(b => {
            const oversDisplay = `${Math.floor(b.balls / 6)}.${b.balls % 6}`;
            const econ = b.balls > 0 ? (b.runs / (b.balls / 6)).toFixed(1) : "—";
            return (
              <div key={b.id} className="grid grid-cols-12 items-center py-2 border-b border-white/5 text-sm">
                <span className="col-span-5 font-medium">{b.name}</span>
                <span className="col-span-2 text-right text-zinc-400">{oversDisplay}</span>
                <span className="col-span-2 text-right text-zinc-400">{b.runs}</span>
                <span className="col-span-1 text-right font-semibold">{b.wickets}</span>
                <span className="col-span-2 text-right text-zinc-400">{econ}</span>
              </div>
            );
          })}
        </div>

        {/* Fall of wickets */}
        {innings.fallOfWickets.length > 0 && (
          <div className="mt-8">
            <p className="font-semibold mb-3 text-zinc-400 text-sm uppercase tracking-wider">Fall of Wickets</p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {innings.fallOfWickets.map((fow, i) => (
                <span key={i}>
                  {fow.score}-{fow.wicketNum} ({fow.batterName}, {fow.over}){i < innings.fallOfWickets.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

function BallChip({ value }) {
  let bg = "bg-zinc-800";

  if (value.startsWith("4")) bg = "bg-green-600";
  else if (value.startsWith("6")) bg = "bg-purple-600";
  else if (value.endsWith("W")) bg = "bg-red-600";

  return (
    <div className={`h-10 w-10 rounded-md flex items-center justify-center text-sm font-bold ${bg}`}>
      {value == 0 ? "•" : value}
    </div>
  );
}