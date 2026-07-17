"use client";

import { useEffect, useRef } from "react";
import type { Category } from "@/lib/api";

interface Props {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function CategoryNav({ categories, activeId, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Scroll active pill into view
  useEffect(() => {
    const el = ref.current?.querySelector(`[data-id="${activeId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  const flat = flatten(categories);

  return (
    <div
      ref={ref}
      className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 sticky top-14 z-30 bg-zinc-950/90 backdrop-blur"
    >
      {flat.map((cat) => (
        <button
          key={cat.id}
          data-id={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeId === cat.id
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

function flatten(cats: Category[]): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = [];
  for (const cat of cats) {
    result.push({ id: cat.id, name: cat.name });
    for (const child of cat.children) {
      result.push({ id: child.id, name: `· ${child.name}` });
    }
  }
  return result;
}
