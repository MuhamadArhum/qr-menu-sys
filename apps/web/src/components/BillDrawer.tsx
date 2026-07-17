"use client";

import { useState } from "react";
import type { BillItem } from "@/lib/bill";
import { calcBillTotals } from "@/lib/bill";

interface TaxRate { label: string; rate: number }

interface Props {
  items: BillItem[];
  currency: string;
  taxRates: TaxRate[];
  serviceCharge: number;
  serviceChargeEnabled: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function BillDrawer({
  items,
  currency,
  taxRates,
  serviceCharge,
  serviceChargeEnabled,
  onRemove,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);

  const { subtotal, taxes, taxTotal, serviceCharge: scAmount, total } = calcBillTotals(
    items,
    taxRates,
    serviceCharge,
    serviceChargeEnabled,
  );

  const count = items.reduce((s, i) => s + i.quantity, 0);

  if (items.length === 0) return null;

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
        <button
          onClick={() => setOpen(true)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-4 px-5 flex items-center justify-between shadow-2xl shadow-orange-500/30 transition-all"
        >
          <span className="bg-orange-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            {count}
          </span>
          <span className="font-semibold">View estimated bill</span>
          <span className="font-bold">{currency} {total.toFixed(2)}</span>
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] bg-zinc-900 rounded-t-2xl overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Estimated Bill</h2>
                <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white text-2xl leading-none">×</button>
              </div>

              {/* Line items */}
              <div className="space-y-3 mb-5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 bg-zinc-800 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-100">{item.name}</div>
                      {item.selectedVariants.map((v) => (
                        <div key={v.optionId} className="text-xs text-zinc-400">{v.groupName}: {v.optionName}</div>
                      ))}
                      {item.selectedAddons.map((a) => (
                        <div key={a.optionId} className="text-xs text-zinc-400">+ {a.optionName}</div>
                      ))}
                      <div className="text-orange-400 text-sm font-medium mt-1">
                        {currency} {item.unitPrice.toFixed(2)} × {item.quantity}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-zinc-100">{currency} {item.lineTotal.toFixed(2)}</div>
                      <button
                        onClick={() => onRemove(item.id)}
                        className="text-xs text-red-400 hover:text-red-300 mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-zinc-800 pt-4 space-y-2">
                <div className="flex justify-between text-zinc-300">
                  <span>Subtotal</span>
                  <span>{currency} {subtotal.toFixed(2)}</span>
                </div>
                {taxes.map((t) => (
                  <div key={t.label} className="flex justify-between text-zinc-400 text-sm">
                    <span>{t.label}</span>
                    <span>{currency} {t.amount.toFixed(2)}</span>
                  </div>
                ))}
                {serviceChargeEnabled && scAmount > 0 && (
                  <div className="flex justify-between text-zinc-400 text-sm">
                    <span>Service charge</span>
                    <span>{currency} {scAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-zinc-100 border-t border-zinc-700 pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-orange-400">{currency} {total.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-500 text-center mt-3">
                This is an estimated bill. Final amount may vary.
              </p>

              <button
                onClick={() => { onClear(); setOpen(false); }}
                className="w-full mt-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-sm transition-all"
              >
                Clear bill
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
