export default function SheetFooter({
  text = "Next",
  disabled = false,
  onClick,
  flex = false,   // true when placed next to a Back button in a flex row
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className={`
        ${flex ? "flex-1" : "w-full"}
        h-14
        rounded-2xl
        font-bold
        transition

        ${
          disabled
            ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-500"
        }
      `}
    >
      {text}
    </button>
  );
}