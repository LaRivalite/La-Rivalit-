import { useNavigate, useParams } from "react-router-dom";

export default function Team() {
  const navigate = useNavigate();

  const { competition, team } = useParams();

  const teamData = {
  mavericks: {
    seriesWins: 4,
    matchWins: 14,
    highestTotal: "238/4",
    lowestTotal: "102",
    biggestWin: "58 Runs",
  },

  spartans: {
    seriesWins: 2,
    matchWins: 11,
    highestTotal: "225/6",
    lowestTotal: "94",
    biggestWin: "6 Wickets",
  },
};

const stats = teamData[team.toLowerCase()];

  const players = [
    {
      id: "p1",
      name: "Asmar",
    },
    {
      id: "p2",
      name: "Hamza",
    },
    {
      id: "p3",
      name: "Ali",
    },
    {
      id: "p4",
      name: "Usman",
    },
  ];

  return (
    <div className="px-5 lg:px-20 py-10">

      <h1
        className="
        text-4xl
        font-black
        uppercase
        "
      >
        {team}
      </h1>

      <p className="mt-2 text-zinc-500">
        {competition}
      </p>

      <div
  className="
  mt-8
  grid
  grid-cols-2
  gap-4
  "
>
  <StatCard
    title="Series Wins"
    value={stats.seriesWins}
  />

  <StatCard
    title="Match Wins"
    value={stats.matchWins}
  />
</div>

      <div className="mt-8 space-y-4">

        {players.map((player) => (
          <button
            key={player.id}
            onClick={() =>
              navigate(
                `/player/${competition}/${player.id}`
              )
            }
            className="
            w-full

            text-left

            rounded-2xl

            border
            border-white/10

            bg-white/[0.03]

            p-5

            hover:bg-white/[0.05]

            transition
            "
          >
            <div className="flex justify-between items-center">

              <span className="font-semibold">
                {player.name}
              </span>

              <span className="text-zinc-500">
                →
              </span>

            </div>
          </button>
        ))}

      </div>
      <div className="mt-10">

  <h2 className="text-xl font-bold">
    Team Records
  </h2>

  <div
    className="
    mt-4

    grid
    grid-cols-1

    gap-4
    "
  >
    <StatCard
      title="Highest Total"
      value={stats.highestTotal}
    />

    <StatCard
      title="Lowest Total"
      value={stats.lowestTotal}
    />

    <StatCard
      title="Biggest Win"
      value={stats.biggestWin}
    />
  </div>

</div>

    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div
      className="
      rounded-2xl

      border
      border-white/10

      bg-white/[0.03]

      p-4
      "
    >
      <p className="text-zinc-500 text-sm">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}