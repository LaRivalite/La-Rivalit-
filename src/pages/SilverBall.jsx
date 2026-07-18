import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchStatsData } from "../lib/matchApi";
import { computePlayerRatings, ratingTier } from "../lib/ratingEngine";
import {
  filterDeliveries,
  computeBattingStats,
  computeBowlingStats,
  computeFieldingStats,
  computeH2H,
  computeFullH2H,
  buildFilterOptions,
} from "../lib/statsEngine";

const TABS = ["Rankings", "Batting", "Bowling", "Fielding", "H2H"];

export default function SilverBall() {
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab]           = useState("Rankings");
  const [selectedSeries, setSelectedSeries] = useState([]); // array of series IDs
  const [selectedMatches, setSelectedMatches] = useState([]); // array of match IDs
  const [selectedOverRanges, setSelectedOverRanges] = useState([]); // array of range IDs

  const [teamFilter, setTeamFilter] = useState('all'); // 'all' | 'Mavericks' | 'Spartans'
  const [h2hBatter, setH2hBatter] = useState(null);
  const [h2hBowler, setH2hBowler] = useState(null);

  useEffect(() => {
  async function load() {

    const result = await fetchStatsData("silver");

    setData(result);
    setLoading(false);
  }

  load();
}, []);

  const filterOptions = useMemo(() => {
    if (!data) return { series: [], overRanges: [] };
    return buildFilterOptions(data.series);
  }, [data]);

  // Matches available for match filter — union of matches in selected series
  // If no series selected, show all matches
  const availableMatches = useMemo(() => {
    if (!data) return [];
    if (selectedSeries.length === 0) return data.matches;
    const seriesMatchIds = new Set(
      data.series
        .filter(s => selectedSeries.includes(s.id))
        .flatMap(s => (s.matches ?? []).map(m => m.id))
    );
    return data.matches.filter(m => seriesMatchIds.has(m.id));
  }, [data, selectedSeries]);

  // Apply filters to deliveries
  const filteredDeliveries = useMemo(() => {
    if (!data) return [];

    // Determine which match IDs to include
    let matchIds = null;

    if (selectedMatches.length > 0) {
      matchIds = selectedMatches;
    } else if (selectedSeries.length > 0) {
      const seriesMatchIds = data.series
        .filter(s => selectedSeries.includes(s.id))
        .flatMap(s => (s.matches ?? []).map(m => m.id));
      matchIds = seriesMatchIds.length > 0 ? seriesMatchIds : [];
    }

    // Apply multiple over ranges — union of all selected ranges
    const filtered = data.deliveries.filter(d => {
      if (matchIds !== null && !matchIds.includes(d.match_id)) return false;

      if (selectedOverRanges.length > 0) {
        const over = d.over_num + 1;
        const inRange = selectedOverRanges.some(range => {
          if (range === "powerplay") return over <= 6;
          if (range === "middle")    return over > 6 && over <= 16;
          if (range === "death")     return over > 16;
          return true;
        });
        if (!inRange) return false;
      }

      return true;
    });

    return filtered;
  }, [data, selectedSeries, selectedMatches, selectedOverRanges]);

  const battingStats = useMemo(() => {
  const all = data
    ? computeBattingStats(
        filteredDeliveries,
        data.playersById,
        data.matchPlayers ?? []
      )
    : [];

  return teamFilter === 'all'
    ? all
    : all.filter(p => p.team === teamFilter);

}, [filteredDeliveries, data, teamFilter]);


const bowlingStats = useMemo(() => {
  const all = data
    ? computeBowlingStats(
        filteredDeliveries,
        data.playersById,
        data.matchPlayers ?? []
      )
    : [];

  return teamFilter === 'all'
    ? all
    : all.filter(p => p.team === teamFilter);

}, [filteredDeliveries, data, teamFilter]);


const fieldingStats = useMemo(() => {
  const all = data
    ? computeFieldingStats(
        filteredDeliveries,
        data.playersById,
        data.matchPlayers ?? []
      )
    : [];

  return teamFilter === 'all'
    ? all
    : all.filter(p => p.team === teamFilter);

}, [filteredDeliveries, data, teamFilter]);

  const ratings = useMemo(() => {
    if (!data) return [];
    // Ratings use ALL deliveries (not filtered) for fair comparison
    return computePlayerRatings(data.deliveries, data.matches, data.playersById);
  }, [data]);

  const h2hResult = useMemo(() => {
  if (!data || !h2hBatter || !h2hBowler || h2hBatter === h2hBowler) return null;

  return computeFullH2H(
    filteredDeliveries,
    h2hBatter,
    h2hBowler,
    data.playersById,
    data.matchPlayers ?? []
  );
}, [filteredDeliveries, h2hBatter, h2hBowler, data]);

  const allBatters = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.deliveries.map(d => d.striker_id))]
      .map(id => data.playersById[id]).filter(Boolean);
  }, [data]);

  const allBowlers = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.deliveries.map(d => d.bowler_id))]
      .map(id => data.playersById[id]).filter(Boolean);
  }, [data]);

  function toggleItem(list, setList, id) {
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const hasFilters = selectedSeries.length > 0 || selectedMatches.length > 0 || selectedOverRanges.length > 0 || teamFilter !== 'all';

  return (
    <div className="px-4 lg:px-20 py-10 max-w-6xl mx-auto">

      {/* Header */}
      <button onClick={() => navigate("/")}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🥈</div>
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-[0.15em]">L'ARGENTE</h1>
        <p className="mt-3 text-zinc-500">Silver Ball • Stats & Records</p>
      </div>

      {/* Quick records */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <QuickStat label="Total Matches" value={data?.matches.length ?? "—"} />
        <QuickStat label="Total Series"  value={data?.series.length  ?? "—"} />
        <QuickStat label="Mavericks Wins"
          value={data?.matches.filter(m => m.result_winner === "Mavericks").length ?? "—"} />
        <QuickStat label="Spartans Wins"
          value={data?.matches.filter(m => m.result_winner === "Spartans").length ?? "—"} />
      </div>

      {/* Stats section */}
      <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-5 sm:p-8">

        {/* Desktop tabs */}
<div className="hidden sm:flex gap-1 mb-6 bg-white/[0.03] rounded-2xl p-1">
  {TABS.map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
        activeTab === tab
          ? "bg-white/10 text-white"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {tab}
    </button>
  ))}
</div>

{/* Mobile selector */}
<div className="sm:hidden">
  <MobileTabSelector
    activeTab={activeTab}
    setActiveTab={setActiveTab}
  />
</div>

        {/* ── Filters ── */}
        <div className="mb-6 space-y-3">

          {/* Series chips */}
          {filterOptions.series.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Series</p>
              <div className="flex flex-wrap gap-2">
                {filterOptions.series.map(s => (
                  <Chip
                    key={s.id}
                    label={s.label}
                    active={selectedSeries.includes(s.id)}
                    onClick={() => {
                      toggleItem(selectedSeries, setSelectedSeries, s.id);
                      // Clear match selections when series changes
                      setSelectedMatches([]);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Match chips — only show matches in selected series */}
          {availableMatches.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Matches</p>
              <div className="flex flex-wrap gap-2">
                {availableMatches.map(m => (
                  <Chip
                    key={m.id}
                    label={`${m.batting_first} vs ${m.fielding_first} (${new Date(m.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })})`}
                    active={selectedMatches.includes(m.id)}
                    onClick={() => toggleItem(selectedMatches, setSelectedMatches, m.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Over range chips */}
          <div>
            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Over Range</p>
            <div className="flex flex-wrap gap-2">
              {filterOptions.overRanges.map(o => (
                <Chip
                  key={o.id}
                  label={o.label}
                  active={selectedOverRanges.includes(o.id)}
                  onClick={() => toggleItem(selectedOverRanges, setSelectedOverRanges, o.id)}
                />
              ))}
            </div>
          </div>

          {/* Team filter */}
          <div>
            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Team</p>
            <div className="flex flex-wrap gap-2">
              {['all', 'Mavericks', 'Spartans'].map(t => (
                <Chip
                  key={t}
                  label={t === 'all' ? 'Both Teams' : t}
                  active={teamFilter === t}
                  onClick={() => setTeamFilter(t)}
                />
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setSelectedSeries([]); setSelectedMatches([]); setSelectedOverRanges([]); setTeamFilter('all'); }}
              className="text-xs text-zinc-500 hover:text-white transition"
            >
              ✕ Clear all filters
            </button>
          )}

        </div>

        {/* Active filter summary */}
        {hasFilters && (
          <p className="text-xs text-zinc-600 mb-4">
            Showing {filteredDeliveries.length} deliveries from {
              selectedMatches.length > 0 ? `${selectedMatches.length} match${selectedMatches.length > 1 ? "es" : ""}` :
              selectedSeries.length > 0  ? `${selectedSeries.length} series` :
              "all matches"
            }{selectedOverRanges.length > 0 ? `, ${selectedOverRanges.join(" + ")} overs` : ""}
          </p>
        )}

        {loading ? (
          <p className="text-zinc-500 text-center py-10">Loading stats...</p>
        ) : filteredDeliveries.length === 0 ? (
          <p className="text-zinc-500 text-center py-10">No data for selected filters.</p>
        ) : (
          <>
            {activeTab === "Rankings" && <RankingsTable ratings={ratings} teamFilter={teamFilter} navigate={navigate} />}
            {activeTab === "Batting"  && <BattingTable stats={battingStats} navigate={navigate} />}
            {activeTab === "Bowling"  && <BowlingTable stats={bowlingStats} navigate={navigate} />}
            {activeTab === "Fielding" && <FieldingTable stats={fieldingStats} />}
            {activeTab === "H2H" && (
              <H2HTab
                allPlayers={[...allBatters, ...allBowlers].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)}
                playerA={h2hBatter} setPlayerA={setH2hBatter}
                playerB={h2hBowler} setPlayerB={setH2hBowler}
                result={h2hResult}
              />
            )}
          </>
        )}
      </div>

      <div className="mt-8 text-center">
        <button onClick={() => navigate("/matches")}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3 font-semibold text-sm">
          View Match History →
        </button>
      </div>

    </div>
  );
}

// ── Tables ────────────────────────────────────────────────────────────────────

function RankingsTable({ ratings, teamFilter, navigate }) {
  const filtered = teamFilter === 'all' ? ratings : ratings.filter(p => p.team === teamFilter);
  if (!filtered.length) return <Empty />;

  return (
    <div className="space-y-3">
      {filtered.map((p, i) => {
        const tier = ratingTier(p.overall);
        return (
          <button
            key={p.id}
            onClick={() => navigate(`/player/silver/${p.id}`)}
            className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
          >
            <div className="flex items-center gap-4">
              {/* Rank */}
              <span className="text-2xl font-black text-zinc-600 w-8 shrink-0">
                {i + 1}
              </span>

              {/* Name + tier */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold truncate">{p.name}</p>
                  <span className={`text-xs font-semibold shrink-0 ${tier.color}`}>
                    {tier.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{p.team}</p>
              </div>

              {/* Overall rating */}
              <div className="text-right shrink-0">
                <p className={`text-2xl font-black ${tier.color}`}>{p.overall}</p>
                <p className="text-xs text-zinc-600">Overall</p>
              </div>
            </div>

            {/* Sub-ratings bar */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <RatingBar label="Bat"   value={p.batRating}   color="bg-blue-500" />
              <RatingBar label="Bowl"  value={p.bowlRating}  color="bg-red-500" />
              <RatingBar label="Field" value={p.fieldRating} color="bg-green-500" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RatingBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function BattingTable({ stats, navigate }) {
  if (!stats.length) return <Empty />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/10">
            <Th left>Player</Th>
            <Th>M</Th>
            <Th>Inn</Th>
            <Th>Runs</Th>
            <Th>HS</Th>
            <Th>Avg</Th>
            <Th>SR</Th>
            <Th>4s</Th>
            <Th>6s</Th>
          </tr>
        </thead>
        <tbody>
          {stats.map(p => (
            <tr key={p.id} onClick={() => navigate(`/player/silver/${p.id}`)}
              className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer transition">
              <td className="py-3 pr-4">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-zinc-500">{p.team}</p>
              </td>
              <Td>{p.matchesPlayed}</Td>
              <Td>{p.innings}</Td>
              <Td bold>{p.runs}</Td>
              <Td>{p.highestDisplay}</Td>
              <Td>{p.average}</Td>
              <Td>{p.strikeRate}</Td>
              <Td>{p.fours}</Td>
              <Td>{p.sixes}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BowlingTable({ stats, navigate }) {
  if (!stats.length) return <Empty />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm min-w-[520px]">
        <thead>
          <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/10">
            <Th left>Player</Th>
            <Th>M</Th>
            <Th>Ov</Th>
            <Th>Runs</Th>
            <Th>Wkts</Th>
            <Th>Best</Th>
            <Th>Econ</Th>
            <Th>Avg</Th>
          </tr>
        </thead>
        <tbody>
          {stats.map(p => (
            <tr key={p.id} onClick={() => navigate(`/player/silver/${p.id}`)}
              className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer transition">
              <td className="py-3 pr-4">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-zinc-500">{p.team}</p>
              </td>
              <Td>{p.matchesPlayed}</Td>
              <Td>{p.oversDisplay}</Td>
              <Td>{p.runs}</Td>
              <Td bold>{p.wickets}</Td>
              <Td>{p.bestDisplay}</Td>
              <Td>{p.economy}</Td>
              <Td>{p.average}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldingTable({ stats }) {
  if (!stats.length) return <Empty />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm min-w-[400px]">
        <thead>
          <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/10">
            <Th left>Player</Th>
            <Th>M</Th>
            <Th>Catches</Th>
            <Th>ROs</Th>
            <Th>St</Th>
            <Th>Total</Th>
          </tr>
        </thead>
        <tbody>
          {stats.map(p => (
            <tr key={p.id} className="border-t border-white/5">
              <td className="py-3 pr-4">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-zinc-500">{p.team}</p>
              </td>
              <Td>{p.matchesPlayed}</Td>
              <Td>{p.catches}</Td>
              <Td>{p.runOuts}</Td>
              <Td>{p.stumpings}</Td>
              <Td bold>{p.total}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function H2HTab({ allPlayers, playerA, setPlayerA, playerB, setPlayerB, result }) {
  return (
    <div>
      <p className="text-sm text-zinc-400 mb-5">
        Pick any two players to compare their stats side by side.
      </p>

      {/* Player pickers */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div>
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Player A</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {allPlayers.map(p => (
              <button key={p.id}
                onClick={() => setPlayerA(playerA === p.id ? null : p.id)}
                disabled={playerB === p.id}
                className={`w-full text-left rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  playerA === p.id
                    ? "border-cyan-500 bg-cyan-500/15 text-white"
                    : playerB === p.id
                    ? "border-white/5 text-zinc-600 cursor-not-allowed bg-transparent"
                    : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
                }`}>
                {p.name}
                <span className="text-zinc-600 ml-1 text-xs">{p.team}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Player B</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {allPlayers.map(p => (
              <button key={p.id}
                onClick={() => setPlayerB(playerB === p.id ? null : p.id)}
                disabled={playerA === p.id}
                className={`w-full text-left rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  playerB === p.id
                    ? "border-amber-500 bg-amber-500/15 text-white"
                    : playerA === p.id
                    ? "border-white/5 text-zinc-600 cursor-not-allowed bg-transparent"
                    : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
                }`}>
                {p.name}
                <span className="text-zinc-600 ml-1 text-xs">{p.team}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {playerA && playerB && !result && (
        <p className="text-zinc-500 text-center py-6">No data for these players in the selected filters.</p>
      )}

      {result && <H2HComparison result={result} />}
    </div>
  );
}

function H2HComparison({ result }) {
  const { playerA, playerB, batting, bowling, fielding,
          vsABowlsB, vsBBowlsA, dominanceA, dominanceB,
          categoryScores, fromOppositeTeams } = result;

  return (
    <div className="space-y-8">

      {/* Dominance bar */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4 text-center">Overall Dominance</p>
        <div className="flex justify-between text-sm font-bold mb-2">
          <span className="text-cyan-400">{playerA?.name}</span>
          <span className="text-amber-400">{playerB?.name}</span>
        </div>
        <div className="flex rounded-full overflow-hidden h-4 bg-zinc-800">
          <div className="bg-cyan-500 transition-all duration-500" style={{ width: `${dominanceA}%` }} />
          <div className="bg-amber-500 transition-all duration-500" style={{ width: `${dominanceB}%` }} />
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-cyan-400 font-bold">{dominanceA}%</span>
          <span className="text-amber-400 font-bold">{dominanceB}%</span>
        </div>
        {/* Category breakdown */}
        <div className="mt-4 space-y-1">
          {categoryScores.map(c => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500 w-24 shrink-0">{c.label}</span>
              <div className="flex flex-1 rounded-full overflow-hidden h-1.5 bg-zinc-800">
                <div className="bg-cyan-500/60" style={{ width: `${Math.round(c.score * 100)}%` }} />
                <div className="bg-amber-500/60" style={{ width: `${Math.round((1 - c.score) * 100)}%` }} />
              </div>
              <span className="text-zinc-600 w-16 text-right shrink-0">
                {Math.round(c.score * 100)}% / {Math.round((1 - c.score) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Batting comparison */}
      <CompareSection title="Batting" colorA="text-cyan-400" colorB="text-amber-400"
        nameA={playerA?.name} nameB={playerB?.name}
        rows={[
          { label: "Matches",      a: batting.a?.matchesPlayed, b: batting.b?.matchesPlayed },
          { label: "Innings",      a: batting.a?.innings,       b: batting.b?.innings },
          { label: "Runs",         a: batting.a?.runs,          b: batting.b?.runs,        higherWins: true },
          { label: "Highest",      a: batting.a?.highestDisplay,b: batting.b?.highestDisplay },
          { label: "Average",      a: batting.a?.average,       b: batting.b?.average,     higherWins: true },
          { label: "Strike Rate",  a: batting.a?.strikeRate,    b: batting.b?.strikeRate,  higherWins: true },
          { label: "Fours",        a: batting.a?.fours,         b: batting.b?.fours,       higherWins: true },
          { label: "Sixes",        a: batting.a?.sixes,         b: batting.b?.sixes,       higherWins: true },
        ]}
      />

      {/* Bowling comparison */}
      <CompareSection title="Bowling" colorA="text-cyan-400" colorB="text-amber-400"
        nameA={playerA?.name} nameB={playerB?.name}
        rows={[
          { label: "Matches",      a: bowling.a?.matchesPlayed, b: bowling.b?.matchesPlayed },
          { label: "Overs",        a: bowling.a?.oversDisplay,  b: bowling.b?.oversDisplay },
          { label: "Wickets",      a: bowling.a?.wickets,       b: bowling.b?.wickets,     higherWins: true },
          { label: "Economy",      a: bowling.a?.economy,       b: bowling.b?.economy,     higherWins: false },
          { label: "Average",      a: bowling.a?.average,       b: bowling.b?.average,     higherWins: false },
          { label: "Best",         a: bowling.a?.bestDisplay,   b: bowling.b?.bestDisplay },
          { label: "Maidens",      a: bowling.a?.maidens,       b: bowling.b?.maidens,     higherWins: true },
        ]}
      />

      {/* Fielding comparison */}
      <CompareSection title="Fielding" colorA="text-cyan-400" colorB="text-amber-400"
        nameA={playerA?.name} nameB={playerB?.name}
        rows={[
          { label: "Catches",   a: fielding.a?.catches,   b: fielding.b?.catches,   higherWins: true },
          { label: "Run Outs",  a: fielding.a?.runOuts,   b: fielding.b?.runOuts,   higherWins: true },
          { label: "Stumpings", a: fielding.a?.stumpings, b: fielding.b?.stumpings, higherWins: true },
          { label: "Total",     a: fielding.a?.total,     b: fielding.b?.total,     higherWins: true },
        ]}
      />

      {/* Vs stats (only if opposite teams) */}
      {fromOppositeTeams && (vsABowlsB || vsBBowlsA) && (
        <div>
          <p className="text-sm font-bold mb-4 text-zinc-300">Head to Head (Direct)</p>

          {vsABowlsB && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-3">
              <p className="text-xs text-zinc-500 mb-3">
                <span className="text-cyan-400 font-semibold">{playerA?.name}</span> bowling to{" "}
                <span className="text-amber-400 font-semibold">{playerB?.name}</span>
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <VsStat label="Balls"       value={vsABowlsB.balls} />
                <VsStat label="Runs"        value={vsABowlsB.runs} />
                <VsStat label="Dismissals"  value={vsABowlsB.dismissals} />
                <VsStat label="SR"          value={vsABowlsB.strikeRate} />
              </div>
            </div>
          )}

          {vsBBowlsA && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-zinc-500 mb-3">
                <span className="text-amber-400 font-semibold">{playerB?.name}</span> bowling to{" "}
                <span className="text-cyan-400 font-semibold">{playerA?.name}</span>
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <VsStat label="Balls"       value={vsBBowlsA.balls} />
                <VsStat label="Runs"        value={vsBBowlsA.runs} />
                <VsStat label="Dismissals"  value={vsBBowlsA.dismissals} />
                <VsStat label="SR"          value={vsBBowlsA.strikeRate} />
              </div>
            </div>
          )}
        </div>
      )}

      {!fromOppositeTeams && (
        <p className="text-zinc-600 text-xs text-center">
          These players are on the same team — no direct head-to-head stats available.
        </p>
      )}

    </div>
  );
}

function CompareSection({ title, nameA, nameB, colorA, colorB, rows }) {
  return (
    <div>
      <p className="text-sm font-bold mb-3 text-zinc-300">{title}</p>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 px-4 py-2 border-b border-white/5 text-xs">
          <span className={`font-semibold truncate ${colorA}`}>{nameA}</span>
          <span className="text-zinc-500 text-center">Stat</span>
          <span className={`font-semibold truncate text-right ${colorB}`}>{nameB}</span>
        </div>
        {rows.map(row => {
          const aVal = row.a ?? "—";
          const bVal = row.b ?? "—";
          const aNum = parseFloat(aVal);
          const bNum = parseFloat(bVal);
          const canCompare = row.higherWins !== undefined && !isNaN(aNum) && !isNaN(bNum) && aNum !== bNum;
          const aWins = canCompare && (row.higherWins ? aNum > bNum : aNum < bNum);
          const bWins = canCompare && (row.higherWins ? bNum > aNum : bNum < aNum);

          return (
            <div key={row.label} className="grid grid-cols-3 px-4 py-2.5 border-b border-white/5 last:border-0 text-sm">
              <span className={`font-semibold ${aWins ? colorA : "text-zinc-300"}`}>{aVal}</span>
              <span className="text-zinc-500 text-center text-xs self-center">{row.label}</span>
              <span className={`font-semibold text-right ${bWins ? colorB : "text-zinc-300"}`}>{bVal}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VsStat({ label, value }) {
  return (
    <div className="text-center">
      <p className="font-bold">{value}</p>
      <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
        active
          ? "border-green-500 bg-green-500/20 text-green-300"
          : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:border-white/20"
      }`}
    >
      {active && <span className="mr-1">✓</span>}
      {label}
    </button>
  );
}

function QuickStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-zinc-500 text-xs mt-1">{label}</p>
    </div>
  );
}



function Th({ children, left = false }) {
  return (
    <th className={`pb-3 px-1 ${left ? "text-left" : "text-right"} font-medium whitespace-nowrap`}>
      {children}
    </th>
  );
}

function Td({ children, bold = false }) {
  return (
    <td className={`py-3 px-1 text-right whitespace-nowrap ${bold ? "font-bold text-white" : "text-zinc-400"}`}>
      {children}
    </td>
  );
}

function Empty() {
  return <p className="text-zinc-500 text-center py-10">No data for selected filters.</p>;
}

function MobileTabSelector({ activeTab, setActiveTab }) {
  const [open, setOpen] = useState(false);

  const index = TABS.indexOf(activeTab);

  function move(direction) {
    const next = index + direction;

    if (next < 0) {
      setActiveTab(TABS[TABS.length - 1]);
    } else if (next >= TABS.length) {
      setActiveTab(TABS[0]);
    } else {
      setActiveTab(TABS[next]);
    }
  }

  return (
    <div className="relative">

      <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] border border-white/10 px-3 py-2">

        <button
          onClick={() => move(-1)}
          className="w-10 h-10 rounded-xl bg-white/[0.05] text-zinc-300 text-xl"
        >
          ‹
        </button>

        <button
          onClick={() => setOpen(!open)}
          className="flex-1 text-center font-bold text-white"
        >
          {activeTab}
          <span className="text-zinc-500 text-xs ml-2">▾</span>
        </button>

        <button
          onClick={() => move(1)}
          className="w-10 h-10 rounded-xl bg-white/[0.05] text-zinc-300 text-xl"
        >
          ›
        </button>

      </div>


      {open && (
        <div className="
          absolute
          z-20
          top-full
          mt-2
          left-0
          right-0
          rounded-2xl
          border
          border-white/10
          bg-zinc-900
          overflow-hidden
          shadow-xl
        ">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setOpen(false);
              }}
              className={`
                w-full
                px-4
                py-3
                text-left
                text-sm
                transition
                ${
                  activeTab === tab
                    ? "bg-white/10 text-white font-bold"
                    : "text-zinc-400 hover:bg-white/5"
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}