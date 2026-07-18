import { useState } from "react";
import { useMatch } from "../../../context/MatchContext";
import { useSheet } from "../../../context/SheetContext";
import { saveBall } from "../../../engine/saveBall";
import OptionButton from "../shared/OptionButton";

export default function NoBallSheet() {
  const { match, setMatch, syncInningsToDB } = useMatch();
  const { closeSheet } = useSheet();
  const [step, setStep] = useState(1);
  const [runsOffBat, setRunsOffBat] = useState(null);

  function saveNoBall(extraByes = 0) {
    saveBall(match, setMatch, {
      noBall: 1,
      runsOffBat: runsOffBat ?? 0,
      byes: extraByes,
    }, closeSheet, syncInningsToDB);
  }

  if (step === 1) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-2">No Ball</h2>
        <p className="text-sm text-zinc-400 mb-5">Runs off the bat?</p>
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3, 4, 6].map(run => (
            <button key={run} onClick={() => { setRunsOffBat(run); setStep(2); }}
              className="h-16 rounded-2xl bg-orange-600 font-bold text-lg active:scale-95 transition">
              {run}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">No Ball + Byes?</h2>
      <p className="text-sm text-zinc-400 mb-5">
        {runsOffBat} run{runsOffBat !== 1 ? "s" : ""} off bat. Any extra byes?
      </p>
      <div className="grid grid-cols-2 gap-3">
        <OptionButton onClick={() => saveNoBall(0)}>No extra byes</OptionButton>
        {[1, 2, 3, 4].map(b => (
          <OptionButton key={b} onClick={() => saveNoBall(b)}>+{b} Bye{b > 1 ? "s" : ""}</OptionButton>
        ))}
      </div>
    </div>
  );
}