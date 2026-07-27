import { useMatch } from "../../../context/MatchContext";
import BallResult from "../../BallResult";

export default function CurrentOver() {
  const { match } = useMatch();

  const currentOverBalls = match.history.filter(
    ball => ball.over === match.over
  );

  return (
    <div className="
      mt-6
      rounded-2xl
      border
      border-white/10
      bg-white/[0.03]
      p-4
    ">

      <h2 className="font-bold mb-4">
        Over {match.over + 1}
      </h2>


      {/* Bowler info */}
      <div className="mb-4 rounded-xl bg-white/[0.03] p-3">

        <p className="text-sm text-zinc-400">
          Bowler
        </p>

        <p className="font-bold">
          {match.bowler.name}
        </p>

        <p className="text-xs text-zinc-500 mt-1">
          {match.bowler.overs} overs •  {match.bowler.runs} runs •  {match.bowler.wickets} wickets
        </p>

      </div>


      {/* Batters */}
      <div className="grid grid-cols-2 gap-3 mb-5">

        <div className="rounded-xl bg-white/[0.03] p-3">
          <p className="text-xs text-zinc-500">
            Striker
          </p>
          <p className="font-bold">
            {match.striker.name}
          </p>
          <p className="text-sm">
            {match.striker.runs} ({match.striker.balls})
          </p>
        </div>


        <div className="rounded-xl bg-white/[0.03] p-3">
          <p className="text-xs text-zinc-500">
            Non-Striker
          </p>
          <p className="font-bold">
            {match.nonStriker.name}
          </p>
          <p className="text-sm">
            {match.nonStriker.runs} ({match.nonStriker.balls})
          </p>
        </div>

      </div>


      {/* Ball timeline */}
      <div className="space-y-3">

        {currentOverBalls.length === 0 ? (

          <p className="text-zinc-500 text-sm">
            No deliveries yet
          </p>

        ) : (

          currentOverBalls.map(ball => (

            <div
              key={ball.id}
              className="
                border-t
                border-white/10
                pt-3
              "
            >

              <p className="text-xs text-zinc-500">
                {ball.over + 1}.{ball.ball + 1}
              </p>


              <p className="font-semibold text-sm">
                {match.bowler.name}
                {" → "}
                {
                  ball.striker === match.striker.id
                    ? match.striker.name
                    : match.nonStriker.name
                }
              </p>


              <BallResult ball={ball} />

            </div>

          ))

        )}

      </div>

    </div>
  );
}