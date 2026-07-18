import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ to }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8"
    >
      <ArrowLeft size={18} /> Back
    </button>
  );
}