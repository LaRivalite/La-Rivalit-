import { useState } from "react";
import { useMatch } from "../../context/MatchContext";
import SelectionGrid from "../scorer/shared/SelectionGrid";
import SheetFooter from "../scorer/shared/SheetFooter";

export default function InningsBreak() {
  const { match, startInnings2 } = useMatch();

  const [step, setStep]       = useState(0); // 0=summary, 1=openers, 2=bowler
  const [striker, setStriker]     = useState(null);
  const [nonStriker, setNonStriker] = useState(null);
  const [bowler, setBowler]       = useState(null);

  const target      = match.score + 1;
  const battingNext = match.fieldingTeam;  // they bat in innings 2
  const bowlingNext = match.battingTeam;

  // Rosters for innings 2
  const newBatters  = match.fieldingPlayers;
  const newBowlers  = match.players;

  function handleStart() {
    const s  = newBatters.find(p => p.id === striker);
    const ns = newBatters.find(p => p.id === nonStriker);
    const b  = newBowlers.find(p => p.id === bowler);
    startInnings2({ striker: s, nonStriker: ns, bowler: b });
  }

  // ── Step 0: Innings summary ──────────────────────────
  if (step === 0) {
    const overs = `${match.over}.${match.ball}`;
    return (
      <div className="min-h-screen bg-[#090909] text-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">

          <p className="text-center text-zinc-500 uppercase tracking-widest text-xs mb-6">
            Innings 1 Complete
          </p>

          {/* Big score */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center mb-6">
            <p className="text-zinc-400 mb-2 font-medium">{match.battingTeam}</p>
            <h1 className="text-6xl font-black">
              {match.score}/{match.wickets}
            </h1>
            <p className="text-zinc-500 mt-2">{overs} Overs</p>
          </div>

          {/* Target */}
          <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-6 text-center mb-8">
            <p className="text-zinc-400 text-sm mb-1">{battingNext} need</p>
            <h2 className="text-4xl font-black text-green-400">{target}</h2>
            <p className="text-zinc-400 text-sm mt-1">to win in 20 overs</p>
          </div>

          {/* Top performers */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <StatBox label="Top Scorer" value={getTopBatter(match)} />
            <StatBox label="Top Bowler" value={getTopBowler(match)} />
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full h-14 rounded-2xl bg-green-600 font-bold text-lg active:scale-95 transition"
          >
            Start Innings 2 →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Pick openers ──────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#090909] text-white px-4 py-10">
        <div className="max-w-md mx-auto">

          <h1 className="text-2xl font-black mb-1">{battingNext} Open</h1>
          <p className="text-zinc-400 mb-8 text-sm">Select opening batters</p>

          <p className="text-sm text-zinc-400 mb-3">Striker (faces first ball)</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {newBatters.map(p => (
              <SelectBtn
                key={p.id}
                selected={striker === p.id}
                disabled={nonStriker === p.id}
                onClick={() => setStriker(p.id)}
              >
                {p.name}
              </SelectBtn>
            ))}
          </div>

          <p className="text-sm text-zinc-400 mb-3">Non-Striker</p>
          <div className="grid grid-cols-2 gap-2 mb-8">
            {newBatters.map(p => (
              <SelectBtn
                key={p.id}
                selected={nonStriker === p.id}
                disabled={striker === p.id}
                onClick={() => setNonStriker(p.id)}
              >
                {p.name}
              </SelectBtn>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(0)}
              style={{ WebkitTapHighlightColor: "transparent" }}
              className="h-14 px-6 rounded-2xl border border-white/10 bg-white/[0.03] font-bold flex items-center justify-center active:scale-95 transition"
            >
              ←
            </button>
            <SheetFooter
              text="Next →"
              flex
              disabled={!striker || !nonStriker}
              onClick={() => setStep(2)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Pick opening bowler ───────────────────────
  return (
    <div className="min-h-screen bg-[#090909] text-white px-4 py-10">
      <div className="max-w-md mx-auto">

        <h1 className="text-2xl font-black mb-1">{bowlingNext} Bowl</h1>
        <p className="text-zinc-400 mb-8 text-sm">Select opening bowler</p>

        <div className="grid grid-cols-2 gap-2 mb-8">
          {newBowlers.map(p => (
            <SelectBtn
              key={p.id}
              selected={bowler === p.id}
              onClick={() => setBowler(p.id)}
            >
              {p.name}
            </SelectBtn>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setStep(1)}
            style={{ WebkitTapHighlightColor: "transparent" }}
            className="h-14 px-6 rounded-2xl border border-white/10 bg-white/[0.03] font-bold flex items-center justify-center active:scale-95 transition"
          >
            ←
          </button>
          <SheetFooter
            text="Start Innings 2 🏏"
            flex
            disabled={!bowler}
            onClick={handleStart}
          />
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────

function getTopBatter(match) {
  // Approximate from striker/nonStriker (full scorecard comes later)
  const candidates = [match.striker, match.nonStriker].filter(Boolean);
  if (!candidates.length) return "—";
  const top = candidates.reduce((a, b) => a.runs > b.runs ? a : b);
  return `${top.name} ${top.runs}(${top.balls})`;
}

function getTopBowler(match) {
  return `${match.bowler.name} ${match.bowler.wickets}/${match.bowler.runs}`;
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

function SelectBtn({ children, selected, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-4 py-3 font-semibold text-sm transition ${
        selected
          ? "border-green-500 bg-green-500/20"
          : disabled
          ? "border-white/5 bg-white/[0.02] text-zinc-600 cursor-not-allowed"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}