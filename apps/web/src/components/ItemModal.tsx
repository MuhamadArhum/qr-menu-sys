"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { MenuItem, VariantGroup, AddonGroup } from "@/lib/api";
import type { SelectedVariant, SelectedAddon } from "@/lib/bill";
import { calcUnitPrice } from "@/lib/bill";
import { DietaryBadge } from "./DietaryBadge";

interface Props {
  item: MenuItem | null;
  currency: string;
  onClose: () => void;
  onAddToBill: (item: MenuItem, variants: SelectedVariant[], addons: SelectedAddon[]) => void;
}

export function ItemModal({ item, currency, onClose, onAddToBill }: Props) {
  const [variants, setVariants] = useState<SelectedVariant[]>([]);
  const [addons, setAddons] = useState<SelectedAddon[]>([]);

  useEffect(() => {
    if (!item) return;
    // Pre-select first option of each required variant group
    const autoVariants: SelectedVariant[] = [];
    for (const grp of item.variantGroups) {
      if (grp.isRequired && grp.options[0]) {
        autoVariants.push({
          groupId: grp.id,
          groupName: grp.name,
          optionId: grp.options[0].id,
          optionName: grp.options[0].name,
          priceModifier: parseFloat(grp.options[0].priceModifier),
        });
      }
    }
    setVariants(autoVariants);
    setAddons([]);
  }, [item]);

  if (!item) return null;

  const basePrice = parseFloat(item.basePrice);
  const unitPrice = calcUnitPrice(basePrice, variants, addons);
  const canAdd = item.variantGroups
    .filter((g) => g.isRequired)
    .every((g) => variants.some((v) => v.groupId === g.id));

  function selectVariant(grp: VariantGroup, optId: string) {
    const opt = grp.options.find((o) => o.id === optId)!;
    setVariants((prev) => {
      const others = prev.filter((v) => v.groupId !== grp.id);
      return [...others, {
        groupId: grp.id,
        groupName: grp.name,
        optionId: optId,
        optionName: opt.name,
        priceModifier: parseFloat(opt.priceModifier),
      }];
    });
  }

  function toggleAddon(grp: AddonGroup, optId: string, price: number, name: string) {
    setAddons((prev) => {
      const exists = prev.find((a) => a.optionId === optId);
      if (exists) return prev.filter((a) => a.optionId !== optId);
      const groupAddons = prev.filter((a) => a.groupId === grp.id);
      if (groupAddons.length >= grp.maxSelect) return prev;
      return [...prev, { groupId: grp.id, optionId: optId, optionName: name, price }];
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-zinc-900 rounded-t-2xl sm:rounded-2xl overflow-y-auto">
        {/* Image */}
        {item.imageUrl && (
          <div className="relative h-48 w-full">
            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-transparent" />
          </div>
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-xl font-bold text-zinc-100">{item.name}</h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl leading-none ml-4">
              ×
            </button>
          </div>

          {item.description && (
            <p className="text-sm text-zinc-400 mb-3">{item.description}</p>
          )}

          <div className="flex gap-2 flex-wrap mb-4">
            {item.dietaryTags.map((tag) => <DietaryBadge key={tag} tag={tag} />)}
            {item.calories && <span className="text-xs text-zinc-500">{item.calories} kcal</span>}
            {item.prepTimeMinutes && <span className="text-xs text-zinc-500">~{item.prepTimeMinutes} min</span>}
          </div>

          {/* Variant groups */}
          {item.variantGroups.map((grp) => (
            <div key={grp.id} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-zinc-200">{grp.name}</h3>
                {grp.isRequired ? (
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded">Required</span>
                ) : (
                  <span className="text-[10px] text-zinc-500">Optional</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {grp.options.map((opt) => {
                  const selected = variants.find((v) => v.optionId === opt.id);
                  const delta = parseFloat(opt.priceModifier);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => selectVariant(grp, opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? "border-orange-500 bg-orange-500/10 text-zinc-100"
                          : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      <div className="text-sm font-medium">{opt.name}</div>
                      {delta !== 0 && (
                        <div className="text-xs text-zinc-400">
                          {delta > 0 ? "+" : ""}{currency} {Math.abs(delta).toFixed(2)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Addon groups */}
          {item.addonGroups.map((grp) => (
            <div key={grp.id} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-zinc-200">{grp.name}</h3>
                <span className="text-[10px] text-zinc-500">
                  {grp.isRequired ? "Required · " : ""}Pick up to {grp.maxSelect}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {grp.options.map((opt) => {
                  const price = parseFloat(opt.price);
                  const checked = addons.some((a) => a.optionId === opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleAddon(grp, opt.id, price, opt.name)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        checked
                          ? "border-orange-500 bg-orange-500/10 text-zinc-100"
                          : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      <div className="text-sm font-medium">{opt.name}</div>
                      {price > 0 && (
                        <div className="text-xs text-zinc-400">+{currency} {price.toFixed(2)}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* CTA */}
          <button
            disabled={!canAdd}
            onClick={() => { onAddToBill(item, variants, addons); onClose(); }}
            className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-between px-5 transition-all ${
              canAdd
                ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25"
                : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
            }`}
          >
            <span>Add to bill</span>
            <span>{currency} {unitPrice.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
