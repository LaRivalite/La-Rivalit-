import { useState } from "react";
import OptionButton from "../shared/OptionButton";
import SelectionGrid from "../shared/SelectionGrid";
import SheetFooter from "../shared/SheetFooter";
import { useMatch } from "../../../context/MatchContext";
import { useSheet } from "../../../context/SheetContext";
import { saveBall } from "../../../engine/saveBall";
import { availableBatters } from "../../../engine/availableBatters";

// LBW removed — not played in La Rivalité
const DISMISSAL_TYPES = [
  { id: "bowled",    label: "Bowled",       needsFielder: false },
  { id: "caught",    label: "Caught",       needsFielder: true  },
  { id: "stumped",   label: "Stumped",      needsFielder: true  },
  { id: "runout",    label: "Run Out",      needsFielder: true  },
  { id: "hitwicket", label: "Hit Wicket",   needsFielder: false },
  { id: "retired",   label: "Retired Hurt", needsFielder: false },
];

export default function WicketSheet() {
  const { match, setMatch, syncInningsToDB } = useMatch();
  const { closeSheet } = useSheet();

  const [step, setStep]           = useState("dismissal");
  const [runsBeforeWicket, setRunsBeforeWicket] = useState(0);
  const [dismissal, setDismissal] = useState(null);
  const [outBatterId, setOutBatterId] = useState(null); // run out only
  const [fielder, setFielder]     = useState(null);
  const [newBatter, setNewBatter] = useState(null);

  // Batting team players — for new batter selection and run out victim
  const battingPlayers = match.players;

  // Fielding/bowling team players — for catches, stumpings, run outs
  const fieldingPlayers = match.fieldingPlayers ?? [];

  const nextBatters  = availableBatters(match);
  const dismissalDef = DISMISSAL_TYPES.find(d => d.id === dismissal);

  function handleSave() {
    const batter = battingPlayers.find(p => p.id === newBatter);
    saveBall(match, setMatch, {
      wicket: dismissal === "retired" ? null : {
        type: dismissal,
        fielder,
        // For run out, record which batter got out (could be non-striker)
        outBatterId: dismissal === "runout" ? outBatterId : match.striker.id,
      },
      runsOffBat: runsBeforeWicket,
      isRetiredHurt:   dismissal === "retired",
      retiredPlayerId: dismissal === "retired" ? match.striker.id : null,
      // Only pass newBatter if there are eligible ones
      newBatter: nextBatters.length > 0 ? batter : null,
    }, closeSheet, syncInningsToDB);
  }

  // ── STEP: Dismissal type ─────────────────────────────
  if (step === "dismissal") {
    return (
      <div>
        <h2 className="text-xl font-bold mb-5">How Out?</h2>
        <div className="space-y-3">
          {DISMISSAL_TYPES.map(d => (
            <OptionButton
              key={d.id}
              selected={dismissal === d.id}
              onClick={() => setDismissal(d.id)}
            >
              {d.label}
            </OptionButton>
          ))}
        </div>
        <SheetFooter
          disabled={!dismissal}
          onClick={() => {
            if (dismissal === "retired")    { setStep("newbatter"); return; }
            if (dismissal === "runout")     { setStep("runout_who"); return; }
            if (dismissalDef?.needsFielder) { setStep("fielder"); return; }
            setStep("newbatter");
          }}
        />
      </div>
    );
  }

  // ── STEP: Run out — which batter got out? ────────────
  if (step === "runout_who") {
    return (
      <div>
        <h2 className="text-xl font-bold mb-5">Who Got Run Out?</h2>
        <div className="space-y-3">
          <OptionButton
            selected={outBatterId === match.striker.id}
            onClick={() => setOutBatterId(match.striker.id)}
          >
            {match.striker.name}
            <span className="text-zinc-500 text-sm ml-2">(Striker)</span>
          </OptionButton>
          <OptionButton
            selected={outBatterId === match.nonStriker.id}
            onClick={() => setOutBatterId(match.nonStriker.id)}
          >
            {match.nonStriker.name}
            <span className="text-zinc-500 text-sm ml-2">(Non-Striker)</span>
          </OptionButton>
        </div>
        <SheetFooter
          disabled={!outBatterId}
          onClick={() => setStep("runout_runs")}
        />
      </div>
    );
  }

  // ── STEP: Runs before run out ───────────────────────
  if (step === "runout_runs") {
    return (
      <div>
        <h2 className="text-xl font-bold mb-2">Runs Before Run Out?</h2>
        <p className="text-sm text-zinc-400 mb-5">How many runs were completed before the run out?</p>
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(r => (
            <button key={r} onClick={() => { setRunsBeforeWicket(r); setStep("fielder"); }}
              className="h-16 rounded-2xl bg-zinc-700 font-bold text-lg active:scale-95 transition">
              {r}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── STEP: Fielder — always from the BOWLING team ─────
  if (step === "fielder") {
    const label =
      dismissal === "caught"  ? "Who Took the Catch?" :
      dismissal === "stumped" ? "Who Made the Stumping?" :
                                "Who Made the Run Out?";
    return (
      <div>
        <h2 className="text-xl font-bold mb-5">{label}</h2>
        {fieldingPlayers.length === 0 ? (
          <p className="text-zinc-500 text-center py-6">No fielding players found.</p>
        ) : (
          <SelectionGrid
            items={fieldingPlayers}
            selected={fielder}
            onSelect={setFielder}
          />
        )}
        <SheetFooter
          disabled={!fielder}
          onClick={() => setStep("newbatter")}
        />
      </div>
    );
  }

  // ── STEP: New batter ─────────────────────────────────
  if (step === "newbatter") {
    return (
      <div>
        <h2 className="text-xl font-bold mb-2">New Batter</h2>
        {nextBatters.length === 0 ? (
          <p className="text-zinc-400 text-center py-6">
            No more batters available — innings may be over.
          </p>
        ) : (
          <SelectionGrid
            items={nextBatters}
            selected={newBatter}
            onSelect={setNewBatter}
          />
        )}
        <SheetFooter
          text="Save Wicket"
          disabled={nextBatters.length > 0 && !newBatter}
          onClick={handleSave}
        />
      </div>
    );
  }

  return null;
}