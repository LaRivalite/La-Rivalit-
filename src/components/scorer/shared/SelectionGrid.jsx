import OptionButton from "./OptionButton";

export default function SelectionGrid({
  items,
  selected,
  onSelect,
}) {
  return (
    <div className="grid grid-cols-2 gap-3">

      {items.map((item) => (

        <OptionButton
          key={item.id}
          selected={selected === item.id}
          onClick={() => onSelect(item.id)}
        >
          {item.name}
        </OptionButton>

      ))}

    </div>
  );
}