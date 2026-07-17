"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import type { MenuResponse, MenuItem, Category, VariantGroup, AddonGroup } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcTotal(base: number, variants: SelectedVariant[], addons: SelectedAddon[], qty: number) {
  return (base + variants.reduce((s, v) => s + v.priceModifier, 0) + addons.reduce((s, a) => s + a.price, 0)) * qty;
}
function fmt(currency: string, n: number) {
  return `${currency} ${n.toFixed(0)}`;
}
function allCats(menu: Category[]) {
  const r: { id: string; name: string }[] = [];
  for (const c of menu) {
    r.push({ id: c.id, name: c.name });
    for (const ch of c.children) r.push({ id: ch.id, name: ch.name });
  }
  return r;
}

// Swatch colors for items without images
const SWATCHES = [
  "#FF4630", "#FFA930", "#8FA300", "#1C1710", "#6B5B2E",
  "#C84B31", "#E8740C", "#4A7C59", "#2D4A22", "#8B2635",
];
function swatchColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return SWATCHES[Math.abs(h) % SWATCHES.length];
}

const DIETARY: Record<string, { label: string }> = {
  HALAL:       { label: "Halal" },
  VEGETARIAN:  { label: "Veg" },
  VEGAN:       { label: "Vegan" },
  GLUTEN_FREE: { label: "GF" },
  SPICY:       { label: "Spicy 🌶" },
};

function DietBadge({ tag }: { tag: string }) {
  const d = DIETARY[tag] ?? { label: tag };
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ borderColor: "var(--char-20)", color: "var(--char-60)", background: "var(--cream)" }}>
      {d.label}
    </span>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({ item, currency, onOpen }: { item: MenuItem; currency: string; onOpen: (i: MenuItem) => void }) {
  const price = parseFloat(item.basePrice);
  const soldOut = item.availability === "SOLD_OUT";
  const swatch = swatchColor(item.name);

  return (
    <div
      onClick={() => !soldOut && onOpen(item)}
      className={`flex gap-3 py-4 border-b last:border-0 ${soldOut ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      style={{ borderColor: "var(--char-10)" }}
    >
      {/* Left swatch / image */}
      <div className="relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden" style={{ background: swatch + "22" }}>
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-black"
            style={{ color: swatch, fontFamily: "Space Grotesk, sans-serif" }}>
            {item.name[0]?.toUpperCase()}
          </div>
        )}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--paper)cc" }}>
            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "var(--chili)" }}>Sold Out</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {item.dietaryTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {item.dietaryTags.map(t => <DietBadge key={t} tag={t} />)}
          </div>
        )}
        <h3 className="font-bold text-sm leading-snug" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
          {item.name}
        </h3>
        {item.description && (
          <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "var(--char-60)" }}>{item.description}</p>
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

// ─── Item Modal ───────────────────────────────────────────────────────────────

function ItemModal({ item, currency, onClose, onAdd }: {
  item: MenuItem | null; currency: string;
  onClose: () => void; onAdd: (item: MenuItem, v: SelectedVariant[], a: SelectedAddon[], qty: number) => void;
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
        {/* Item hero */}
        <div className="relative h-48 w-full shrink-0" style={{ background: swatch + "22" }}>
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl font-black"
              style={{ color: swatch, fontFamily: "Space Grotesk, sans-serif", opacity: 0.6 }}>
              {item.name[0]?.toUpperCase()}
            </div>
          )}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-md"
            style={{ background: "var(--paper)", color: "var(--char)" }}>×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Header */}
          <div>
            <h2 className="text-xl font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>{item.name}</h2>
            {item.description && <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--char-60)" }}>{item.description}</p>}
            {item.dietaryTags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">{item.dietaryTags.map(t => <DietBadge key={t} tag={t} />)}</div>
            )}
          </div>

          {/* Variants */}
          {item.variantGroups.map(grp => (
            <div key={grp.id}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>{grp.name}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={grp.isRequired ? { background: "var(--chili)", color: "#fff" } : { background: "var(--char-10)", color: "var(--char-60)" }}>
                  {grp.isRequired ? "Required" : "Optional"}
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

          {/* Addons */}
          {item.addonGroups.map(grp => (
            <div key={grp.id}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>{grp.name}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--char-10)", color: "var(--char-60)" }}>
                  Up to {grp.maxSelect}
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

          {/* Qty + CTA */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center rounded-2xl border-2 overflow-hidden" style={{ borderColor: "var(--char-20)" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-11 h-11 flex items-center justify-center text-xl font-light transition-colors"
                style={{ color: "var(--char-60)" }}>−</button>
              <span className="w-9 text-center font-black" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="w-11 h-11 flex items-center justify-center text-xl font-light transition-colors"
                style={{ color: "var(--char-60)" }}>+</button>
            </div>
            <button
              disabled={!canAdd}
              onClick={() => { onAdd(item, variants, addons, qty); onClose(); }}
              className="flex-1 py-3 rounded-2xl font-bold flex items-center justify-between px-5 transition-all text-sm"
              style={canAdd ? { background: "var(--chili)", color: "#fff" } : { background: "var(--char-10)", color: "var(--char-20)" }}>
              <span>Add to Cart</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{fmt(currency, total)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

function CartDrawer({ items, currency, tableId, codeValue, onUpdateQty, onRemove, onClear }: {
  items: CartItem[]; currency: string; tableId: string; codeValue: string;
  onUpdateQty: (id: string, qty: number) => void; onRemove: (id: string) => void; onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ id: string; items: CartItem[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.itemTotal, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  async function placeOrder() {
    setLoading(true); setErr(null);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001") + "/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId, codeValue, note: note.trim() || undefined,
          items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, selectedVariants: i.selectedVariants, selectedAddons: i.selectedAddons, note: i.note })),
        }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.message ?? "Failed"); }
      const data = await res.json();
      setSuccess({ id: data.id ?? "—", items: [...items] });
      onClear(); setNote("");
    } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  if (items.length === 0 && !success) return null;

  return (
    <>
      {/* Fixed cart bar */}
      {!open && items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4">
          <button onClick={() => setOpen(true)}
            className="w-full max-w-lg mx-auto flex items-center justify-between text-white rounded-2xl py-3.5 px-5 shadow-2xl font-bold text-sm block"
            style={{ background: "var(--char)" }}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: "var(--chili)" }}>{totalQty}</span>
            <span style={{ fontFamily: "Space Grotesk, sans-serif" }}>View Cart</span>
            <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{fmt(currency, subtotal)}</span>
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>Your Cart</h2>
                <button onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xl"
                  style={{ background: "var(--char-10)", color: "var(--char)" }}>×</button>
              </div>

              {success ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-black"
                    style={{ background: "var(--chili-10)", color: "var(--chili)", fontFamily: "Space Grotesk, sans-serif" }}>✓</div>
                  <div>
                    <h3 className="text-xl font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>Order Placed!</h3>
                    <p className="text-sm mt-1" style={{ color: "var(--char-60)" }}>
                      Order <span className="font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>#{success.id.slice(-6).toUpperCase()}</span> received
                    </p>
                  </div>
                  <div className="rounded-2xl p-4 text-left space-y-2" style={{ background: "var(--cream)" }}>
                    {success.items.map(i => (
                      <div key={i.cartId} className="flex justify-between text-sm">
                        <span style={{ color: "var(--char)" }}>{i.quantity}× {i.menuItemName}</span>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char-60)" }}>{fmt(currency, i.itemTotal)}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setSuccess(null); setOpen(false); }}
                    className="w-full py-4 rounded-2xl font-bold text-white"
                    style={{ background: "var(--chili)", fontFamily: "Space Grotesk, sans-serif" }}>Done</button>
                </div>
              ) : (
                <>
                  {/* Items */}
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.cartId} className="flex gap-3 rounded-2xl p-3" style={{ background: "var(--cream)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>{item.menuItemName}</p>
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
                          <button onClick={() => onRemove(item.cartId)} className="text-[11px] font-medium" style={{ color: "var(--chili)" }}>Remove</button>
                          <div className="flex items-center gap-1 rounded-xl overflow-hidden border" style={{ borderColor: "var(--char-20)", background: "var(--paper)" }}>
                            <button onClick={() => item.quantity > 1 ? onUpdateQty(item.cartId, item.quantity - 1) : onRemove(item.cartId)}
                              className="w-8 h-8 flex items-center justify-center text-base" style={{ color: "var(--char-60)" }}>−</button>
                            <span className="w-6 text-center text-sm font-black" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>{item.quantity}</span>
                            <button onClick={() => onUpdateQty(item.cartId, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center text-base" style={{ color: "var(--char-60)" }}>+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Note */}
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                    placeholder="Add a note for your order…"
                    className="w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none transition-colors"
                    style={{ background: "var(--cream)", border: "2px solid var(--char-10)", color: "var(--char)" }} />

                  {/* Subtotal */}
                  <div className="flex justify-between items-center py-3 border-t" style={{ borderColor: "var(--char-10)" }}>
                    <span className="font-semibold text-sm" style={{ color: "var(--char-60)" }}>Subtotal ({totalQty} items)</span>
                    <span className="font-black text-xl" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{fmt(currency, subtotal)}</span>
                  </div>

                  {err && (
                    <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--chili-10)", color: "var(--chili)", border: "1px solid var(--chili)33" }}>
                      {err}
                    </div>
                  )}

                  <button disabled={loading} onClick={placeOrder}
                    className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all"
                    style={!loading ? { background: "var(--chili)", fontFamily: "Space Grotesk, sans-serif" } : { background: "var(--char-20)", color: "var(--char-60)" }}>
                    {loading ? "Placing Order…" : `Place Order · ${fmt(currency, subtotal)}`}
                  </button>
                  <button onClick={() => { onClear(); setOpen(false); }}
                    className="w-full py-3 text-sm transition-colors" style={{ color: "var(--char-60)" }}>
                    Clear Cart
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({ category, currency, refs, onOpen }: {
  category: Category; currency: string;
  refs: React.MutableRefObject<Record<string, HTMLElement | null>>; onOpen: (i: MenuItem) => void;
}) {
  return (
    <section ref={el => { refs.current[category.id] = el; }} className="scroll-mt-28">
      <h2 className="text-base font-black mb-2" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
        {category.name}
      </h2>
      {category.menuItems.length > 0 && (
        <div>
          {category.menuItems.map(item => <ItemCard key={item.id} item={item} currency={currency} onOpen={onOpen} />)}
        </div>
      )}
      {category.children.map(child => (
        <div key={child.id} ref={el => { refs.current[child.id] = el; }} className="mt-5 scroll-mt-28">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full" style={{ background: "var(--chili)" }} />
            <h3 className="text-sm font-bold" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>{child.name}</h3>
          </div>
          <div>
            {child.menuItems.map(item => <ItemCard key={item.id} item={item} currency={currency} onOpen={onOpen} />)}
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MenuView({ data, codeValue }: { data: MenuResponse; codeValue: string }) {
  const { restaurant, table, menu } = data;
  const currency = restaurant.defaultCurrency;

  const [activeId, setActiveId] = useState(menu[0]?.id ?? "");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const cats = allCats(menu);

  function gotoCategory(id: string) {
    setActiveId(id);
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    navRef.current?.querySelector<HTMLElement>(`[data-cat="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  const addToCart = useCallback((item: MenuItem, variants: SelectedVariant[], addons: SelectedAddon[], qty: number) => {
    const itemTotal = calcTotal(parseFloat(item.basePrice), variants, addons, qty);
    setCart(prev => [...prev, { cartId: `${item.id}-${Date.now()}`, menuItemId: item.id, menuItemName: item.name, basePrice: parseFloat(item.basePrice), quantity: qty, selectedVariants: variants, selectedAddons: addons, itemTotal }]);
  }, []);

  const updateQty = useCallback((cartId: string, qty: number) => {
    setCart(prev => prev.map(i => i.cartId === cartId ? { ...i, quantity: qty, itemTotal: calcTotal(i.basePrice, i.selectedVariants, i.selectedAddons, qty) } : i));
  }, []);

  const removeItem = useCallback((cartId: string) => setCart(prev => prev.filter(i => i.cartId !== cartId)), []);
  const clearCart = useCallback(() => setCart([]), []);

  return (
    <main className="min-h-screen pb-36" style={{ background: "var(--paper)" }}>
      {/* Hero */}
      <div className="relative">
        {restaurant.coverImageUrl ? (
          <div className="relative h-44 w-full">
            <Image src={restaurant.coverImageUrl} alt={restaurant.displayName} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70" />
          </div>
        ) : (
          <div className="h-28" style={{ background: `linear-gradient(135deg, var(--chili) 0%, var(--mango) 100%)`, opacity: 0.15 }} />
        )}

        {/* Restaurant + table card */}
        <div className="px-4 -mt-6 relative z-10">
          <div className="rounded-3xl shadow-xl p-4" style={{ background: "var(--paper)" }}>
            <div className="flex items-center gap-3">
              {restaurant.logoUrl ? (
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border" style={{ borderColor: "var(--char-10)" }}>
                  <Image src={restaurant.logoUrl} alt={restaurant.displayName} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-black text-white"
                  style={{ background: "var(--chili)", fontFamily: "Space Grotesk, sans-serif" }}>
                  {restaurant.displayName[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="font-black text-base leading-tight truncate" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
                  {restaurant.displayName}
                </h1>
                {restaurant.description && (
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--char-60)" }}>{restaurant.description}</p>
                )}
              </div>
              {/* Table stamp */}
              <div className="shrink-0 w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center"
                style={{ borderColor: "var(--char-20)", transform: "rotate(-8deg)" }}>
                <div className="text-center">
                  <div className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "var(--char-60)" }}>TABLE</div>
                  <div className="text-lg font-black leading-none" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{table.label}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Nav */}
      <div ref={navRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 sticky top-0 z-30 border-b mt-3"
        style={{ background: "var(--paper)f0", backdropFilter: "blur(8px)", borderColor: "var(--char-10)" }}>
        {cats.map(cat => {
          const active = activeId === cat.id;
          return (
            <button key={cat.id} data-cat={cat.id} onClick={() => gotoCategory(cat.id)}
              className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all shrink-0"
              style={active ? { background: "var(--char)", color: "var(--cream)" } : { background: "var(--char-10)", color: "var(--char-60)" }}>
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Menu */}
      <div className="px-4 pt-4 space-y-6">
        {menu.map(cat => (
          <CategorySection key={cat.id} category={cat} currency={currency} refs={refs} onOpen={setSelectedItem} />
        ))}
      </div>

      <ItemModal item={selectedItem} currency={currency} onClose={() => setSelectedItem(null)} onAdd={addToCart} />
      <CartDrawer items={cart} currency={currency} tableId={table.id} codeValue={codeValue} onUpdateQty={updateQty} onRemove={removeItem} onClear={clearCart} />
    </main>
  );
}
