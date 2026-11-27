import { formatDateBn } from "../../lib/global";
import type { DemoAccount, DemoInvoice } from "./demoTypes";

export function daysAgoIso(daysAgo: number, hour = 11, minute = 20): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function makeInvoice(
  id: string,
  number: string,
  daysAgo: number,
  hour: number,
  minute: number,
  partyName: string,
  partyMobile: string,
  items: { productId: string; name: string; unit: string; qty: number; rate: number }[],
  paid: number,
  method: string,
): DemoInvoice {
  const date = daysAgoIso(daysAgo, hour, minute);
  const mapped = items.map((item) => ({ ...item, total: item.qty * item.rate }));
  const total = mapped.reduce((sum, item) => sum + item.total, 0);
  const clampedPaid = Math.min(total, Math.max(0, paid));
  const due = Math.max(0, total - clampedPaid);
  const status: DemoInvoice["status"] =
    due === 0 ? "paid" : clampedPaid > 0 ? "partial" : "due";

  return {
    id,
    number,
    date,
    timeLabel: formatDateBn(date, true),
    partyName,
    partyMobile,
    itemsCount: mapped.reduce((sum, i) => sum + i.qty, 0),
    total,
    paid: clampedPaid,
    due,
    method,
    status,
    items: mapped,
  };
}

export function baseAccounts(cash: number, bank: number, bkash: number, nagad: number): DemoAccount[] {
  return [
    { id: "acc-cash", name: "হাতে নগদ", type: "cash", balance: cash },
    { id: "acc-bank", name: "ব্যাংক (ডাচ-বাংলা)", type: "bank", balance: bank },
    { id: "acc-bkash", name: "bKash মার্চেন্ট", type: "bkash", balance: bkash },
    { id: "acc-nagad", name: "Nagad মার্চেন্ট", type: "nagad", balance: nagad },
  ];
}
