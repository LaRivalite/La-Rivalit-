import { useState } from "react";
import OptionButton from "../shared/OptionButton";
import SelectionGrid from "../shared/SelectionGrid";
import { useMatch } from "../../../context/MatchContext";
import { useSheet } from "../../../context/SheetContext";
import { saveBall } from "../../../engine/saveBall";

export default function WideSheet() {
  const { match, setMatch, syncInningsToDB } = useMatch();
  const { closeSheet } = useSheet();

  const fieldingPlayers = match.fieldingPlayers ?? [];
  const [step, setStep]                       = useState(1);
  const [runsBeforeWicket, setRunsBeforeWicket] = useState(0);
  const [outPlayer, setOutPlayer]             = useState(null);
  const [fielder, setFielder]                 = useState(null);

  function saveNormalWide(extraByes) {
    saveBall(match, setMatch, { wide: 1, byes: extraByes }, closeSheet, syncInningsToDB);
  }

  // Step 1: extra byes or wicket type
  if (step === 1) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-5">Wide</h2>
        <p className="text-sm text-zinc-400 mb-3">Extra byes run?</p>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[0,1,2,3,4,5,6].map(run => (
            <button key={run} onClick={() => saveNormalWide(run)}
              className="h-14 rounded-xl bg-purple-700 font-bold active:scale-95 transition">
              +{run}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <OptionButton onClick={() => setStep(2)}>Run Out</OptionButton>
          <OptionButton onClick={() => setStep("stumped_fielder")}>Stumped</OptionButton>
        </div>
      </div>
    );
  }

  // Step 2: which batter got run out?
  if (step === 2) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-5">Who Got Run Out?</h2>
        <div className="space-y-3">
          <OptionButton
            selected={outPlayer === match.striker.id}
            onClick={() => { setOutPlayer(match.striker.id); setStep(3); }}
          >
            {match.striker.name}
            <span className="text-zinc-500 text-sm ml-2">(Striker)</span>
          </OptionButton>
          <OptionButton
            selected={outPlayer === match.nonStriker.id}
            onClick={() => { setOutPlayer(match.nonStriker.id); setStep(3); }}
          >
            {match.nonStriker.name}
            <span className="text-zinc-500 text-sm ml-2">(Non-Striker)</span>
          </OptionButton>
        </div>
      </div>
    );
  }

  // Step 3: runs (byes) before the run out
  if (step === 3) {
    const outName = outPlayer === match.striker.id ? match.striker.name : match.nonStriker.name;
    return (
      <div>
        <h2 className="text-xl font-bold mb-2">Runs Before Run Out?</h2>
        <p className="text-sm text-zinc-400 mb-5">
          How many Runs were completed before {outName} was run out?
        </p>
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(r => (
            <button key={r}
              onClick={() => { setRunsBeforeWicket(r); setStep("runout_fielder"); }}
              className="h-16 rounded-2xl bg-zinc-700 font-bold text-lg active:scale-95 transition">
              {r}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step: run out fielder (from fielding/bowling team)
  if (step === "runout_fielder") {
    return (
      <div>
        <h2 className="text-xl font-bold mb-5">Who Made The Run Out?</h2>
        <SelectionGrid
          items={fieldingPlayers}
          selected={fielder}
          onSelect={(id) => {
            setFielder(id);
            saveBall(match, setMatch, {
              wide: 1,
              runsOffBat: runsBeforeWicket,
              wicket: { type: "runout", outBatterId: outPlayer, fielder: id },
            }, closeSheet, syncInningsToDB);
          }}
        />
      </div>
    );
  }

  // Step: stumped fielder (from fielding/bowling team)
  if (step === "stumped_fielder") {
    return (
      <div>
        <h2 className="text-xl font-bold mb-5">Who Made The Stumping?</h2>
        <SelectionGrid
          items={fieldingPlayers}
          selected={fielder}
          onSelect={(id) => {
            setFielder(id);
            saveBall(match, setMatch, {
              wide: 1,
              wicket: { type: "stumped", fielder: id },
            }, closeSheet, syncInningsToDB);
          }}
        />
      </div>
    );
  }

  return null;
}