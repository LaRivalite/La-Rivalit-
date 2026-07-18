import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { fetchStatsData } from "../lib/matchApi";
import { computePlayerRatings, ratingTier } from "../lib/ratingEngine";
import {
  filterDeliveries,
  computeBattingStats,
  computeBowlingStats,
  computeFieldingStats,
} from "../lib/statsEngine";

const OVER_RANGES = [
  { id: "all",       label: "All Overs" },
  { id: "powerplay", label: "Powerplay (1-6)" },
  { id: "middle",    label: "Middle (7-15)" },
  { id: "death",     label: "Death (16-20)" },
];

export default function Player() {
  const { competition, playerId } = useParams();
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [overRange, setOverRange] = useState("all");

  useEffect(() => {
    async function load() {
      const result = await fetchStatsData(competition);
      setData(result);
      setLoading(false);
    }
    load();
  }, [competition]);

  const player = data?.playersById[playerId];

  const filteredDeliveries = useMemo(() => {
    if (!data) return [];
    return filterDeliveries(data.deliveries, {
      overRange: overRange === "all" ? null : overRange,
    });
  }, [data, overRange]);

  const playerRating = useMemo(() => {
    if (!data) return null;
    return computePlayerRatings(data.deliveries, data.matches, data.playersById).find(p => p.id === playerId) ?? null;
  }, [data, playerId]);

  const battingRow = useMemo(
  () =>
    computeBattingStats(
      filteredDeliveries,
      data?.playersById ?? {},
      data?.matchPlayers ?? []
    ).find(p => p.id === playerId),
  [filteredDeliveries, data?.matchPlayers]
);

const bowlingRow = useMemo(
  () =>
    computeBowlingStats(
      filteredDeliveries,
      data?.playersById ?? {},
      data?.matchPlayers ?? []
    ).find(p => p.id === playerId),
  [filteredDeliveries, data?.matchPlayers]
);

const fieldingRow = useMemo(
  () =>
    computeFieldingStats(
      filteredDeliveries,
      data?.playersById ?? {},
      data?.matchPlayers ?? []
    ).find(p => p.id === playerId),
  [filteredDeliveries, data?.matchPlayers]
);

  // Match by match batting history
  const matchHistory = useMemo(() => {
    if (!data) return [];
    const playerDeliveries = data.deliveries.filter(d => d.striker_id === playerId);
    const byMatch = {};
    for (const d of playerDeliveries) {
      if (!byMatch[d.match_id]) {
        const match = data.matches.find(m => m.id === d.match_id);
        byMatch[d.match_id] = {
          matchId: d.match_id,
          vs: match ? (match.batting_first === player?.team ? match.fielding_first : match.batting_first) : "?",
          date: match?.date,
          runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false,
        };
      }
      const isLegal = d.wide === 0 && d.no_ball === 0;
      byMatch[d.match_id].runs += d.runs_off_bat;
      if (isLegal) byMatch[d.match_id].balls += 1;
      if (d.runs_off_bat === 4) byMatch[d.match_id].fours++;
      if (d.runs_off_bat === 6) byMatch[d.match_id].sixes++;
      if (d.is_wicket) byMatch[d.match_id].dismissed = true;
    }
    return Object.values(byMatch).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data, playerId, player]);

  const compLabel = competition === "silver" ? "L'Argente" : "Golden Ball";
  const backPath  = competition === "silver" ? "/silver-ball" : "/golden-ball";

  if (loading) {
    return <div className="px-5 py-20 text-center text-zinc-500">Loading...</div>;
  }

  if (!player) {
    return (
      <div className="px-5 py-20 text-center">
        <p className="text-zinc-400">Player not found.</p>
        <button onClick={() => navigate(backPath)} className="mt-4 text-zinc-500 hover:text-white">← Back</button>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-20 py-10 max-w-5xl mx-auto">

      <button onClick={() => navigate(backPath)}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8">
        <ArrowLeft size={18} /> {compLabel}
      </button>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center text-3xl font-black mx-auto mb-4">
          {player.name[0]}
        </div>
        <h1 className="text-4xl font-black uppercase">{player.name}</h1>
        <p className="text-zinc-500 mt-2">{player.team} • {compLabel}</p>
      </div>

      {/* Rating badge */}
      {playerRating && (() => {
        const tier = ratingTier(playerRating.overall);
        return (
          <div className="flex justify-center gap-4 mb-8">
            <div className="text-center">
              <p className={`text-4xl font-black ${tier.color}`}>{playerRating.overall}</p>
              <p className="text-xs text-zinc-500 mt-1">{tier.label}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{playerRating.batRating}</p>
              <p className="text-xs text-zinc-500 mt-1">Bat</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{playerRating.bowlRating}</p>
              <p className="text-xs text-zinc-500 mt-1">Bowl</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{playerRating.fieldRating}</p>
              <p className="text-xs text-zinc-500 mt-1">Field</p>
            </div>
          </div>
        );
      })()}

      {/* Over range filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {OVER_RANGES.map(o => (
          <button key={o.id} onClick={() => setOverRange(o.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
              overRange === o.id
                ? "border-green-500 bg-green-500/15 text-white"
                : "border-white/10 bg-white/[0.03] text-zinc-400"
            }`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Batting */}
      <Section title="Batting">
        {battingRow ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Runs"        value={battingRow.runs} />
            <StatCard title="Innings"     value={battingRow.innings} />
            <StatCard title="Average"     value={battingRow.average} />
            <StatCard title="Strike Rate" value={battingRow.strikeRate} />
            <StatCard title="Highest"     value={battingRow.highestDisplay} />
            <StatCard title="Fours"       value={battingRow.fours} />
            <StatCard title="Sixes"       value={battingRow.sixes} />
            <StatCard title="Not Outs"    value={battingRow.notOuts} />
          </div>
        ) : (
          <p className="text-zinc-500">No batting data.</p>
        )}
      </Section>

      {/* Bowling */}
      <Section title="Bowling">
        {bowlingRow ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Wickets"     value={bowlingRow.wickets} />
            <StatCard title="Overs"       value={bowlingRow.oversDisplay} />
            <StatCard title="Runs"        value={bowlingRow.runs} />
            <StatCard title="Economy"     value={bowlingRow.economy} />
            <StatCard title="Average"     value={bowlingRow.average} />
            <StatCard title="Strike Rate" value={bowlingRow.strikeRate} />
            <StatCard title="Best"        value={bowlingRow.bestDisplay} />
            <StatCard title="Maidens"     value={bowlingRow.maidens} />
          </div>
        ) : (
          <p className="text-zinc-500">No bowling data.</p>
        )}
      </Section>

      {/* Fielding */}
      <Section title="Fielding">
        {fieldingRow ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Catches"   value={fieldingRow.catches} />
            <StatCard title="Run Outs"  value={fieldingRow.runOuts} />
            <StatCard title="Stumpings" value={fieldingRow.stumpings} />
            <StatCard title="Total"     value={fieldingRow.total} />
          </div>
        ) : (
          <p className="text-zinc-500">No fielding data.</p>
        )}
      </Section>

      {/* Match by match batting history */}
      {matchHistory.length > 0 && (
        <Section title="Match History">
          <div className="space-y-3">
            {matchHistory.map(m => (
              <button key={m.matchId} onClick={() => navigate(`/match/${m.matchId}`)}
                className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 hover:bg-white/[0.05] transition">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">vs {m.vs} • {m.date ? new Date(m.date).toLocaleDateString() : ""}</p>
                    <p className="font-bold text-lg">
                      {m.runs}{!m.dismissed ? "*" : ""} <span className="text-zinc-500 font-normal text-sm">({m.balls} balls)</span>
                    </p>
                  </div>
                  <div className="text-right text-sm text-zinc-500">
                    <p>{m.fours} fours</p>
                    <p>{m.sixes} sixes</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}

    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-zinc-500 text-xs mb-1">{title}</p>
      <p className="text-2xl font-bold">{value ?? "—"}</p>
    </div>
  );
}