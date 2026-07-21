"use client";

export function RadioCard<T extends string>({
  name,
  value,
  selected,
  label,
  description,
  onSelect,
}: {
  name: string;
  value: T;
  selected: boolean;
  label: string;
  description: string;
  onSelect: (value: T) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm ${
        selected ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
      }`}
    >
      <span className="flex items-center gap-2 font-medium">
        <input
          type="radio"
          name={name}
          value={value}
          checked={selected}
          onChange={() => onSelect(value)}
        />
        {label}
      </span>
      <span className="text-neutral-500">{description}</span>
    </label>
  );
}
