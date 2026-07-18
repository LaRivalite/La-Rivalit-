import { useMatch } from "../../context/MatchContext";

export default function ScoreHeader() {
  const { match } = useMatch();

  const currentOver = `${match.over}.${match.ball}`;

  return (
    <div
      className="
        sticky
        top-0
        z-50

        backdrop-blur-xl

        bg-[#090909]/90

        border-b
        border-white/10
      "
    >
      <div className="max-w-md mx-auto px-4 py-4">

        {/* Score */}

        <div className="flex justify-between items-center">

          <div>

            <h1 className="text-4xl font-black">
              {match.score}/{match.wickets}
            </h1>

            <p className="text-zinc-400 mt-1">
              {currentOver} Overs
            </p>

          </div>

          <div className="text-right">

            <p className="text-sm text-zinc-500">
              Target
            </p>

            <p className="text-2xl font-bold">
              {match.target ?? "-"}
            </p>

          </div>

        </div>

        <div className="h-px bg-white/10 my-4" />

        {/* Match Situation */}

        <div className="grid grid-cols-3 text-center">

          <div>

            <p className="text-xs text-zinc-500">
              Need
            </p>

            <p className="font-bold">
              {match.target
                ? Math.max(match.target - match.score, 0)
                : "-"}
            </p>

          </div>

          <div>

            <p className="text-xs text-zinc-500">
              Free Hit
            </p>

            <p className="font-bold">
              {match.freeHit ? "YES" : "-"}
            </p>

          </div>

          <div>

            <p className="text-xs text-zinc-500">
              Last Over
            </p>

            <p className="font-bold">
              {match.lastOver?.join(" ") || "-"}
            </p>

          </div>

        </div>

      </div>
    </div>
  );
}