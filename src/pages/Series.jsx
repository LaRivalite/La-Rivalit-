import { useNavigate } from "react-router-dom";

export default function Series() {
    const navigate = useNavigate();
  return (
    <div className="px-5 lg:px-20 py-10 max-w-5xl mx-auto">

      <h1
        className="
        text-4xl
        font-black
        uppercase
        "
      >
        Series 6
      </h1>

      <p className="mt-2 text-zinc-500">
        L'Argente
      </p>

      <div
        className="
        mt-8

        rounded-2xl

        border
        border-white/10

        bg-white/[0.03]

        p-6
        "
      >
        <h2 className="font-bold text-xl">
          Result
        </h2>

        <p className="mt-3 text-zinc-400">
          Mavericks won 2-1
        </p>
      </div>

      <div className="mt-8">

        <h2 className="text-2xl font-bold">
          Matches
        </h2>

        <div className="mt-4 space-y-4">

            <button
  onClick={() => navigate("/match/1")}
  className="
  w-full

  rounded-2xl

  border
  border-white/10

  bg-white/[0.03]

  p-5

  text-left
  "
>
  Match 1
</button>

            <button
  onClick={() => navigate("/match/2")}
  className="
  w-full

  rounded-2xl

  border
  border-white/10

  bg-white/[0.03]

  p-5

  text-left
  "
>
  Match 2
</button>

            <button
  onClick={() => navigate("/match/3")}
  className="
  w-full

  rounded-2xl

  border
  border-white/10

  bg-white/[0.03]

  p-5

  text-left
  "
>
  Match 3
</button>

        </div>

      </div>

    </div>
  );
}