import { useMatch } from "../../../context/MatchContext";
import { useSheet } from "../../../context/SheetContext";
import { saveBall } from "../../../engine/saveBall";

export default function ByeSheet() {
  const { match, setMatch, syncInningsToDB } = useMatch();
  const { closeSheet } = useSheet();

  function saveBye(runs) {
    saveBall(match, setMatch, { byes: runs }, closeSheet, syncInningsToDB);
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Bye</h2>
      <p className="text-sm text-zinc-400 mb-5">Ball missed bat and keeper — how many runs?</p>
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(run => (
          <button key={run} onClick={() => saveBye(run)}
            className="h-16 rounded-2xl bg-sky-700 font-bold text-lg active:scale-95 transition">
            {run}
          </button>
        ))}
      </div>
    </div>
  );
}