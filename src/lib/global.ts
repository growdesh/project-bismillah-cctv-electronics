import { BUSINESS } from "./config";

export type DemoMode = "retail-pos";

export interface DemoModeMeta {
  id: DemoMode;
  labelBn: string;
  brandTitle: string;
  routePath: string;
  landingSlug: string;
  businessTypeBn: string;
}

export const DEMO_MODES: readonly DemoModeMeta[] = [
  {
    id: "retail-pos",
    labelBn: "রিটেইল POS",
    brandTitle: BUSINESS.shortBrand,
    routePath: "/",
    landingSlug: "retail-pos",
    businessTypeBn: "সিসিটিভি ও ইলেকট্রনিক্স রিটেইল POS",
  },
] as const;

export const GLOBAL_POLICY = {
  currencyCode: "BDT",
  currencySymbol: "৳",
  locale: "bn-BD",
} as const;

export function getDemoModeMeta(_mode?: DemoMode): DemoModeMeta {
  return DEMO_MODES[0];
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const BN_TO_EN: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

export function toBn(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function toEnDigits(value: string | number): string {
  return String(value).replace(/[০-৯]/g, (d) => BN_TO_EN[d] ?? d);
}

export function parseAmountInput(value: string | number): number {
  const normalized = toEnDigits(value).replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatGrouped(value: number, maxDecimals: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatNumberBn(n: number | null | undefined, opts?: { decimals?: boolean }): string {
  const safe = Number.isFinite(Number(n)) ? Number(n) : 0;
  return toBn(formatGrouped(safe, opts?.decimals ? 2 : 0));
}

export function formatMoneyBn(amount: number | null | undefined, opts?: { decimals?: boolean }): string {
  return `${GLOBAL_POLICY.currencySymbol} ${formatNumberBn(amount, opts)}`;
}

const MONTHS_BN = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

export function formatDateBn(iso: string, withTime = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const base = `${toBn(date.getDate())} ${MONTHS_BN[date.getMonth()]}`;
  if (!withTime) return base;
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mins = String(date.getMinutes()).padStart(2, "0");
  return `${base} • ${hours12}:${mins} ${hours24 < 12 ? "am" : "pm"}`;
}

export function getGreetingBn(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "শুভ সকাল";
  if (hour >= 12 && hour < 16) return "শুভ দুপুর";
  if (hour >= 16 && hour < 18) return "শুভ বিকেল";
  if (hour >= 18 && hour < 21) return "শুভ সন্ধ্যা";
  return "শুভ রাত্রি";
}

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private-mode errors.
  }
}

export function removeStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage removal errors.
  }
}
