export interface PricedCartItemInput {
  productId: string;
  name: string;
  unit: string;
  rate: number;
  qty: number;
  unitDiscount: number;
}

export type GlobalDiscountMode = "per_unit" | "flat";

export interface PricedCartLine extends PricedCartItemInput {
  grossTotal: number;
  appliedUnitDiscount: number;
  effectiveUnitRate: number;
  lineDiscountTotal: number;
  netTotal: number;
}

export interface CartPricingSummary {
  lines: PricedCartLine[];
  totalQty: number;
  grossSubtotal: number;
  itemDiscountTotal: number;
  globalDiscountTotal: number;
  totalDiscount: number;
  grandTotal: number;
}

/**
 * Calculates POS cart totals supporting:
 * 1. Per-item unit discount (subtracted from each unit of that item):
 *    Example: rate = 50, qty = 3, unitDiscount = 10 -> (50 - 10) * 3 = 120.
 * 2. Global discount in either:
 *    - "per_unit" mode: subtracts `globalDiscountValue` from every unit across all items
 *      (stacks cleanly with any per-item unitDiscount, clamped so unit price never goes below 0).
 *      Example: rate = 50, qty = 3, global per_unit discount = 10 -> 150 - 30 = 120.
 *    - "flat" mode: subtracts a flat amount once from the cart subtotal after item discounts.
 */
export function calculateCartPricing(
  items: readonly PricedCartItemInput[],
  globalDiscountValue: number,
  globalDiscountMode: GlobalDiscountMode,
): CartPricingSummary {
  const safeGlobal = Math.max(0, Number.isFinite(globalDiscountValue) ? globalDiscountValue : 0);

  let totalQty = 0;
  let grossSubtotal = 0;
  let itemDiscountTotal = 0;
  let globalPerUnitDiscountTotal = 0;
  let netAfterItemAndPerUnitGlobal = 0;

  const lines: PricedCartLine[] = items.map((item) => {
    const qty = Math.max(0, Math.round(item.qty));
    const rate = Math.max(0, item.rate);
    const grossTotal = Math.round(qty * rate);

    const safeItemUnitDiscount = Math.max(
      0,
      Math.min(rate, Number.isFinite(item.unitDiscount) ? item.unitDiscount : 0),
    );
    const rateAfterItemDiscount = Math.max(0, rate - safeItemUnitDiscount);

    const extraGlobalUnitDiscount =
      globalDiscountMode === "per_unit"
        ? Math.max(0, Math.min(rateAfterItemDiscount, safeGlobal))
        : 0;

    const appliedUnitDiscount = safeItemUnitDiscount + extraGlobalUnitDiscount;
    const effectiveUnitRate = Math.max(0, rate - appliedUnitDiscount);
    const netTotal = Math.round(qty * effectiveUnitRate);
    const lineDiscountTotal = Math.max(0, grossTotal - netTotal);

    totalQty += qty;
    grossSubtotal += grossTotal;
    itemDiscountTotal += Math.round(qty * safeItemUnitDiscount);
    globalPerUnitDiscountTotal += Math.round(qty * extraGlobalUnitDiscount);
    netAfterItemAndPerUnitGlobal += netTotal;

    return {
      ...item,
      qty,
      rate,
      grossTotal,
      appliedUnitDiscount,
      effectiveUnitRate,
      lineDiscountTotal,
      netTotal,
    };
  });

  const flatGlobalDiscount =
    globalDiscountMode === "flat"
      ? Math.max(0, Math.min(netAfterItemAndPerUnitGlobal, Math.round(safeGlobal)))
      : 0;

  const globalDiscountTotal =
    globalDiscountMode === "per_unit" ? globalPerUnitDiscountTotal : flatGlobalDiscount;

  const grandTotal = Math.max(0, netAfterItemAndPerUnitGlobal - flatGlobalDiscount);
  const totalDiscount = Math.max(0, grossSubtotal - grandTotal);

  return {
    lines,
    totalQty,
    grossSubtotal,
    itemDiscountTotal,
    globalDiscountTotal,
    totalDiscount,
    grandTotal,
  };
}

export function filterCartLines<T extends { name: string; unit?: string }>(
  lines: readonly T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...lines];
  return lines.filter(
    (line) =>
      line.name.toLowerCase().includes(q) ||
      (line.unit ? line.unit.toLowerCase().includes(q) : false),
  );
}
