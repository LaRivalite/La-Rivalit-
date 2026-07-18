import { useMatch } from "../../../context/MatchContext";
import BallChip from "./BallChip";

export default function OverHistory() {
  const { match } = useMatch();

  return (
    <div
      className="
        mt-5
        rounded-2xl
        border
        border-white/10
        bg-white/[0.03]
        p-4
      "
    >
      <h2 className="font-bold mb-4">
        Previous Overs
      </h2>

      {match.completedOvers.length === 0 ? (
        <p className="text-zinc-500">
          No completed overs
        </p>
      ) : (
        <div className="space-y-5">
          {match.completedOvers.map((over) => (
            <div key={over.over}>

              <p className="mb-2 font-semibold">
                Over {over.over}
              </p>

              <div className="flex gap-2 flex-wrap">
                {over.balls.map((ball, i) => (
                  <BallChip
                    key={i}
                    value={ball}
                  />
                ))}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}