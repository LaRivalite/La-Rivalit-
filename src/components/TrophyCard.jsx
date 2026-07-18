import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function TrophyCard({ type }) {
  const isSilver = type === "silver";
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(type === "silver" ? "/silver-ball" : "/golden-ball");
  };

  return (
    <div
      onClick={handleClick}
      className="
      group
      relative

      overflow-hidden

      rounded-[32px]

      border
      border-white/10

      bg-white/[0.03]
      backdrop-blur-xl

      p-8

      transition-all
      duration-300

      hover:border-white/20
      hover:bg-white/[0.05]
      "
    >
      {/* Glow */}

      <div
        className={`
        absolute
        inset-0
        opacity-30

        ${
          isSilver
            ? "bg-gradient-to-br from-slate-400/10 to-transparent"
            : "bg-gradient-to-br from-amber-400/10 to-transparent"
        }
        `}
      />

      {/* Trophy */}

      <div className="relative z-10 text-center">

        <div className="text-6xl">
          {isSilver ? "🥈" : "🥇"}
        </div>

        <h3
          className="
          mt-6

          text-2xl
          font-black

          uppercase
          tracking-[0.15em]
          "
        >
          {isSilver ? "Silver Ball" : "Golden Ball"}
        </h3>

        <p
          className="
          mt-4

          text-zinc-400
          text-sm
          "
        >
          Complete match history, rivalry statistics,
          records and achievements.
        </p>

        <div
          className="
          mt-8

          flex
          items-center
          justify-center
          gap-2

          text-sm
          text-zinc-300

          group-hover:text-white
          "
        >
          Explore

          <ChevronRight size={16} />
        </div>

      </div>
    </div>
  );
}