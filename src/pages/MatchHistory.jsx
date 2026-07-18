import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import { fetchCompletedMatches } from "../lib/matchApi";

export default function MatchHistory() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all"); // "all" | "silver" | "gold"

  useEffect(() => {
    async function load() {
      const data = await fetchCompletedMatches();
      setMatches(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter === "all" ? matches : matches.filter(m => m.competition === filter);

  return (
    <div className="px-5 lg:px-20 py-10 max-w-4xl mx-auto">

      <BackButton to="/" />
      <h1 className="text-4xl font-black uppercase">Match History</h1>
      <p className="mt-2 text-zinc-500">All completed matches</p>

      {/* Filter tabs */}
      <div className="flex gap-2 mt-6">
        {[
          { id: "all",    label: "All" },
          { id: "silver", label: "🥈 Silver Ball" },
          { id: "gold",   label: "🥇 Golden Ball" },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
              filter === f.id
                ? "border-green-500 bg-green-500/15 text-white"
                : "border-white/10 bg-white/[0.03] text-zinc-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="text-zinc-500 text-center py-10">Loading matches...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏏</p>
            <p className="text-zinc-500">No completed matches yet.</p>
          </div>
        ) : (
          filtered.map(match => {
            const inn1 = match.innings?.find(i => i.innings_num === 1);
            const inn2 = match.innings?.find(i => i.innings_num === 2);

            return (
              <button
                key={match.id}
                onClick={() => navigate(`/match/${match.id}`)}
                className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.05] transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                      {match.competition === "silver" ? "🥈 Silver Ball" : "🥇 Golden Ball"} •{" "}
                      {new Date(match.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="font-semibold">
                      {match.batting_first} vs {match.fielding_first}
                    </p>
                    {inn1 && (
                      <p className="text-sm text-zinc-400 mt-1">
                        {match.batting_first}: {inn1.score}/{inn1.wickets} ({Number(inn1.overs).toFixed(1)})
                        {inn2 && ` • ${match.fielding_first}: ${inn2.score}/${inn2.wickets} (${Number(inn2.overs).toFixed(1)})`}
                      </p>
                    )}
                    {match.result_type === "tie" ? (
                      <p className="text-sm text-amber-400 mt-2 font-semibold">Match Tied</p>
                    ) : match.result_winner ? (
                      <p className="text-sm text-green-400 mt-2 font-semibold">
                        {match.result_winner} won by {match.result_margin}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-zinc-500">→</span>
                </div>
              </button>
            );
          })
        )}
      </div>

    </div>
  );
}