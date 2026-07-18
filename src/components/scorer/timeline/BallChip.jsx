export default function BallChip({ value }) {
  let bg = "bg-zinc-800";

  if (value.startsWith("4")) bg = "bg-green-600";
  else if (value.startsWith("6")) bg = "bg-purple-600";
  else if (value.endsWith("W")) bg = "bg-red-600";

  return (
    <div
      className={`
        w-10
        h-10
        rounded-md
        flex
        items-center
        justify-center
        font-bold
        text-sm
        ${bg}
      `}
    >
      {value == 0 ? "•" : value}
    </div>
  );
}