const LABELS: Record<string, { label: string; color: string }> = {
  VEGETARIAN: { label: "Veg", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  VEGAN: { label: "Vegan", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  HALAL: { label: "Halal", color: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  SPICY: { label: "🌶 Spicy", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  GLUTEN_FREE: { label: "GF", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
};

export function DietaryBadge({ tag }: { tag: string }) {
  const info = LABELS[tag];
  if (!info) return null;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${info.color}`}>
      {info.label}
    </span>
  );
}
