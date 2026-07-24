"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import type { MenuResponse, MenuItem, Category, VariantGroup, AddonGroup } from "@/lib/api";
import { calcTotal, parseTaxRates, computeEstimate } from "@/lib/pricing";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = "en" | "ur";
type Theme = "light" | "dark";

interface SelectedVariant {
  groupId: string; groupName: string; optionId: string; optionName: string; priceModifier: number;
}
interface SelectedAddon {
  groupId: string; groupName: string; optionId: string; optionName: string; price: number;
}
interface CartItem {
  cartId: string; menuItemId: string; menuItemName: string; basePrice: number;
  quantity: number; selectedVariants: SelectedVariant[]; selectedAddons: SelectedAddon[];
  note?: string; itemTotal: number;
}
interface FlatItem extends MenuItem { categoryName: string; }

// ─── Translations ─────────────────────────────────────────────────────────────

const T: Record<Lang, Record<string, string>> = {
  en: {
    searchPlaceholder: "Search menu…",
    noResults: "No items found",
    soldOut: "Sold Out",
    required: "Required",
    optional: "Optional",
    upTo: "Up to",
    addToCart: "Add to Bill",
    ingredients: "Ingredients",
    allergens: "Allergens",
    viewBill: "View Bill",
    estimatedBill: "Estimated Bill",
    notAnOrder: "Estimate only — not an order",
    subtotal: "Subtotal",
    serviceCharge: "Service Charge",
    estimatedTotal: "Estimated Total",
    remove: "Remove",
    clearAll: "Clear All",
    addNote: "Add note",
    editNote: "Edit note",
    table: "TABLE",
    continueBrowsing: "Continue Browsing",
    disclaimer: "Personal estimate only. Prices may vary. Please ask your waiter to place an order.",
    openToday: "Open today",
    closedToday: "Closed today",
  },
  ur: {
    searchPlaceholder: "مینو تلاش کریں…",
    noResults: "کوئی آئٹم نہیں ملا",
    soldOut: "ختم ہو گیا",
    required: "لازمی",
    optional: "اختیاری",
    upTo: "زیادہ سے زیادہ",
    addToCart: "بل میں شامل کریں",
    ingredients: "اجزاء",
    allergens: "الرجی کی اشیاء",
    viewBill: "بل دیکھیں",
    estimatedBill: "تخمینی بل",
    notAnOrder: "صرف تخمینہ — آرڈر نہیں",
    subtotal: "ذیلی کل",
    serviceCharge: "سروس چارج",
    estimatedTotal: "تخمینی کل",
    remove: "ہٹائیں",
    clearAll: "سب صاف کریں",
    addNote: "نوٹ شامل کریں",
    editNote: "نوٹ تبدیل کریں",
    table: "میز",
    continueBrowsing: "مینو دیکھتے رہیں",
    disclaimer: "ذاتی تخمینہ ہے۔ قیمتیں مختلف ہو سکتی ہیں۔ براہ کرم ویٹر سے آرڈر دیں۔",
    openToday: "آج کھلا ہے",
    closedToday: "آج بند ہے",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(currency: string, n: number) {
  return `${currency} ${n.toFixed(0)}`;
}

function allCats(menu: Category[]) {
  const r: { id: string; name: string; nameUr: string | null }[] = [];
  for (const c of menu) {
    r.push({ id: c.id, name: c.name, nameUr: c.nameUr });
    for (const ch of c.children) r.push({ id: ch.id, name: ch.name, nameUr: ch.nameUr });
  }
  return r;
}

const SWATCHES = [
  "#FF4630", "#FFA930", "#8FA300", "#1C1710", "#6B5B2E",
  "#C84B31", "#E8740C", "#4A7C59", "#2D4A22", "#8B2635",
];
function swatchColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return SWATCHES[Math.abs(h) % SWATCHES.length];
}

// ─── Business Hours ───────────────────────────────────────────────────────────

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getTodayHours(raw: unknown): { isOpen: boolean; shifts: { open: string; close: string }[] } | null {
  if (!Array.isArray(raw)) return null;
  const todayKey = DAYS[new Date().getDay()];
  const entry = (raw as { day: string; isOpen: boolean; shifts: { open: string; close: string }[] }[])
    .find((e) => e.day === todayKey);
  if (!entry) return null;
  return { isOpen: entry.isOpen, shifts: entry.shifts ?? [] };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIETARY: Record<string, { label: string }> = {
  HALAL:       { label: "Halal" },
  VEGETARIAN:  { label: "Veg" },
  VEGAN:       { label: "Vegan" },
  GLUTEN_FREE: { label: "GF" },
  SPICY:       { label: "Spicy 🌶" },
};

// ─── BusinessHoursLine ────────────────────────────────────────────────────────

function BusinessHoursLine({ raw, t }: { raw: unknown; t: Record<string, string> }) {
  const today = getTodayHours(raw);
  if (!today) return null;

  if (!today.isOpen) {
    return (
      <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "var(--chili)" }}>
        {t.closedToday}
      </p>
    );
  }

  const times = today.shifts
    .map((s) => `${s.open} – ${s.close}`)
    .join(", ");

  return (
    <p className="text-[10px] mt-0.5" style={{ color: "var(--lime)" }}>
      {t.openToday}{times ? `: ${times}` : ""}
    </p>
  );
}

// ─── DietBadge ────────────────────────────────────────────────────────────────

function DietBadge({ tag }: { tag: string }) {
  const d = DIETARY[tag] ?? { label: tag };
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ borderColor: "var(--char-20)", color: "var(--char-60)", background: "var(--cream)" }}>
      {d.label}
    </span>
  );
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────

function ItemCard({ item, currency, onOpen, t, lang }: {
  item: MenuItem; currency: string; t: Record<string, string>; lang: Lang;
  onOpen: (i: MenuItem) => void;
}) {
  const price = parseFloat(item.basePrice);
  const soldOut = item.availability === "SOLD_OUT";
  const displayName = (lang === "ur" && item.nameUr) ? item.nameUr : item.name;
  const displayDesc = (lang === "ur" && item.descriptionUr) ? item.descriptionUr : item.description;
  const swatch = swatchColor(item.name);

  return (
    <div
      onClick={() => !soldOut && onOpen(item)}
      className={`flex gap-3 py-4 border-b last:border-0 ${soldOut ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      style={{ borderColor: "var(--char-10)" }}
    >
      <div className="relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden" style={{ background: swatch + "22" }}>
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={displayName} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-black"
            style={{ color: swatch, fontFamily: "var(--display-font)" }}>
            {item.name[0]?.toUpperCase()}
          </div>
        )}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--paper)cc" }}>
            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "var(--chili)" }}>{t.soldOut}</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {item.dietaryTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {item.dietaryTags.map(tag => <DietBadge key={tag} tag={tag} />)}
          </div>
        )}
        <h3 className="font-bold text-sm leading-snug" style={{ color: "var(--char)", fontFamily: "var(--display-font)" }}>
          {displayName}
        </h3>
        {displayDesc && (
          <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "var(--char-60)" }}>{displayDesc}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="font-bold text-sm" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>
            {fmt(currency, price)}
          </span>
          {!soldOut && (
            <button
              onClick={e => { e.stopPropagation(); onOpen(item); }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-lg font-light shadow-md leading-none"
              style={{ background: "var(--chili)" }}
              aria-label={`Add ${item.name}`}
            >+</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ItemModal ────────────────────────────────────────────────────────────────

function ItemModal({ item, currency, onClose, onAdd, t, lang }: {
  item: MenuItem | null; currency: string; t: Record<string, string>; lang: Lang;
  onClose: () => void;
  onAdd: (item: MenuItem, v: SelectedVariant[], a: SelectedAddon[], qty: number) => void;
}) {
  const [variants, setVariants] = useState<SelectedVariant[]>([]);
  const [addons, setAddons] = useState<SelectedAddon[]>([]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!item) return;
    const auto: SelectedVariant[] = [];
    for (const g of item.variantGroups) {
      if (g.isRequired && g.options[0]) {
        auto.push({ groupId: g.id, groupName: g.name, optionId: g.options[0].id, optionName: g.options[0].name, priceModifier: parseFloat(g.options[0].priceModifier) });
      }
    }
    setVariants(auto); setAddons([]); setQty(1);
  }, [item]);

  if (!item) return null;

  const base = parseFloat(item.basePrice);
  const total = calcTotal(base, variants, addons, qty);
  const canAdd = item.variantGroups.filter(g => g.isRequired).every(g => variants.some(v => v.groupId === g.id));
  const swatch = swatchColor(item.name);
  const modalName = (lang === "ur" && item.nameUr) ? item.nameUr : item.name;
  const modalDesc = (lang === "ur" && item.descriptionUr) ? item.descriptionUr : item.description;

  function pickVariant(grp: VariantGroup, optId: string) {
    const opt = grp.options.find(o => o.id === optId)!;
    setVariants(p => [...p.filter(v => v.groupId !== grp.id), { groupId: grp.id, groupName: grp.name, optionId: optId, optionName: opt.name, priceModifier: parseFloat(opt.priceModifier) }]);
  }
  function toggleAddon(grp: AddonGroup, optId: string, price: number, name: string) {
    setAddons(p => {
      if (p.find(a => a.optionId === optId)) return p.filter(a => a.optionId !== optId);
      if (p.filter(a => a.groupId === grp.id).length >= grp.maxSelect) return p;
      return [...p, { groupId: grp.id, groupName: grp.name, optionId: optId, optionName: name, price }];
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[92vh] rounded-t-3xl overflow-y-auto flex flex-col shadow-2xl"
        style={{ background: "var(--paper)" }}>

        {/* Hero */}
        <div className="relative h-48 w-full shrink-0" style={{ background: swatch + "22" }}>
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl font-black"
              style={{ color: swatch, fontFamily: "var(--display-font)", opacity: 0.6 }}>
              {item.name[0]?.toUpperCase()}
            </div>
          )}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-md"
            style={{ background: "var(--paper)", color: "var(--char)" }}>×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Name + description + dietary */}
          <div>
            <h2 className="text-xl font-black" style={{ fontFamily: "var(--display-font)", color: "var(--char)" }}>{modalName}</h2>
            {modalDesc && <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--char-60)" }}>{modalDesc}</p>}
            {item.dietaryTags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">{item.dietaryTags.map(tag => <DietBadge key={tag} tag={tag} />)}</div>
            )}
          </div>

          {/* Ingredients (FR-MENU-02) */}
          {item.ingredients.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--char-60)" }}>{t.ingredients}</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--char)" }}>{item.ingredients.join(", ")}</p>
            </div>
          )}

          {/* Allergens (FR-MENU-02) */}
          {item.allergens.length > 0 && (
            <div className="rounded-2xl px-4 py-3" style={{ background: "var(--chili-10)", border: "1px solid var(--chili)33" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--chili)" }}>{t.allergens}</p>
              <p className="text-sm" style={{ color: "var(--char)" }}>{item.allergens.join(", ")}</p>
            </div>
          )}

          {/* Variants */}
          {item.variantGroups.map(grp => (
            <div key={grp.id}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm" style={{ fontFamily: "var(--display-font)", color: "var(--char)" }}>{grp.name}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={grp.isRequired ? { background: "var(--chili)", color: "#fff" } : { background: "var(--char-10)", color: "var(--char-60)" }}>
                  {grp.isRequired ? t.required : t.optional}
                </span>
              </div>
              <div className="space-y-2">
                {grp.options.map(opt => {
                  const sel = variants.some(v => v.optionId === opt.id);
                  const delta = parseFloat(opt.priceModifier);
                  return (
                    <label key={opt.id} onClick={() => pickVariant(grp, opt.id)}
                      className="flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all"
                      style={sel ? { borderColor: "var(--chili)", background: "var(--chili-10)" } : { borderColor: "var(--char-10)", background: "var(--cream)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={sel ? { borderColor: "var(--chili)", background: "var(--chili)" } : { borderColor: "var(--char-20)" }}>
                          {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-medium" style={{ color: "var(--char)" }}>{opt.name}</span>
                      </div>
                      {delta !== 0 && (
                        <span className="text-xs font-semibold" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char-60)" }}>
                          {delta > 0 ? "+" : ""}{fmt(currency, Math.abs(delta))}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Add-ons */}
          {item.addonGroups.map(grp => (
            <div key={grp.id}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm" style={{ fontFamily: "var(--display-font)", color: "var(--char)" }}>{grp.name}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--char-10)", color: "var(--char-60)" }}>
                  {t.upTo} {grp.maxSelect}
                </span>
              </div>
              <div className="space-y-2">
                {grp.options.map(opt => {
                  const price = parseFloat(opt.price);
                  const chk = addons.some(a => a.optionId === opt.id);
                  return (
                    <label key={opt.id} onClick={() => toggleAddon(grp, opt.id, price, opt.name)}
                      className="flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all"
                      style={chk ? { borderColor: "var(--chili)", background: "var(--chili-10)" } : { borderColor: "var(--char-10)", background: "var(--cream)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
                          style={chk ? { borderColor: "var(--chili)", background: "var(--chili)" } : { borderColor: "var(--char-20)" }}>
                          {chk && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium" style={{ color: "var(--char)" }}>{opt.name}</span>
                      </div>
                      {price > 0 && (
                        <span className="text-xs font-semibold" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char-60)" }}>
                          +{fmt(currency, price)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Qty + Add */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center rounded-2xl border-2 overflow-hidden" style={{ borderColor: "var(--char-20)" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-11 h-11 flex items-center justify-center text-xl font-light"
                style={{ color: "var(--char-60)" }}>−</button>
              <span className="w-9 text-center font-black" style={{ color: "var(--char)", fontFamily: "var(--display-font)" }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="w-11 h-11 flex items-center justify-center text-xl font-light"
                style={{ color: "var(--char-60)" }}>+</button>
            </div>
            <button
              disabled={!canAdd}
              onClick={() => { onAdd(item, variants, addons, qty); onClose(); }}
              className="flex-1 py-3 rounded-2xl font-bold flex items-center justify-between px-5 transition-all text-sm"
              style={canAdd ? { background: "var(--chili)", color: "#fff" } : { background: "var(--char-10)", color: "var(--char-20)" }}>
              <span>{t.addToCart}</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{fmt(currency, total)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EstimateDrawer (FR-CUST-09 + FR-CUST-07) ────────────────────────────────

function EstimateDrawer({ items, currency, restaurant, branch, onUpdateQty, onRemove, onUpdateNote, onClear, t }: {
  items: CartItem[]; currency: string; t: Record<string, string>;
  restaurant: MenuResponse["restaurant"]; branch: MenuResponse["branch"];
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // hooks must be before early return
  const subtotal = items.reduce((s, i) => s + i.itemTotal, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const estimate = useMemo(
    () => computeEstimate(subtotal, restaurant, branch),
    [subtotal, restaurant, branch],
  );

  if (items.length === 0) return null;

  const { taxes, scAmount, scRate, scEnabled, total } = estimate;

  return (
    <>
      {/* Floating bar */}
      {!open && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4">
          <button onClick={() => setOpen(true)}
            className="w-full max-w-lg mx-auto flex items-center justify-between text-white rounded-2xl py-3.5 px-5 shadow-2xl font-bold text-sm"
            style={{ background: "var(--char)", display: "flex" }}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: "var(--chili)" }}>{totalQty}</span>
            <span style={{ fontFamily: "var(--display-font)" }}>{t.viewBill}</span>
            <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{fmt(currency, total)}</span>
          </button>
        </div>
      )}

      {/* Sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] rounded-t-3xl overflow-y-auto shadow-2xl"
            style={{ background: "var(--paper)" }}>
            <div className="p-5 space-y-4">
              <div className="w-10 h-1 rounded-full mx-auto" style={{ background: "var(--char-20)" }} />

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black" style={{ fontFamily: "var(--display-font)", color: "var(--char)" }}>
                    {t.estimatedBill}
                  </h2>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--chili)" }}>{t.notAnOrder}</p>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xl"
                  style={{ background: "var(--char-10)", color: "var(--char)" }}>×</button>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.cartId} className="rounded-2xl overflow-hidden" style={{ background: "var(--cream)" }}>
                    <div className="flex gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: "var(--char)", fontFamily: "var(--display-font)" }}>
                          {item.menuItemName}
                        </p>
                        {item.selectedVariants.map(v => (
                          <p key={v.optionId} className="text-[11px]" style={{ color: "var(--char-60)" }}>{v.groupName}: {v.optionName}</p>
                        ))}
                        {item.selectedAddons.map(a => (
                          <p key={a.optionId} className="text-[11px]" style={{ color: "var(--char-60)" }}>+ {a.optionName}</p>
                        ))}
                        <p className="text-sm font-bold mt-1" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--chili)" }}>
                          {fmt(currency, item.itemTotal)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end justify-between shrink-0">
                        <button onClick={() => onRemove(item.cartId)} className="text-[11px] font-medium" style={{ color: "var(--chili)" }}>
                          {t.remove}
                        </button>
                        <div className="flex items-center gap-1 rounded-xl overflow-hidden border" style={{ borderColor: "var(--char-20)", background: "var(--paper)" }}>
                          <button onClick={() => item.quantity > 1 ? onUpdateQty(item.cartId, item.quantity - 1) : onRemove(item.cartId)}
                            className="w-8 h-8 flex items-center justify-center text-base" style={{ color: "var(--char-60)" }}>−</button>
                          <span className="w-6 text-center text-sm font-black" style={{ color: "var(--char)", fontFamily: "var(--display-font)" }}>
                            {item.quantity}
                          </span>
                          <button onClick={() => onUpdateQty(item.cartId, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-base" style={{ color: "var(--char-60)" }}>+</button>
                        </div>
                      </div>
                    </div>
                    {/* Per-item note */}
                    <div className="px-3 pb-3">
                      <button
                        onClick={() => setExpandedNoteId(expandedNoteId === item.cartId ? null : item.cartId)}
                        className="text-[11px] font-medium flex items-center gap-1"
                        style={{ color: item.note ? "var(--chili)" : "var(--char-60)" }}>
                        <span>{item.note ? "📝" : "+"}</span>
                        <span>{item.note ? t.editNote : t.addNote}</span>
                      </button>
                      {expandedNoteId === item.cartId && (
                        <input
                          autoFocus
                          value={item.note ?? ""}
                          onChange={e => onUpdateNote(item.cartId, e.target.value)}
                          placeholder="e.g. No onions…"
                          className="mt-2 w-full rounded-xl px-3 py-2 text-xs focus:outline-none"
                          style={{ background: "var(--paper)", border: "1.5px solid var(--char-20)", color: "var(--char)" }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill breakdown (FR-CUST-07) */}
              <div className="rounded-2xl p-4 space-y-2" style={{ background: "var(--cream)" }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--char-60)" }}>{t.subtotal}</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{fmt(currency, subtotal)}</span>
                </div>
                {taxes.map((tax, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span style={{ color: "var(--char-60)" }}>{tax.name} ({tax.rate}%)</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{fmt(currency, tax.amount)}</span>
                  </div>
                ))}
                {scEnabled && scAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--char-60)" }}>{t.serviceCharge} ({scRate}%)</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{fmt(currency, scAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black pt-2 border-t" style={{ borderColor: "var(--char-20)" }}>
                  <span style={{ color: "var(--char)" }}>{t.estimatedTotal}</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--chili)" }}>{fmt(currency, total)}</span>
                </div>
              </div>

              {/* Disclaimer banner */}
              <div className="rounded-2xl px-4 py-3 text-xs text-center" style={{ background: "var(--char-10)", color: "var(--char-60)" }}>
                {t.disclaimer}
              </div>

              <button onClick={() => setOpen(false)}
                className="w-full py-4 rounded-2xl font-bold text-white"
                style={{ background: "var(--chili)", fontFamily: "var(--display-font)" }}>
                {t.continueBrowsing}
              </button>
              <button onClick={() => { onClear(); setOpen(false); }}
                className="w-full py-3 text-sm" style={{ color: "var(--char-60)" }}>
                {t.clearAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── CategorySection ──────────────────────────────────────────────────────────

function CategorySection({ category, currency, refs, onOpen, t, lang }: {
  category: Category; currency: string; t: Record<string, string>; lang: Lang;
  refs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  onOpen: (i: MenuItem) => void;
}) {
  const catName = (lang === "ur" && category.nameUr) ? category.nameUr : category.name;
  return (
    <section ref={el => { refs.current[category.id] = el; }} className="scroll-mt-28">
      <h2 className="text-base font-black mb-2" style={{ fontFamily: "var(--display-font)", color: "var(--char)" }}>
        {catName}
      </h2>
      {category.menuItems.length > 0 && (
        <div>{category.menuItems.map(item => <ItemCard key={item.id} item={item} currency={currency} onOpen={onOpen} t={t} lang={lang} />)}</div>
      )}
      {category.children.map(child => {
        const childName = (lang === "ur" && child.nameUr) ? child.nameUr : child.name;
        return (
          <div key={child.id} ref={el => { refs.current[child.id] = el; }} className="mt-5 scroll-mt-28">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 rounded-full" style={{ background: "var(--chili)" }} />
              <h3 className="text-sm font-bold" style={{ fontFamily: "var(--display-font)", color: "var(--char)" }}>{childName}</h3>
            </div>
            <div>{child.menuItems.map(item => <ItemCard key={item.id} item={item} currency={currency} onOpen={onOpen} t={t} lang={lang} />)}</div>
          </div>
        );
      })}
    </section>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-xl"
        style={{ background: "var(--char)", fontFamily: "var(--display-font)" }}>
        {message}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const CART_KEY = (v: string) => `estimate_${v}`;

export function MenuView({ data, codeValue }: { data: MenuResponse; codeValue: string }) {
  const { restaurant, branch, table, menu } = data;
  const currency = restaurant.defaultCurrency;

  // ── State ──────────────────────────────────────────────────────────────────

  const [theme, setTheme] = useState<Theme>(() =>
    restaurant.themeDefault === "dark" ? "dark" : "light",
  );
  const [lang, setLang] = useState<Lang>("en");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeId, setActiveId] = useState(menu[0]?.id ?? "");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(CART_KEY(codeValue)) ?? "[]") as CartItem[]; }
    catch { return []; }
  });
  const [toast, setToast] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Derived ────────────────────────────────────────────────────────────────

  const cats = useMemo(() => allCats(menu), [menu]);
  const t = T[lang];
  const isSearching = searchQuery.trim().length > 0;

  const flatItems = useMemo<FlatItem[]>(() => {
    const result: FlatItem[] = [];
    function traverse(cats: Category[], prefix = "") {
      for (const cat of cats) {
        const name = prefix ? `${prefix} › ${cat.name}` : cat.name;
        for (const item of cat.menuItems) result.push({ ...item, categoryName: name });
        traverse(cat.children, name);
      }
    }
    traverse(menu);
    return result;
  }, [menu]);

  const searchResults = useMemo<FlatItem[]>(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return flatItems.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.dietaryTags.some(dt => DIETARY[dt]?.label.toLowerCase().includes(q)) ||
      item.ingredients.some(ing => ing.toLowerCase().includes(q)) ||
      item.allergens.some(al => al.toLowerCase().includes(q)),
    );
  }, [searchQuery, flatItems]);

  // ── Effects ────────────────────────────────────────────────────────────────

  // FR-CUST-10: apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    return () => { document.documentElement.removeAttribute("data-theme"); };
  }, [theme]);

  // Persist estimate cart to localStorage
  useEffect(() => {
    try { localStorage.setItem(CART_KEY(codeValue), JSON.stringify(cart)); } catch {}
  }, [cart, codeValue]);

  // Focus search input when search opens
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  // Scroll spy via IntersectionObserver
  useEffect(() => {
    const intersecting = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingRef.current) return;
        for (const entry of entries) {
          const id = Object.entries(refs.current).find(([, el]) => el === entry.target)?.[0];
          if (!id) continue;
          if (entry.isIntersecting) intersecting.add(id);
          else intersecting.delete(id);
        }
        for (const cat of allCats(menu)) {
          if (intersecting.has(cat.id)) { setActiveId(cat.id); break; }
        }
      },
      { rootMargin: "-5% 0px -65% 0px", threshold: 0 },
    );
    for (const el of Object.values(refs.current)) { if (el) observer.observe(el); }
    return () => observer.disconnect();
  }, [menu]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function gotoCategory(id: string) {
    setActiveId(id);
    scrollingRef.current = true;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => { scrollingRef.current = false; }, 900);
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    navRef.current?.querySelector<HTMLElement>(`[data-cat="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1800);
  }

  const addToCart = useCallback((item: MenuItem, variants: SelectedVariant[], addons: SelectedAddon[], qty: number) => {
    const itemTotal = calcTotal(parseFloat(item.basePrice), variants, addons, qty);
    setCart(prev => [...prev, {
      cartId: `${item.id}-${Date.now()}`, menuItemId: item.id, menuItemName: item.name,
      basePrice: parseFloat(item.basePrice), quantity: qty,
      selectedVariants: variants, selectedAddons: addons, itemTotal,
    }]);
    showToast(`${qty > 1 ? `${qty}× ` : ""}${item.name} added!`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateQty = useCallback((cartId: string, qty: number) => {
    setCart(prev => prev.map(i => i.cartId === cartId
      ? { ...i, quantity: qty, itemTotal: calcTotal(i.basePrice, i.selectedVariants, i.selectedAddons, qty) }
      : i));
  }, []);

  const updateNote = useCallback((cartId: string, note: string) => {
    setCart(prev => prev.map(i => i.cartId === cartId ? { ...i, note } : i));
  }, []);

  const removeItem = useCallback((cartId: string) => setCart(prev => prev.filter(i => i.cartId !== cartId)), []);

  const clearCart = useCallback(() => {
    setCart([]);
    try { localStorage.removeItem(CART_KEY(codeValue)); } catch {}
  }, [codeValue]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="min-h-screen pb-36" style={{ background: "var(--paper)" }}>

      {/* ── Hero ── */}
      <div className="relative">
        {restaurant.coverImageUrl ? (
          <div className="relative h-44 w-full">
            <Image src={restaurant.coverImageUrl} alt={restaurant.displayName} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70" />
          </div>
        ) : (
          <div className="h-28" style={{ background: `linear-gradient(135deg, var(--chili) 0%, var(--mango) 100%)`, opacity: 0.15 }} />
        )}

        {/* FR-CUST-10 + FR-CUST-11: Dark mode & language controls */}
        <div className={`absolute top-3 flex gap-2 z-10 ${lang === "ur" ? "left-3" : "right-3"}`}>
          <button
            onClick={() => setTheme(th => th === "light" ? "dark" : "light")}
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm"
            style={{ background: "var(--paper)dd", color: "var(--char)" }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => setLang(l => l === "en" ? "ur" : "en")}
            className="h-9 px-3 rounded-full flex items-center justify-center text-xs font-bold shadow-md backdrop-blur-sm"
            style={{ background: "var(--paper)dd", color: "var(--char)", fontFamily: "var(--display-font)" }}
          >
            {lang === "en" ? "اردو" : "EN"}
          </button>
        </div>

        {/* Restaurant info card */}
        <div className="px-4 -mt-6 relative z-10">
          <div className="rounded-3xl shadow-xl p-4" style={{ background: "var(--paper)" }}>
            <div className="flex items-center gap-3">
              {restaurant.logoUrl ? (
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border" style={{ borderColor: "var(--char-10)" }}>
                  <Image src={restaurant.logoUrl} alt={restaurant.displayName} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-black text-white"
                  style={{ background: "var(--chili)", fontFamily: "var(--display-font)" }}>
                  {restaurant.displayName[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="font-black text-base leading-tight truncate" style={{ fontFamily: "var(--display-font)", color: "var(--char)" }}>
                  {restaurant.displayName}
                </h1>
                {restaurant.description && (
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--char-60)" }}>{restaurant.description}</p>
                )}
                <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--char-60)" }}>{branch.address}</p>
                <BusinessHoursLine raw={branch.businessHours} t={t} />
              </div>
              {/* Table stamp */}
              <div className="shrink-0 w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center"
                style={{ borderColor: "var(--char-20)", transform: "rotate(-8deg)" }}>
                <div className="text-center">
                  <div className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "var(--char-60)" }}>{t.table}</div>
                  <div className="text-lg font-black leading-none" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{table.label}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FR-CUST-04: Category Nav OR Search Bar ── */}
      {searchOpen ? (
        <div className="sticky top-0 z-30 px-4 py-3 border-b flex items-center gap-3 mt-3"
          style={{ background: "var(--paper)f0", backdropFilter: "blur(8px)", borderColor: "var(--char-10)" }}>
          <button
            onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
            className="w-9 h-9 flex items-center justify-center rounded-full shrink-0 text-lg"
            style={{ background: "var(--char-10)", color: "var(--char)" }}>
            ←
          </button>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: "var(--char)" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              className="w-7 h-7 flex items-center justify-center rounded-full text-lg shrink-0"
              style={{ color: "var(--char-60)" }}>×</button>
          )}
        </div>
      ) : (
        <div ref={navRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 sticky top-0 z-30 border-b mt-3"
          style={{ background: "var(--paper)f0", backdropFilter: "blur(8px)", borderColor: "var(--char-10)" }}>
          {cats.map(cat => {
            const active = activeId === cat.id;
            const navName = (lang === "ur" && cat.nameUr) ? cat.nameUr : cat.name;
            return (
              <button key={cat.id} data-cat={cat.id} onClick={() => gotoCategory(cat.id)}
                className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all shrink-0"
                style={active ? { background: "var(--char)", color: "var(--cream)" } : { background: "var(--char-10)", color: "var(--char-60)" }}>
                {navName}
              </button>
            );
          })}
          <button onClick={() => setSearchOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full shrink-0 ml-auto"
            style={{ background: "var(--char-10)", color: "var(--char-60)" }}
            aria-label="Search menu">
            🔍
          </button>
        </div>
      )}

      {/* ── Content ── */}
      <div className="px-4 pt-4 space-y-6">
        {isSearching ? (
          searchResults.length > 0 ? (
            <div>
              {searchResults.map(item => (
                <div key={`${item.id}-${item.categoryName}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider pt-3 pb-1" style={{ color: "var(--char-60)" }}>
                    {item.categoryName}
                  </p>
                  <ItemCard item={item} currency={currency} onOpen={setSelectedItem} t={t} lang={lang} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center" style={{ color: "var(--char-60)" }}>
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm font-semibold">{t.noResults}</p>
            </div>
          )
        ) : (
          menu.map(cat => (
            <CategorySection key={cat.id} category={cat} currency={currency} refs={refs} onOpen={setSelectedItem} t={t} lang={lang} />
          ))
        )}
      </div>

      <ItemModal item={selectedItem} currency={currency} onClose={() => setSelectedItem(null)} onAdd={addToCart} t={t} lang={lang} />
      {toast && <Toast message={toast} />}
      <EstimateDrawer
        items={cart} currency={currency} restaurant={restaurant} branch={branch}
        onUpdateQty={updateQty} onRemove={removeItem} onUpdateNote={updateNote} onClear={clearCart} t={t}
      />
    </main>
  );
}
