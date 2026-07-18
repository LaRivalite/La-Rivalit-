import { useMatch } from "../../../context/MatchContext";
import BallChip from "./BallChip";

export default function CurrentOver() {
  const { match } = useMatch();

  return (
    <div
      className="
        mt-6
        rounded-2xl
        border
        border-white/10
        bg-white/[0.03]
        p-4
      "
    >
      <h2 className="font-bold mb-4">
        Current Over
      </h2>

      <div className="flex gap-2 flex-wrap">
        {match.lastOver.length === 0 ? (
          <p className="text-zinc-500">
            No deliveries yet
          </p>
        ) : (
          match.lastOver.map((ball, index) => (
            <BallChip
              key={index}
              value={ball}
            />
          ))
        )}
      </div>
    </div>
  );
}