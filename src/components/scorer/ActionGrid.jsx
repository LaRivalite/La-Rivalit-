import { useSheet } from "../../context/SheetContext";
import { useMatch } from "../../context/MatchContext";
import { createBall } from "../../engine/createBall";
import { recordBall } from "../../engine/recordBall";

const actions = [
  { label: "0", color: "bg-zinc-800" },
  { label: "1", color: "bg-zinc-800" },
  { label: "2", color: "bg-zinc-800" },
  { label: "3", color: "bg-zinc-800" },
  { label: "4", color: "bg-green-700" },
  { label: "6", color: "bg-purple-700" },
  { label: "W", color: "bg-red-700" },
  { label: "WD", color: "bg-zinc-800" },
  { label: "NB", color: "bg-zinc-800" },
  { label: "BYE", color: "bg-zinc-800" },
];

export default function ActionGrid() {
  const { openSheet } = useSheet();
  const { match, setMatch, syncInningsToDB } = useMatch();

  function addRuns(runs) {
    const ball = createBall({
      over: match.over,
      ball: match.ball,
      striker: match.striker.id,
      nonStriker: match.nonStriker.id,
      bowler: match.bowler.id,
      runsOffBat: runs,
      freeHit: match.freeHit,
    });

    recordBall(ball, match, setMatch, syncInningsToDB);
  }

  function handleAction(action) {
    switch (action.label) {
      case "0": addRuns(0); break;
      case "1": addRuns(1); break;
      case "2": addRuns(2); break;
      case "3": addRuns(3); break;
      case "4": addRuns(4); break;
      case "6": addRuns(6); break;
      case "W":   openSheet("wicket"); break;
      case "WD":  openSheet("wide");   break;
      case "NB":  openSheet("noball"); break;
      case "BYE": openSheet("bye");    break;
      default: break;
    }
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => handleAction(action)}
          style={{ WebkitTapHighlightColor: "transparent" }}
          className={`h-16 rounded-md font-bold text-lg transition active:scale-95 ${action.color}`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}