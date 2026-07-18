export default function OverTimeline() {
  const overs = [
    {
      over: 20,
      balls: ["1", "0", "4", "1", "W", "6"],
      runs: 12,
      wickets: 1,
    },

    {
      over: 19,
      balls: ["0", "0", "1", "1", "2", "4"],
      runs: 8,
      wickets: 0,
    },

    {
      over: 18,
      balls: ["W", "1", "0", "0", "6", "1"],
      runs: 8,
      wickets: 1,
    },
  ];

  return (
    <div className="space-y-4">
      {overs.map((over) => (
        <div
          key={over.over}
          className="
          rounded-2xl
          border
          border-white/10
          bg-white/[0.03]
          p-4
          "
        >
          <div className="flex justify-between items-center">

            <h3 className="font-bold">
              Over {over.over}
            </h3>

            <span className="text-zinc-500 text-sm">
              {over.runs} Runs
              {over.wickets > 0 &&
                ` • ${over.wickets} W`}
            </span>

          </div>

          <div className="flex gap-2 mt-4 flex-wrap">

            {over.balls.map((ball, index) => (
              <BallChip
                key={index}
                value={ball}
              />
            ))}

          </div>

        </div>
      ))}
    </div>
  );
}

function BallChip({ value }) {
  let bg = "bg-zinc-800";

  if (value.startsWith("4")) bg = "bg-green-600";
  else if (value.startsWith("6")) bg = "bg-purple-600";
  else if (value.endsWith("W")) bg = "bg-red-600";

  return (
    <div
      className={`
        ${bg}

        h-10
        w-10

        rounded-md

        flex
        items-center
        justify-center

        text-sm
        font-bold
      `}
    >
      {value == 0 ? "•" : value}
    </div>
  );
}