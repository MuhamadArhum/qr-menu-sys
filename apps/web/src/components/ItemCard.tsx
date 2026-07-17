"use client";

import Image from "next/image";
import type { MenuItem } from "@/lib/api";
import { DietaryBadge } from "./DietaryBadge";

interface Props {
  item: MenuItem;
  currency: string;
  onOpen: (item: MenuItem) => void;
}

export function ItemCard({ item, currency, onOpen }: Props) {
  const price = parseFloat(item.basePrice);
  const soldOut = item.availability === "SOLD_OUT";

  return (
    <button
      onClick={() => !soldOut && onOpen(item)}
      disabled={soldOut}
      className={`w-full flex gap-3 p-4 rounded-xl bg-zinc-900 border transition-all text-left ${
        soldOut
          ? "border-zinc-800 opacity-50 cursor-not-allowed"
          : "border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-800 active:scale-[0.98]"
      }`}
    >
      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <h3 className="font-semibold text-zinc-100 leading-snug">{item.name}</h3>
          {soldOut && (
            <span className="shrink-0 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-medium">
              Sold out
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{item.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {item.dietaryTags.map((tag) => (
            <DietaryBadge key={tag} tag={tag} />
          ))}
          {item.calories && (
            <span className="text-[10px] text-zinc-500">{item.calories} kcal</span>
          )}
          {item.prepTimeMinutes && (
            <span className="text-[10px] text-zinc-500">~{item.prepTimeMinutes} min</span>
          )}
        </div>

        <p className="mt-2 font-bold text-orange-400">
          {currency} {price.toFixed(2)}
        </p>
      </div>

      {/* Image */}
      {item.imageUrl && (
        <div className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
      )}

      {!soldOut && (
        <div className="absolute bottom-4 right-4 w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-lg font-light pointer-events-none">
          +
        </div>
      )}
    </button>
  );
}
