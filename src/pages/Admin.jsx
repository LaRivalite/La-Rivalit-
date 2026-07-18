import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { endSeriesInDB } from "../lib/matchApi";

// Change this password to whatever you want
const ADMIN_PASSWORD = "larivalite2024";
const AUTH_KEY = "la-rivalite-admin-auth";

export default function Admin() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(() => {
    try { return localStorage.getItem(AUTH_KEY) === "true"; } catch { return false; }
  });
  const [password, setPassword]   = useState("");
  const [pwError, setPwError]     = useState(false);
  const [series, setSeries]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    if (authed) loadSeries();
  }, [authed]);

  async function loadSeries() {
    setLoading(true);
    const { data } = await supabase
      .from("series")
      .select("*, matches(id, status, result_winner, batting_first, fielding_first, date)")
      .order("created_at", { ascending: false });
    setSeries(data ?? []);
    setLoading(false);
  }

  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(AUTH_KEY, "true");
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  }

  async function handleEndSeries(seriesId, winner) {
    await endSeriesInDB(seriesId, winner);
    setActionMsg("Series ended.");
    loadSeries();
    setTimeout(() => setActionMsg(""), 3000);
  }

  async function handleReopenSeries(seriesId) {
    const { error } = await supabase
      .from("series")
      .update({ ended: false, winner: null })
      .eq("id", seriesId);
    if (!error) {
      setActionMsg("Series reopened.");
      loadSeries();
      setTimeout(() => setActionMsg(""), 3000);
    }
  }

  // ── Password gate ────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8">
            <ArrowLeft size={18} /> Back
          </button>

          <h1 className="text-3xl font-black mb-2">Admin</h1>
          <p className="text-zinc-500 mb-8">Enter password to continue.</p>

          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            className={`w-full rounded-2xl border px-4 py-4 text-sm outline-none bg-white/[0.03] ${
              pwError ? "border-red-500" : "border-white/10 focus:border-white/30"
            }`}
          />
          {pwError && <p className="text-red-400 text-sm mt-2">Incorrect password.</p>}

          <button
            onClick={handleLogin}
            className="w-full h-14 rounded-2xl bg-green-600 font-bold mt-4 active:scale-95 transition"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  // ── Admin dashboard ──────────────────────────────────────
  return (
    <div className="px-5 lg:px-20 py-10 max-w-4xl mx-auto">

      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate("/")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
          <ArrowLeft size={18} /> Back
        </button>
        <button onClick={handleLogout}
          className="text-sm text-zinc-500 hover:text-white transition">
          Log out
        </button>
      </div>

      <h1 className="text-4xl font-black mb-2">Admin</h1>
      <p className="text-zinc-500 mb-8">Manage series and match data.</p>

      {actionMsg && (
        <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-400 text-sm font-semibold">
          ✓ {actionMsg}
        </div>
      )}

      {/* Series Management */}
      <h2 className="text-xl font-bold mb-4">Series</h2>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : series.length === 0 ? (
        <p className="text-zinc-500">No series found.</p>
      ) : (
        <div className="space-y-4">
          {series.map(s => {
            const completed = s.matches?.filter(m => m.status === "completed") ?? [];
            const mavWins   = completed.filter(m => m.result_winner === "Mavericks").length;
            const sparWins  = completed.filter(m => m.result_winner === "Spartans").length;
            const total     = s.matches?.length ?? 0;
            const isEnded   = s.ended ?? false;
            const isLive    = s.matches?.some(m => m.status === "live") ?? false;

            const possibleWinner = mavWins >= 2 ? "Mavericks" : sparWins >= 2 ? "Spartans" : null;

            return (
              <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{s.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                        isEnded
                          ? "border-zinc-600 text-zinc-500"
                          : isLive
                          ? "border-red-500/40 text-red-400 bg-red-500/10"
                          : "border-green-500/40 text-green-400 bg-green-500/10"
                      }`}>
                        {isEnded ? "Ended" : isLive ? "Live" : "Active"}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 capitalize">{s.competition} ball</p>
                    <p className="text-sm text-zinc-400 mt-2">
                      {total} match{total !== 1 ? "es" : ""} •{" "}
                      Mavericks {mavWins} — Spartans {sparWins}
                    </p>
                    {isEnded && s.winner && (
                      <p className="text-sm text-green-400 mt-1 font-semibold">
                        🏆 {s.winner} won the series
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {!isEnded && (
                      <>
                        {/* End with current leader if 2-0 */}
                        {possibleWinner && (
                          <button
                            onClick={() => handleEndSeries(s.id, possibleWinner)}
                            className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold px-3 py-2 hover:bg-amber-500/20 transition"
                          >
                            End → {possibleWinner}
                          </button>
                        )}

                        {/* Manual end with picker */}
                        <EndSeriesButton
                          seriesId={s.id}
                          onEnd={handleEndSeries}
                        />
                      </>
                    )}

                    {isEnded && (
                      <button
                        onClick={() => handleReopenSeries(s.id)}
                        className="rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 text-xs font-semibold px-3 py-2 hover:bg-white/[0.06] transition"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                {/* Match list */}
                {s.matches?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                    {s.matches.map(m => (
                      <div key={m.id} className="flex justify-between items-center text-sm">
                        <span className="text-zinc-400">
                          {m.batting_first} vs {m.fielding_first}
                          {m.date && ` • ${new Date(m.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                        </span>
                        <span className={`text-xs font-semibold ${
                          m.status === "live" ? "text-red-400" :
                          m.result_winner ? "text-green-400" : "text-zinc-500"
                        }`}>
                          {m.status === "live" ? "Live" :
                           m.result_winner ? `${m.result_winner} won` : m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Small inline component for manual series end with team picker
function EndSeriesButton({ seriesId, onEnd }) {
  const [open, setOpen]     = useState(false);
  const [winner, setWinner] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-semibold px-3 py-2 hover:bg-red-500/15 transition"
      >
        End Series
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={winner}
        onChange={e => setWinner(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm outline-none text-white"
      >
        <option value="">Pick winner</option>
        <option value="Mavericks">Mavericks</option>
        <option value="Spartans">Spartans</option>
        <option value="">No winner (abandoned)</option>
      </select>
      <div className="flex gap-2">
        <button
          onClick={() => { onEnd(seriesId, winner || null); setOpen(false); }}
          disabled={!winner}
          className="flex-1 rounded-xl bg-red-600 text-white text-xs font-bold py-2 disabled:opacity-40"
        >
          Confirm
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl border border-white/10 text-zinc-400 text-xs px-3 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}