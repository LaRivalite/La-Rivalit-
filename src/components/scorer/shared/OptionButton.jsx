export default function OptionButton({
  children,
  selected = false,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full
        rounded-2xl
        border
        p-4
        text-center
        font-semibold
        transition-all
        duration-200

        ${
          selected
            ? "border-green-500 bg-green-500/20"
            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
        }
      `}
    >
      {children}
    </button>
  );
}