import { useMatch } from "../../context/MatchContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchSeriesByCompetition, getSeriesStatus, endSeriesInDB } from "../../lib/matchApi";

export default function MatchResult() {
  const { match, innings1, matchResult, clearMatchSession, competition } = useMatch();
  const navigate = useNavigate();

  const [seriesInfo, setSeriesInfo] = useState(null);
  const [endingMatch, setEndingMatch] = useState(false);

  useEffect(() => {
    if (!match?.matchId) return;

    async function loadSeries() {
      const allSeries = await fetchSeriesByCompetition(competition);
      // Find the series this match belongs to (most recent one containing it)
      const series = allSeries.find(s => s.matches?.some(m => m.id === match.matchId));
      if (!series) return;

      const status = getSeriesStatus(series.matches, inn1.battingTeam === inn1.battingTeam ? match.battingTeam : null, match.fieldingTeam);
      // Recompute using actual team names from the match
      const realStatus = getSeriesStatus(series.matches, match.battingTeam, match.fieldingTeam);

      setSeriesInfo({ series, status: realStatus });
    }

    loadSeries();
  }, [match?.matchId]);

  if (!matchResult || !innings1) return null;

  const inn1 = innings1;
  const inn2 = match;

  async function handleEndSeries() {
    if (!seriesInfo?.series) return;
    setEndingMatch(true);
    await endSeriesInDB(seriesInfo.series.id, seriesInfo.status.winner);
    setSeriesInfo(prev => ({ ...prev, series: { ...prev.series, ended: true } }));
    setEndingMatch(false);
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-md">

        {/* Result banner */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center mb-6">
          {matchResult.type === "tie" ? (
            <>
              <p className="text-4xl mb-3">🤝</p>
              <h1 className="text-3xl font-black">It's a Tie!</h1>
            </>
          ) : (
            <>
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-zinc-400 text-sm uppercase tracking-widest mb-2">Winner</p>
              <h1 className="text-4xl font-black">{matchResult.winner}</h1>
              <p className="text-zinc-400 mt-2">won by {matchResult.margin}</p>
            </>
          )}
        </div>

        {/* Series progress */}
        {seriesInfo && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
              {seriesInfo.series.name}
            </p>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <p className="text-2xl font-black">{seriesInfo.status.winsA}</p>
                <p className="text-xs text-zinc-500 mt-1">{match.battingTeam}</p>
              </div>
              <p className="text-zinc-600 text-sm">
                {seriesInfo.status.matchesPlayed}/3 played
              </p>
              <div className="text-center">
                <p className="text-2xl font-black">{seriesInfo.status.winsB}</p>
                <p className="text-xs text-zinc-500 mt-1">{match.fieldingTeam}</p>
              </div>
            </div>

            {seriesInfo.status.decided && !seriesInfo.series.ended && seriesInfo.status.matchesPlayed < 3 && (
              <div className="mt-5 pt-5 border-t border-white/10">
                <p className="text-sm text-amber-400 text-center mb-3">
                  {seriesInfo.status.winner} has already won the series 2-0
                </p>
                <button
                  onClick={handleEndSeries}
                  disabled={endingMatch}
                  className="w-full h-12 rounded-xl bg-amber-600 font-bold text-sm active:scale-95 transition disabled:opacity-50"
                >
                  {endingMatch ? "Ending..." : "End Series Now (Skip Match 3)"}
                </button>
              </div>
            )}

            {seriesInfo.series.ended && (
              <p className="mt-4 text-center text-sm text-zinc-500">Series ended early.</p>
            )}
          </div>
        )}

        {/* Scores */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <ScoreCard team={inn1.battingTeam} score={inn1.score} wickets={inn1.wickets}
            overs={`${inn1.over}.${inn1.ball}`} label="1st Innings" />
          <ScoreCard team={inn2.battingTeam} score={inn2.score} wickets={inn2.wickets}
            overs={`${inn2.over}.${inn2.ball}`} label="2nd Innings" target={inn2.target} />
        </div>

        {/* Mini scorecard */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 mb-6">
          <h2 className="font-bold mb-4">Scorecard</h2>
          <InningsBlock innings={inn1} label="Innings 1" />
          <div className="h-px bg-white/10 my-5" />
          <InningsBlock innings={inn2} label="Innings 2" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/match/${match.matchId}`)}
            className="h-14 rounded-2xl border border-white/10 bg-white/[0.03] font-bold active:scale-95 transition"
          >
            Full Scorecard
          </button>
          <button
            onClick={() => { clearMatchSession(); navigate("/"); }}
            className="h-14 rounded-2xl bg-green-600 font-bold active:scale-95 transition"
          >
            New Match
          </button>
        </div>

      </div>
    </div>
  );
}

function ScoreCard({ team, score, wickets, overs, label, target }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <p className="text-zinc-500 text-xs mb-2">{label}</p>
      <p className="font-bold text-sm mb-1">{team}</p>
      <p className="text-2xl font-black">{score}/{wickets}</p>
      <p className="text-zinc-500 text-xs mt-1">{overs} ov</p>
      {target && <p className="text-green-400 text-xs mt-1">Target: {target}</p>}
    </div>
  );
}

function InningsBlock({ innings, label }) {
  const { completedOvers } = innings;
  return (
    <div>
      <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">{label} — {innings.battingTeam}</p>
      {completedOvers.length > 0 && (
        <div className="space-y-2 mb-4">
          {[...completedOvers].reverse().map(o => (
            <div key={o.over} className="flex items-center justify-between text-sm">
              <span className="text-zinc-500 w-16">Over {o.over}</span>
              <div className="flex gap-1 flex-wrap flex-1 justify-center">
                {o.balls.map((b, i) => <BallChip key={i} value={b} />)}
              </div>
              <span className="text-zinc-400 w-12 text-right">{o.runs}r {o.wickets > 0 ? `${o.wickets}w` : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BallChip({ value }) {
  let bg = "bg-zinc-800";

  if (value.startsWith("4")) bg = "bg-green-600";
  else if (value.startsWith("6")) bg = "bg-purple-600";
  else if (value.endsWith("W")) bg = "bg-red-600";

  return (
    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${bg}`}>
      {value == 0 ? "•" : value}
    </div>
  );
}