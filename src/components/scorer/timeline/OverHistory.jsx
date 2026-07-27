import { useMatch } from "../../../context/MatchContext";
import BallResult from "../../BallResult";

function getPlayerName(id, match) {
  const player =
    [...(match.players ?? []), ...(match.fieldingPlayers ?? [])]
      .find(p => p.id === id);

  return player?.name ?? id;
}

export default function OverHistory() {
  const { match } = useMatch();

  // Get all completed balls grouped by over
  const overs = {};

  match.history
    .filter(ball => ball.over < match.over)
    .forEach(ball => {
      if (!overs[ball.over]) {
        overs[ball.over] = [];
      }

      overs[ball.over].push(ball);
    });


  const completedOvers = Object.entries(overs)
    .sort((a, b) => b[0] - a[0]); // newest first


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


      {completedOvers.length === 0 ? (

        <p className="text-zinc-500">
          No completed overs
        </p>

      ) : (

        <div className="space-y-6">

          {completedOvers.map(([overNum, balls]) => (

            <div key={overNum}>

              <p className="font-semibold mb-2">
                Over {Number(overNum) + 1}
              </p>


              <div className="
                rounded-xl
                bg-white/[0.03]
                p-3
                space-y-3
              ">


                {balls.map(ball => (

                  <div
                    key={ball.id}
                    className="
                      border-b
                      border-white/10
                      pb-3
                      last:border-0
                    "
                  >

                    <p className="text-xs text-zinc-500">
                      {Number(overNum) + 1}.{ball.ball + 1}
                    </p>


                    <p className="text-sm font-semibold">
  {getPlayerName(ball.bowler, match)}
  {" → "}
  {getPlayerName(ball.striker, match)}
</p>


                    <BallResult ball={ball} />

                  </div>

                ))}


              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}