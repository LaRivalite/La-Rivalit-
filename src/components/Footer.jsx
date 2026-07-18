import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="py-12 text-center">

      <div className="h-px w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <button
        onClick={() => navigate("/matches")}
        className="mt-6 text-zinc-400 hover:text-white text-sm font-semibold transition"
      >
        View Match History →
      </button>

      <p className="mt-4 text-zinc-600 text-xs">
        La Rivalité • Mavericks vs Spartans
      </p>

    </footer>
  );
}