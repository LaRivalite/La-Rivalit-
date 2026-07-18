import { useEffect, useState } from "react";
import { fetchAllMatches, fetchLatestSeries } from "../lib/matchApi";

export default function RivalrySnapshot() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
  async function load() {
    const [matches, latestSeries] = await Promise.all([
      fetchAllMatches(),
      fetchLatestSeries("silver"), // or whatever your competition name is
    ]);

    const completed = matches.filter(
      m => m.status === "completed" &&
           m.result_type !== "abandoned"
    );

    const mavWins = completed.filter(
      m => m.result_winner === "Mavericks"
    ).length;

    const sparWins = completed.filter(
      m => m.result_winner === "Spartans"
    ).length;

    setStats({
      mavWins,
      sparWins,
      total: completed.length,
      silverHolder: latestSeries?.winner ?? "—",
    });
  }

  load();
}, []);

  if (!stats) return null;

  return (
    <section className="px-5 lg:px-20 mt-12">
      <div className="max-w-4xl mx-auto rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8">

        <p className="text-center text-xs uppercase tracking-[0.4em] text-zinc-500">
          Rivalry Snapshot
        </p>

        <div className="mt-8 flex items-center justify-center gap-8 sm:gap-16">
          <div className="text-center">
            <h2 className="text-5xl font-black">{stats.mavWins}</h2>
            <p className="text-zinc-500 mt-2">Mavericks</p>
          </div>
          <div className="text-zinc-600 text-2xl">—</div>
          <div className="text-center">
            <h2 className="text-5xl font-black">{stats.sparWins}</h2>
            <p className="text-zinc-500 mt-2">Spartans</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
            <p className="text-zinc-500 text-sm">Silver Ball Holder</p>
            <p className="mt-2 font-semibold">{stats.silverHolder}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
            <p className="text-zinc-500 text-sm">Golden Ball Holder</p>
            <p className="mt-2 font-semibold text-zinc-500">No matches yet</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
            <p className="text-zinc-500 text-sm">Total Matches</p>
            <p className="mt-2 font-semibold">{stats.total}</p>
          </div>
        </div>

      </div>
    </section>
  );
}