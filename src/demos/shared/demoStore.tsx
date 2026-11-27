import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getAuthHeaders, loadAuthSession, normalizePasswordInput, normalizePhoneInput } from "../../lib/auth";
import { BUSINESS } from "../../lib/config";
import {
  formatDateBn,
  readStorage,
  removeStorage,
  writeStorage,
  type DemoMode,
} from "../../lib/global";
import { navigate } from "../../lib/router";
import type {
  DemoCapabilities,
  DemoHandover,
  DemoInvoice,
  DemoLedgerEntry,
  DemoOrder,
  DemoOrderStatus,
  DemoOrg,
  DemoRole,
  DemoStaff,
  DemoState,
  DemoStoreValue,
  DemoTradeInput,
  PosAuthUser,
  PosEmployee,
  PosNotification,
  PosSalaryPayment,
  PosServiceJob,
  ServiceJobStatus,
} from "./demoTypes";

const DemoContext = createContext<DemoStoreValue | null>(null);

const ORDER_PIPELINE: readonly DemoOrderStatus[] = [
  "submitted",
  "unassigned",
  "ready",
  "in_transit",
  "delivered",
  "collection_due",
  "completed",
];

const SUPABASE_URL = (
  import.meta.env?.VITE_SUPABASE_URL || "https://ltpkaonghjlijissazkz.supabase.co"
).replace(/\/+$/, "");

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_uZE9zBUNkeZazJxsBPOzog_peWypFH_";

async function callPosApi<T extends Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown>,
): Promise<T | null> {
  if (typeof fetch !== "function" || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/pos-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const text = await res.text();
    if (!text) return null;
    const data = JSON.parse(text) as T;
    return res.ok || typeof data?.ok === "boolean" ? data : null;
  } catch {
    return null;
  }
}

async function fetchExpressJson<T extends Record<string, unknown>>(
  url: string,
  init: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    if (res.status === 404) return null;
    const data = (await res.json()) as T;
    return data;
  } catch {
    return null;
  }
}

function getSessionToken(): string | null {
  const memToken = loadAuthSession()?.token;
  if (memToken) return memToken;
  const auth = getAuthHeaders().Authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

function legacyStorageKeyFor(mode: DemoMode): string {
  return `bismillah-pos-v1:${mode}`;
}

function storageKeyFor(mode: DemoMode, userKey: string): string {
  return `bismillah-pos-v2:${mode}:${userKey}`;
}

function normalizeRemoteState(raw: Partial<DemoState> | null | undefined, seed: DemoState): DemoState {
  if (!raw || typeof raw !== "object") return seed;
  const derivedCategories = Array.from(
    new Set([
      ...(Array.isArray(raw.categories) ? raw.categories : seed.categories),
      ...(Array.isArray(raw.products) ? raw.products : seed.products)
        .map((p) => p.category)
        .filter(Boolean),
    ]),
  );
  const rawEmployees = Array.isArray(raw.employees) ? raw.employees : seed.employees;
  const rawJobs = Array.isArray(raw.serviceJobs) ? raw.serviceJobs : [];
  return {
    ...seed,
    ...raw,
    orgs: Array.isArray(raw.orgs) && raw.orgs.length > 0 ? raw.orgs : seed.orgs,
    categories: derivedCategories,
    products: Array.isArray(raw.products) ? raw.products : seed.products,
    customers: Array.isArray(raw.customers) ? raw.customers : [],
    suppliers: Array.isArray(raw.suppliers) ? raw.suppliers : [],
    invoices: Array.isArray(raw.invoices) ? raw.invoices : [],
    purchases: Array.isArray(raw.purchases) ? raw.purchases : [],
    ledger: Array.isArray(raw.ledger) ? raw.ledger : [],
    accounts: Array.isArray(raw.accounts) && raw.accounts.length > 0 ? raw.accounts : seed.accounts,
    orders: Array.isArray(raw.orders) ? raw.orders : [],
    staff: Array.isArray(raw.staff) ? raw.staff : [],
    employees: rawEmployees,
    salaryPayments: Array.isArray(raw.salaryPayments) ? raw.salaryPayments : [],
    serviceJobs: rawJobs.map((j, idx) => hydrateServiceJob(j, idx)),
    notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
    routes: Array.isArray(raw.routes) ? raw.routes : [],
    returns: Array.isArray(raw.returns) ? raw.returns : [],
    companies: Array.isArray(raw.companies) && raw.companies.length > 0 ? raw.companies : seed.companies,
    settings: raw.settings ? { ...seed.settings, ...raw.settings } : seed.settings,
    visitedCustomerIds: raw.visitedCustomerIds ?? [],
    handovers: raw.handovers ?? [],
  };
}

function hydrateServiceJob(raw: Partial<PosServiceJob>, idx: number): PosServiceJob {
  const charge = Math.max(0, Number(raw.serviceCharge) || 0);
  const paid = Math.max(0, Math.min(charge, Number(raw.paidCharge) || 0));
  const due = Math.max(0, charge - paid);
  const paymentStatus: "paid" | "partial" | "due" =
    raw.paymentStatus || (charge > 0 && due === 0 ? "paid" : paid > 0 ? "partial" : "due");
  const createdIso = raw.createdAt || new Date().toISOString();
  const d = new Date(createdIso);
  const fallbackDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fallbackTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  return {
    id: raw.id || `srv-${idx + 1}`,
    jobNo: raw.jobNo || `SRV-${String(idx + 101).padStart(3, "0")}`,
    title: raw.title || raw.deviceName || "সার্ভিসিং কাজ",
    deviceName: raw.deviceName || raw.title || "সিসিটিভি ডিভাইস",
    problemDescription: raw.problemDescription || raw.description || "সার্ভিসিং ও মেরামত প্রয়োজন",
    description: raw.description || "",
    customerName: raw.customerName || "সাধারণ কাস্টমার",
    customerMobile: raw.customerMobile || "—",
    location: raw.location || "সিলেট",
    entryDate: raw.entryDate || fallbackDate,
    entryTime: raw.entryTime || fallbackTime,
    expectedDeliveryDate: raw.expectedDeliveryDate,
    staffIds: Array.isArray(raw.staffIds) ? raw.staffIds : [],
    staffNames: Array.isArray(raw.staffNames) ? raw.staffNames : [],
    status: (raw.status as ServiceJobStatus) || "pending",
    paymentStatus,
    serviceCharge: charge,
    paidCharge: paid,
    dueCharge: due,
    paymentMethod: raw.paymentMethod,
    accountId: raw.accountId,
    createdAt: createdIso,
    completedAt: raw.completedAt,
    linkedInvoiceIds: Array.isArray(raw.linkedInvoiceIds) ? raw.linkedInvoiceIds : [],
  };
}

function loadDemoState(mode: DemoMode, createState: () => DemoState, userKey: string): DemoState {
  // Purge legacy v1 pre-clean-start dummy transactions so they never silently re-populate
  removeStorage(legacyStorageKeyFor(mode));
  const seed = createState();
  const token = getSessionToken();
  // When a live remote session is active, always start from clean seed until remote authoritative state resolves
  if (token && !token.startsWith("local-")) {
    return seed;
  }
  const saved = readStorage<DemoState | null>(storageKeyFor(mode, userKey), null);
  if (
    saved &&
    saved.mode === mode &&
    Array.isArray(saved.orgs) &&
    saved.orgs.length > 0 &&
    Array.isArray(saved.products) &&
    Array.isArray(saved.invoices) &&
    Array.isArray(saved.accounts)
  ) {
    return normalizeRemoteState(saved, seed);
  }
  return seed;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function buildDemoRouteHref(
  basePath: string,
  subRoute: string,
  _mode: DemoMode,
  _role: DemoRole,
  _staffId?: string,
): string {
  const cleanBase = basePath.replace(/\/+$/, "");
  const cleanSub = subRoute.startsWith("/") ? subRoute : `/${subRoute}`;
  return cleanSub === "/" ? cleanBase || "/" : `${cleanBase}${cleanSub}`;
}

function resolveAccountId(state: DemoState, preferredId?: string, method?: string): string {
  if (preferredId && state.accounts.some((a) => a.id === preferredId)) {
    return preferredId;
  }
  const normalized = (method || "").toLowerCase();
  const byType = state.accounts.find((a) => {
    if (normalized.includes("bkash")) return a.type === "bkash";
    if (normalized.includes("nagad")) return a.type === "nagad";
    if (normalized.includes("bank") || normalized.includes("ব্যাংক")) return a.type === "bank";
    return a.type === "cash";
  });
  return byType?.id ?? state.accounts[0]?.id ?? "acc-cash";
}

function buildInvoiceRecord(
  prefix: string,
  count: number,
  input: DemoTradeInput,
): DemoInvoice {
  const nowIso = new Date().toISOString();
  const mappedItems = input.items.map((item) => ({
    ...item,
    total: Math.round(item.qty * item.rate),
  }));
  const partsSubtotal = mappedItems.reduce((sum, item) => sum + item.total, 0);
  const serviceCharge = Math.max(0, Math.round(input.serviceCharge ?? 0));
  const subTotal = partsSubtotal + serviceCharge;
  const discount = Math.max(0, Math.min(subTotal, input.discount ?? 0));
  const total = Math.max(0, subTotal - discount);
  const paid = Math.max(0, Math.min(total, input.paid));
  const due = Math.max(0, total - paid);
  const status: DemoInvoice["status"] =
    due === 0 ? "paid" : paid > 0 ? "partial" : "due";
  const seq = String(count + 110).padStart(4, "0");

  return {
    id: makeId("inv"),
    number: `${prefix}-2611-${seq}`,
    date: nowIso,
    timeLabel: formatDateBn(nowIso, true),
    partyName: input.partyName.trim() || "নগদ কাস্টমার",
    partyMobile: input.partyMobile?.trim() || "—",
    itemsCount: mappedItems.reduce((sum, item) => sum + item.qty, 0),
    total,
    paid,
    due,
    method: input.method || "cash",
    status,
    items: mappedItems,
    serviceJobId: input.serviceJobId,
    serviceJobNo: input.serviceJobNo,
    serviceCharge: serviceCharge > 0 ? serviceCharge : undefined,
    partsSubtotal,
    discount: discount > 0 ? discount : undefined,
  };
}

export interface DemoProviderProps {
  mode: DemoMode;
  role?: DemoRole;
  currentUser?: PosAuthUser;
  staffId?: string;
  basePath: string;
  subPath: string;
  createState: () => DemoState;
  getCapabilities: (org: DemoOrg) => DemoCapabilities;
  onOpenRoleModal?: () => void;
  onLogout?: () => void;
  children: ReactNode;
}

const DEFAULT_ADMIN_USER: PosAuthUser = {
  id: "usr-admin",
  name: BUSINESS.ownerBn,
  phone: BUSINESS.phone,
  role: "admin",
};

export function DemoProvider({
  mode,
  role = "admin",
  currentUser = DEFAULT_ADMIN_USER,
  staffId,
  basePath,
  subPath,
  createState,
  getCapabilities,
  onOpenRoleModal,
  onLogout,
  children,
}: DemoProviderProps) {
  const userKey = currentUser.role === "admin" ? "admin" : currentUser.id;
  const [state, setState] = useState<DemoState>(() => loadDemoState(mode, createState, userKey));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const remoteLoadedRef = useRef<boolean>(false);
  const suppressNextSyncRef = useRef<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    remoteLoadedRef.current = false;
    suppressNextSyncRef.current = true;
    const initial = loadDemoState(mode, createState, userKey);
    setState(initial);

    const token = getSessionToken();
    if (!token || token.startsWith("local-")) {
      remoteLoadedRef.current = true;
      suppressNextSyncRef.current = false;
      return;
    }

    (async () => {
      const seed = createState();
      const expressRes = await fetchExpressJson<{ ok?: boolean; state?: Partial<DemoState> }>(
        "/api/state",
        { headers: getAuthHeaders() },
      );
      if (cancelled) return;

      if (expressRes?.ok && expressRes.state) {
        suppressNextSyncRef.current = true;
        remoteLoadedRef.current = true;
        setState(normalizeRemoteState(expressRes.state, seed));
        return;
      }

      const rpcRes = await callPosApi<{ ok?: boolean; state?: Partial<DemoState> }>(
        "get-state",
        { token },
      );
      if (cancelled) return;

      if (rpcRes?.ok && rpcRes.state) {
        suppressNextSyncRef.current = true;
        remoteLoadedRef.current = true;
        setState(normalizeRemoteState(rpcRes.state, seed));
        return;
      }

      remoteLoadedRef.current = true;
      suppressNextSyncRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, createState, userKey]);

  useEffect(() => {
    if (!remoteLoadedRef.current) return;
    writeStorage(storageKeyFor(mode, userKey), state);
    if (suppressNextSyncRef.current) {
      suppressNextSyncRef.current = false;
      return;
    }

    const token = getSessionToken();
    if (!token || token.startsWith("local-")) return;

    (async () => {
      const expressRes = await fetchExpressJson<{ ok?: boolean }>("/api/state/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ state }),
      });
      if (expressRes !== null) return;
      await callPosApi("sync-state", {
        token,
        state,
      });
    })();
  }, [mode, userKey, state]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3200);
  }, []);

  const activeOrg = useMemo(
    () => state.orgs.find((org) => org.id === state.activeOrgId) ?? state.orgs[0],
    [state.orgs, state.activeOrgId],
  );

  const activeRole: DemoRole = role;
  const activeStaff = null as DemoStaff | null;

  const capabilities = useMemo(() => getCapabilities(activeOrg), [getCapabilities, activeOrg]);

  // Strict Record-Level Privacy for Servicing Records
  const visibleServiceJobs = useMemo(() => {
    if (currentUser.role === "admin") {
      return state.serviceJobs;
    }
    const myStaffId = currentUser.staffId || currentUser.id;
    const myPhone = normalizePhoneInput(currentUser.phone);
    return state.serviceJobs.filter((job) => {
      if (job.staffIds.includes(myStaffId)) return true;
      // Also match by employee phone if IDs differ across sessions
      const assignedEmps = state.employees.filter((e) => job.staffIds.includes(e.id));
      return assignedEmps.some((e) => normalizePhoneInput(e.phone) === myPhone);
    });
  }, [state.serviceJobs, state.employees, currentUser]);

  // Strict Notification Visibility (only Admin and Assigned Staff)
  const visibleNotifications = useMemo(() => {
    if (currentUser.role === "admin") {
      return state.notifications;
    }
    const myStaffId = currentUser.staffId || currentUser.id;
    const myPhone = normalizePhoneInput(currentUser.phone);
    return state.notifications.filter((ntf) => {
      if (ntf.assignedStaffIds.includes(myStaffId)) return true;
      const assignedEmps = state.employees.filter((e) => ntf.assignedStaffIds.includes(e.id));
      return assignedEmps.some((e) => normalizePhoneInput(e.phone) === myPhone);
    });
  }, [state.notifications, state.employees, currentUser]);

  const unreadNotificationsCount = useMemo(
    () =>
      visibleNotifications.filter(
        (ntf) => !ntf.readByUserIds.includes(currentUser.id),
      ).length,
    [visibleNotifications, currentUser.id],
  );

  const go = useCallback(
    (subRoute: string) => {
      const target = buildDemoRouteHref(basePath, subRoute, mode, activeRole, staffId);
      navigate(target);
    },
    [basePath, mode, activeRole, staffId],
  );

  const openRoleModal = useCallback(() => {
    onOpenRoleModal?.();
  }, [onOpenRoleModal]);

  const setOrgId = useCallback(
    (orgId: string) => {
      setState((prev) => {
        if (!prev.orgs.some((o) => o.id === orgId)) return prev;
        return { ...prev, activeOrgId: orgId };
      });
      toast("প্রতিষ্ঠান পরিবর্তন হয়েছে");
    },
    [toast],
  );

  const addSale = useCallback(
    (input: DemoTradeInput): DemoInvoice => {
      const invoice = buildInvoiceRecord(
        state.settings.invoicePrefix || "INV",
        state.invoices.length,
        input,
      );
      setState((prev) => {
        const qtyByProduct = new Map<string, number>();
        for (const item of input.items) {
          qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.qty);
        }

        const products = prev.products.map((p) => {
          const soldQty = qtyByProduct.get(p.id) ?? 0;
          if (!soldQty) return p;
          if (prev.settings.allowNegativeStock) {
            return { ...p, paidStock: p.paidStock - soldQty };
          }
          const nextPaid = Math.max(0, p.paidStock - soldQty);
          const leftover = Math.max(0, soldQty - p.paidStock);
          const nextFree = Math.max(0, p.freeStock - leftover);
          return { ...p, paidStock: nextPaid, freeStock: nextFree };
        });

        const customers = prev.customers.map((c) => {
          if (c.name !== invoice.partyName) return c;
          return { ...c, due: c.due + invoice.due };
        });

        const accountId = resolveAccountId(prev, input.accountId, invoice.method);
        const accounts = prev.accounts.map((acc) =>
          acc.id === accountId ? { ...acc, balance: acc.balance + invoice.paid } : acc,
        );

        const ledger =
          invoice.paid > 0
            ? [
                {
                  id: makeId("ldg"),
                  party: invoice.partyName,
                  date: invoice.date,
                  amount: invoice.paid,
                  direction: "in" as const,
                  kind: "sale" as const,
                  note: invoice.serviceJobNo
                    ? `${invoice.number} (${invoice.serviceJobNo})`
                    : invoice.number,
                },
                ...prev.ledger,
              ]
            : prev.ledger;

        // If this sale was for a serviceJob and included a serviceCharge, update the serviceJob charge/payment too
        const serviceJobs = input.serviceJobId
          ? prev.serviceJobs.map((job) => {
              if (job.id !== input.serviceJobId) return job;
              const nextCharge =
                input.serviceCharge !== undefined && input.serviceCharge > 0
                  ? Math.round(input.serviceCharge)
                  : job.serviceCharge;
              const nextPaid =
                input.serviceCharge !== undefined && input.serviceCharge > 0
                  ? Math.min(nextCharge, invoice.paid)
                  : job.paidCharge;
              const nextDue = Math.max(0, nextCharge - nextPaid);
              const nextPayStatus: "paid" | "partial" | "due" =
                nextCharge > 0 && nextDue === 0
                  ? "paid"
                  : nextPaid > 0
                    ? "partial"
                    : "due";
              return {
                ...job,
                serviceCharge: nextCharge,
                paidCharge: nextPaid,
                dueCharge: nextDue,
                paymentStatus: nextPayStatus,
                linkedInvoiceIds: job.linkedInvoiceIds.includes(invoice.id)
                  ? job.linkedInvoiceIds
                  : [invoice.id, ...job.linkedInvoiceIds],
              };
            })
          : prev.serviceJobs;

        return {
          ...prev,
          products,
          customers,
          accounts,
          ledger,
          serviceJobs,
          invoices: [invoice, ...prev.invoices],
        };
      });
      toast(`বিক্রয় সম্পন্ন হয়েছে (${invoice.number})`);
      return invoice;
    },
    [state.invoices.length, state.settings.invoicePrefix, toast],
  );

  const addPurchase = useCallback(
    (input: DemoTradeInput): DemoInvoice => {
      const invoice = buildInvoiceRecord("PUR", state.purchases.length, input);
      setState((prev) => {
        const qtyByProduct = new Map<string, number>();
        for (const item of input.items) {
          qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.qty);
        }

        const products = prev.products.map((p) => {
          const boughtQty = qtyByProduct.get(p.id) ?? 0;
          return boughtQty ? { ...p, paidStock: p.paidStock + boughtQty } : p;
        });

        const suppliers = prev.suppliers.map((s) => {
          if (s.name !== invoice.partyName) return s;
          return {
            ...s,
            due: s.due + invoice.due,
            lastTxn: formatDateBn(invoice.date),
          };
        });

        const accountId = resolveAccountId(prev, input.accountId, invoice.method);
        const accounts = prev.accounts.map((acc) =>
          acc.id === accountId
            ? { ...acc, balance: Math.max(0, acc.balance - invoice.paid) }
            : acc,
        );

        const ledger =
          invoice.paid > 0
            ? [
                {
                  id: makeId("ldg"),
                  party: invoice.partyName,
                  date: invoice.date,
                  amount: invoice.paid,
                  direction: "out" as const,
                  kind: "payment" as const,
                  note: invoice.number,
                },
                ...prev.ledger,
              ]
            : prev.ledger;

        return {
          ...prev,
          products,
          suppliers,
          accounts,
          ledger,
          purchases: [invoice, ...prev.purchases],
        };
      });
      toast(`ক্রয় সম্পন্ন হয়েছে (${invoice.number})`);
      return invoice;
    },
    [state.purchases.length, toast],
  );

  const addCustomer = useCallback<DemoStoreValue["addCustomer"]>(
    (input) => {
      const customer = {
        id: makeId("cust"),
        name: input.name.trim(),
        mobile: input.mobile.trim(),
        area: input.area?.trim() || "ঢাকা",
        due: Math.max(0, input.due ?? 0),
      };
      setState((prev) => ({
        ...prev,
        customers: [customer, ...prev.customers],
      }));
      toast(`নতুন কাস্টমার যোগ হয়েছে: ${customer.name}`);
      return customer;
    },
    [toast],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        customers: prev.customers.filter((c) => c.id !== id),
      }));
      toast("কাস্টমার তালিকা থেকে সরানো হয়েছে");
    },
    [toast],
  );

  const addProduct = useCallback<DemoStoreValue["addProduct"]>(
    (input) => {
      const num = String(state.products.length + 101);
      const product = {
        id: makeId("prd"),
        name: input.name.trim(),
        sku: input.sku?.trim() || `BCE-${num}`,
        barcode: input.barcode?.trim() || `894220010${num}`,
        category: input.category.trim() || "সাধারণ",
        company: input.company?.trim() || activeOrg.name,
        unit: input.unit.trim() || "পিস",
        purchaseRate: Math.max(0, input.purchaseRate),
        saleRate: Math.max(0, input.saleRate),
        paidStock: Math.max(0, input.paidStock),
        freeStock: Math.max(0, input.freeStock ?? 0),
        minStock: Math.max(0, input.minStock ?? 10),
      };
      setState((prev) => ({
        ...prev,
        categories: prev.categories.includes(product.category)
          ? prev.categories
          : [...prev.categories, product.category],
        products: [product, ...prev.products],
      }));
      toast(`নতুন পণ্য যোগ হয়েছে: ${product.name}`);
      return product;
    },
    [activeOrg.name, state.products.length, toast],
  );

  const addCategory = useCallback<DemoStoreValue["addCategory"]>(
    (name) => {
      const clean = name.trim();
      if (!clean) return null;
      let added = false;
      setState((prev) => {
        if (prev.categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
          return prev;
        }
        added = true;
        return {
          ...prev,
          categories: [...prev.categories, clean],
        };
      });
      toast(added ? `নতুন ক্যাটাগরি যোগ হয়েছে: ${clean}` : `ক্যাটাগরিটি আগে থেকেই আছে: ${clean}`);
      return clean;
    },
    [toast],
  );

  const renameCategory = useCallback<DemoStoreValue["renameCategory"]>(
    (oldName, newName) => {
      const cleanOld = oldName.trim();
      const cleanNew = newName.trim();
      if (!cleanOld || !cleanNew || cleanOld === cleanNew) return;
      setState((prev) => {
        const nextCategories = Array.from(
          new Set(prev.categories.map((c) => (c === cleanOld ? cleanNew : c))),
        );
        const nextProducts = prev.products.map((p) =>
          p.category === cleanOld ? { ...p, category: cleanNew } : p,
        );
        return {
          ...prev,
          categories: nextCategories,
          products: nextProducts,
        };
      });
      toast(`ক্যাটাগরি আপডেট হয়েছে: ${cleanNew}`);
    },
    [toast],
  );

  const deleteCategory = useCallback<DemoStoreValue["deleteCategory"]>(
    (name) => {
      const clean = name.trim();
      if (!clean) return;
      setState((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c !== clean),
        products: prev.products.map((p) =>
          p.category === clean ? { ...p, category: "সাধারণ" } : p,
        ),
      }));
      toast(`ক্যাটাগরি মুছে ফেলা হয়েছে: ${clean}`);
    },
    [toast],
  );

  const updateProductCategory = useCallback<DemoStoreValue["updateProductCategory"]>(
    (productId, category) => {
      const clean = category.trim() || "সাধারণ";
      setState((prev) => ({
        ...prev,
        categories: prev.categories.includes(clean)
          ? prev.categories
          : [...prev.categories, clean],
        products: prev.products.map((p) =>
          p.id === productId ? { ...p, category: clean } : p,
        ),
      }));
      toast(`পণ্যের ক্যাটাগরি পরিবর্তন হয়েছে: ${clean}`);
    },
    [toast],
  );

  const addEmployee = useCallback<DemoStoreValue["addEmployee"]>(
    (input) => {
      const cleanPhone = normalizePhoneInput(input.phone);
      const nowIso = new Date().toISOString();
      const roleType: "staff" | "servicing" =
        input.roleType === "servicing" ? "servicing" : "staff";
      const employee: PosEmployee = {
        id: makeId("emp"),
        name: input.name.trim(),
        phone: cleanPhone,
        address: input.address.trim() || "—",
        monthlySalary: Math.max(0, Math.round(input.monthlySalary)),
        joinedAt: nowIso,
        active: true,
        roleType,
        passwordUpdatedAt: nowIso,
      };
      setState((prev) => ({
        ...prev,
        employees: [employee, ...prev.employees],
      }));

      // Register hashed password on backend (initial password = mobile number by default)
      const initialPw = normalizePasswordInput(input.password || cleanPhone) || cleanPhone;
      const token = getSessionToken();
      if (token && !token.startsWith("local-")) {
        (async () => {
          const expressRes = await fetchExpressJson<{ ok?: boolean }>("/api/staff", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              ...employee,
              password: initialPw,
            }),
          });
          if (expressRes !== null) return;
          await callPosApi("upsert-staff", {
            token,
            id: employee.id,
            name: employee.name,
            phone: employee.phone,
            address: employee.address,
            monthlySalary: employee.monthlySalary,
            roleType: employee.roleType || "staff",
            password: initialPw,
            active: true,
          });
        })();
      }

      toast(`নতুন স্টাফ ও লগইন অ্যাকাউন্ট তৈরি হয়েছে: ${employee.name}`);
      return employee;
    },
    [toast],
  );

  const updateEmployeePassword = useCallback<DemoStoreValue["updateEmployeePassword"]>(
    async (employeeId, newPassword) => {
      if (currentUser.role !== "admin") {
        toast("শুধুমাত্র অ্যাডমিন পাসওয়ার্ড পরিবর্তন করতে পারবেন");
        return false;
      }
      const cleanPw = normalizePasswordInput(newPassword);
      if (cleanPw.length < 4) {
        toast("পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে");
        return false;
      }
      const token = getSessionToken();
      if (!token) {
        toast("সেশন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।");
        return false;
      }
      try {
        let data = await fetchExpressJson<{
          ok?: boolean;
          error?: string;
          passwordUpdatedAt?: string;
        }>(`/api/staff/${encodeURIComponent(employeeId)}/password`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ password: cleanPw }),
        });

        if (data === null) {
          data = await callPosApi<{
            ok?: boolean;
            error?: string;
            passwordUpdatedAt?: string;
          }>("change-password", {
            token,
            targetUserId: employeeId,
            newPassword: cleanPw,
          });
        }

        if (!data || !data.ok) {
          toast(data?.error || "পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে");
          return false;
        }
        const updatedIso = data.passwordUpdatedAt || new Date().toISOString();
        suppressNextSyncRef.current = true;
        setState((prev) => ({
          ...prev,
          employees: prev.employees.map((e) =>
            e.id === employeeId ? { ...e, passwordUpdatedAt: updatedIso } : e,
          ),
        }));
        toast("কর্মীর লগইন পাসওয়ার্ড নিরাপদভাবে হ্যাশ করে সংরক্ষণ করা হয়েছে");
        return true;
      } catch {
        toast("সার্ভার সংযোগ ত্রুটি");
        return false;
      }
    },
    [currentUser.role, toast],
  );

  const updateAdminPassword = useCallback<DemoStoreValue["updateAdminPassword"]>(
    async (newPassword) => {
      if (currentUser.role !== "admin") {
        toast("শুধুমাত্র অ্যাডমিন পাসওয়ার্ড পরিবর্তন করতে পারবেন");
        return false;
      }
      const cleanPw = normalizePasswordInput(newPassword);
      if (cleanPw.length < 4) {
        toast("নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে");
        return false;
      }
      const token = getSessionToken();
      if (!token) {
        toast("সেশন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।");
        return false;
      }
      try {
        let data = await fetchExpressJson<{
          ok?: boolean;
          error?: string;
          passwordUpdatedAt?: string;
        }>("/api/auth/password", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ password: cleanPw }),
        });

        if (data === null) {
          data = await callPosApi<{
            ok?: boolean;
            error?: string;
            passwordUpdatedAt?: string;
          }>("change-password", {
            token,
            targetUserId: currentUser.id,
            newPassword: cleanPw,
          });
        }

        if (!data || !data.ok) {
          toast(data?.error || "অ্যাডমিন পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে");
          return false;
        }
        toast("অ্যাডমিনের পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে");
        return true;
      } catch {
        toast("সার্ভার সংযোগ ত্রুটি");
        return false;
      }
    },
    [currentUser.id, currentUser.role, toast],
  );

  const deleteEmployee = useCallback<DemoStoreValue["deleteEmployee"]>(
    (id) => {
      setState((prev) => ({
        ...prev,
        employees: prev.employees.filter((e) => e.id !== id),
      }));
      const token = getSessionToken();
      if (token && !token.startsWith("local-")) {
        (async () => {
          const expressRes = await fetchExpressJson<{ ok?: boolean }>(
            `/api/staff/${encodeURIComponent(id)}`,
            {
              method: "DELETE",
              headers: getAuthHeaders(),
            },
          );
          if (expressRes !== null) return;
          await callPosApi("delete-staff", {
            token,
            userId: id,
          });
        })();
      }
      toast("স্টাফ তালিকা থেকে সরানো হয়েছে");
    },
    [toast],
  );

  const paySalary = useCallback<DemoStoreValue["paySalary"]>(
    (input) => {
      const target = state.employees.find((e) => e.id === input.employeeId);
      if (!target) return null;
      const amount = Math.max(0, Math.round(input.amount));
      if (amount <= 0) return null;

      const resolvedAccId = resolveAccountId(state, input.accountId, input.method);
      const payment: PosSalaryPayment = {
        id: makeId("sal"),
        employeeId: target.id,
        employeeName: target.name,
        month: input.month.trim() || "চলতি মাস",
        amount,
        paidAt: new Date().toISOString(),
        accountId: resolvedAccId,
        method: input.method || "cash",
        note: input.note?.trim() || undefined,
      };

      setState((prev) => {
        const accountId = resolveAccountId(prev, input.accountId, input.method);
        const accounts = prev.accounts.map((acc) =>
          acc.id === accountId
            ? { ...acc, balance: Math.max(0, acc.balance - payment.amount) }
            : acc,
        );
        const ledgerEntry: DemoLedgerEntry = {
          id: makeId("ldg"),
          party: `${target.name} (বেতন)`,
          date: payment.paidAt,
          amount: payment.amount,
          direction: "out",
          kind: "expense",
          note: payment.note ? `${payment.month} · ${payment.note}` : `বেতন — ${payment.month}`,
        };
        return {
          ...prev,
          accounts,
          ledger: [ledgerEntry, ...prev.ledger],
          salaryPayments: [payment, ...prev.salaryPayments],
        };
      });
      toast(`${target.name}-এর বেতন এন্ট্রি সংরক্ষণ হয়েছে`);
      return payment;
    },
    [state, toast],
  );

  const addServiceJob = useCallback<DemoStoreValue["addServiceJob"]>(
    (input) => {
      const seq = String(state.serviceJobs.length + 101).padStart(3, "0");
      const rawStaffIds = [...input.staffIds];
      if (currentUser.role !== "admin" && currentUser.staffId && !rawStaffIds.includes(currentUser.staffId)) {
        rawStaffIds.push(currentUser.staffId);
      }
      const uniqueIds = Array.from(new Set(rawStaffIds));
      const staffNames = uniqueIds
        .map((id) => state.employees.find((e) => e.id === id)?.name)
        .filter((n): n is string => Boolean(n));

      const charge = Math.max(0, Math.round(input.serviceCharge ?? 0));
      const paid = Math.max(0, Math.min(charge, Math.round(input.paidCharge ?? 0)));
      const due = Math.max(0, charge - paid);
      const paymentStatus: "paid" | "partial" | "due" =
        input.paymentStatus || (charge > 0 && due === 0 ? "paid" : paid > 0 ? "partial" : "due");

      const deviceName = input.deviceName.trim();
      const problemDescription = input.problemDescription.trim();
      const title = input.title?.trim() || `${deviceName} — ${problemDescription.slice(0, 42)}`;
      const nowIso = new Date().toISOString();

      const job: PosServiceJob = {
        id: makeId("srv"),
        jobNo: `SRV-${seq}`,
        title,
        deviceName,
        problemDescription,
        description: input.description?.trim() || "",
        customerName: input.customerName.trim() || "সাধারণ কাস্টমার",
        customerMobile: input.customerMobile.trim() || "—",
        location: input.location.trim() || "সিলেট",
        entryDate: input.entryDate.trim(),
        entryTime: input.entryTime.trim(),
        expectedDeliveryDate: input.expectedDeliveryDate?.trim() || undefined,
        staffIds: uniqueIds,
        staffNames,
        status: input.status || "pending",
        paymentStatus,
        serviceCharge: charge,
        paidCharge: paid,
        dueCharge: due,
        paymentMethod: input.paymentMethod,
        accountId: input.accountId,
        createdAt: nowIso,
        linkedInvoiceIds: [],
      };

      const entryNotif: PosNotification = {
        id: makeId("ntf"),
        type: "new_entry",
        title: `নতুন সার্ভিসিং এন্ট্রি (${job.jobNo})`,
        message: `${job.customerName} (${job.location}) — ${job.deviceName}: ${job.problemDescription}। তারিখ: ${job.entryDate} (${job.entryTime})। নিয়োজিত: ${staffNames.join(", ") || "নির্ধারিত নয়"}`,
        serviceJobId: job.id,
        jobNo: job.jobNo,
        assignedStaffIds: uniqueIds,
        createdAt: nowIso,
        readByUserIds: [],
      };

      const assignmentNotif: PosNotification | null =
        uniqueIds.length > 0
          ? {
              id: makeId("ntf"),
              type: "assignment",
              title: `নতুন সার্ভিসিং অ্যাসাইনমেন্ট (${job.jobNo})`,
              message: `${job.deviceName} (${job.customerName}, ${job.location}) কাজের জন্য ${staffNames.join(", ")}-কে অ্যাসাইন করা হয়েছে।`,
              serviceJobId: job.id,
              jobNo: job.jobNo,
              assignedStaffIds: uniqueIds,
              createdAt: nowIso,
              readByUserIds: [],
            }
          : null;

      setState((prev) => ({
        ...prev,
        serviceJobs: [job, ...prev.serviceJobs],
        notifications: assignmentNotif
          ? [assignmentNotif, entryNotif, ...prev.notifications]
          : [entryNotif, ...prev.notifications],
      }));
      toast(`নতুন সার্ভিসিং কাজ যোগ হয়েছে (${job.jobNo})`);
      return job;
    },
    [currentUser.role, currentUser.staffId, state.employees, state.serviceJobs.length, toast],
  );

  const updateServiceJobStaff = useCallback<DemoStoreValue["updateServiceJobStaff"]>(
    (jobId, staffIds) => {
      const uniqueIds = Array.from(new Set(staffIds));
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const target = prev.serviceJobs.find((j) => j.id === jobId);
        const staffNames = uniqueIds
          .map((id) => prev.employees.find((e) => e.id === id)?.name)
          .filter((n): n is string => Boolean(n));

        const assignNotif: PosNotification | null = target
          ? {
              id: makeId("ntf"),
              type: "assignment",
              title: `সার্ভিসিং কর্মী অ্যাসাইনমেন্ট (${target.jobNo})`,
              message: `${target.jobNo} (${target.customerName}) কাজে নিয়োজিত কর্মী: ${staffNames.join(", ") || "কেউ নয়"}।`,
              serviceJobId: target.id,
              jobNo: target.jobNo,
              assignedStaffIds: uniqueIds,
              createdAt: nowIso,
              readByUserIds: [],
            }
          : null;

        return {
          ...prev,
          serviceJobs: prev.serviceJobs.map((job) =>
            job.id === jobId ? { ...job, staffIds: uniqueIds, staffNames } : job,
          ),
          notifications: assignNotif ? [assignNotif, ...prev.notifications] : prev.notifications,
        };
      });
      toast("সার্ভিসিং কাজের কর্মী তালিকা আপডেট হয়েছে");
    },
    [toast],
  );

  const updateServiceJobStatus = useCallback<DemoStoreValue["updateServiceJobStatus"]>(
    (jobId, status) => {
      const statusLabels: Record<ServiceJobStatus, string> = {
        pending: "পেন্ডিং",
        ongoing: "চলমান",
        completed: "সম্পন্ন",
        delivered: "ডেলিভার্ড",
      };
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const target = prev.serviceJobs.find((j) => j.id === jobId);
        if (!target) return prev;
        const ntf: PosNotification = {
          id: makeId("ntf"),
          type: status === "completed" || status === "delivered" ? "completed" : "status_update",
          title: `সার্ভিসিং স্ট্যাটাস আপডেট (${target.jobNo})`,
          message: `${target.jobNo} (${target.customerName} — ${target.deviceName}) কাজের বর্তমান অবস্থা: ${statusLabels[status]}।`,
          serviceJobId: target.id,
          jobNo: target.jobNo,
          assignedStaffIds: target.staffIds,
          createdAt: nowIso,
          readByUserIds: [],
        };
        return {
          ...prev,
          serviceJobs: prev.serviceJobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status,
                  completedAt:
                    status === "completed" || status === "delivered"
                      ? j.completedAt || nowIso
                      : j.completedAt,
                }
              : j,
          ),
          notifications: [ntf, ...prev.notifications],
        };
      });
      toast(`সার্ভিসিং স্ট্যাটাস আপডেট হয়েছে: ${statusLabels[status]}`);
    },
    [toast],
  );

  const completeServiceJob = useCallback<DemoStoreValue["completeServiceJob"]>(
    (input) => {
      const charge = Math.max(0, Math.round(input.serviceCharge));
      const paid = Math.max(0, Math.min(charge, Math.round(input.paidAmount)));
      const due = Math.max(0, charge - paid);
      const paymentStatus: "paid" | "partial" | "due" =
        charge > 0 && due === 0 ? "paid" : paid > 0 ? "partial" : "due";
      const nextStatus: ServiceJobStatus = input.status || "completed";
      const nowIso = new Date().toISOString();

      setState((prev) => {
        const target = prev.serviceJobs.find((j) => j.id === input.jobId);
        if (!target) return prev;

        const prevPaid = target.paidCharge || 0;
        const prevDue = target.dueCharge || 0;
        const paidDelta = Math.max(0, paid - prevPaid);
        const dueDelta = due - prevDue;

        const accountId = resolveAccountId(prev, input.accountId, input.method);
        const accounts =
          paidDelta > 0
            ? prev.accounts.map((acc) =>
                acc.id === accountId ? { ...acc, balance: acc.balance + paidDelta } : acc,
              )
            : prev.accounts;

        const customers =
          dueDelta !== 0
            ? prev.customers.map((c) =>
                c.name === target.customerName
                  ? { ...c, due: Math.max(0, c.due + dueDelta) }
                  : c,
              )
            : prev.customers;

        const ledger =
          paidDelta > 0
            ? [
                {
                  id: makeId("ldg"),
                  party: `${target.customerName} (সার্ভিসিং)`,
                  date: nowIso,
                  amount: paidDelta,
                  direction: "in" as const,
                  kind: "collection" as const,
                  note: `${target.jobNo} · ${target.deviceName} (${target.location})`,
                },
                ...prev.ledger,
              ]
            : prev.ledger;

        const doneNotif: PosNotification = {
          id: makeId("ntf"),
          type: "completed",
          title: `সার্ভিসিং সম্পন্ন ও চার্জ এন্ট্রি (${target.jobNo})`,
          message: `${target.customerName} (${target.deviceName}) কাজের চার্জ ৳${charge} (জমা: ৳${paid}, বাকি: ৳${due}) সংরক্ষণ করা হয়েছে।`,
          serviceJobId: target.id,
          jobNo: target.jobNo,
          assignedStaffIds: target.staffIds,
          createdAt: nowIso,
          readByUserIds: [],
        };

        return {
          ...prev,
          accounts,
          customers,
          ledger,
          notifications: [doneNotif, ...prev.notifications],
          serviceJobs: prev.serviceJobs.map((job) =>
            job.id === input.jobId
              ? {
                  ...job,
                  status: nextStatus,
                  paymentStatus,
                  serviceCharge: charge,
                  paidCharge: paid,
                  dueCharge: due,
                  paymentMethod: input.method || "cash",
                  accountId,
                  completedAt: job.completedAt ?? nowIso,
                }
              : job,
          ),
        };
      });
      toast("সার্ভিসিং চার্জ সংরক্ষণ ও কাজ সম্পন্ন হয়েছে");
    },
    [toast],
  );

  const linkServiceSale = useCallback<DemoStoreValue["linkServiceSale"]>(
    (jobId, invoiceId) => {
      setState((prev) => ({
        ...prev,
        serviceJobs: prev.serviceJobs.map((job) =>
          job.id === jobId && !job.linkedInvoiceIds.includes(invoiceId)
            ? { ...job, linkedInvoiceIds: [invoiceId, ...job.linkedInvoiceIds] }
            : job,
        ),
      }));
    },
    [],
  );

  const markNotificationRead = useCallback<DemoStoreValue["markNotificationRead"]>(
    (notificationId) => {
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((ntf) =>
          ntf.id === notificationId && !ntf.readByUserIds.includes(currentUser.id)
            ? { ...ntf, readByUserIds: [...ntf.readByUserIds, currentUser.id] }
            : ntf,
        ),
      }));
    },
    [currentUser.id],
  );

  const markAllNotificationsRead = useCallback<DemoStoreValue["markAllNotificationsRead"]>(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((ntf) =>
        ntf.readByUserIds.includes(currentUser.id)
          ? ntf
          : { ...ntf, readByUserIds: [...ntf.readByUserIds, currentUser.id] },
      ),
    }));
    toast("সকল নোটিফিকেশন পঠিত হিসেবে চিহ্নিত হয়েছে");
  }, [currentUser.id, toast]);

  const addSupplier = useCallback<DemoStoreValue["addSupplier"]>(
    (input) => {
      const supplier = {
        id: makeId("sup"),
        name: input.name.trim(),
        mobile: input.mobile.trim(),
        area: input.area?.trim() || "ঢাকা",
        lastTxn: formatDateBn(new Date().toISOString()),
        due: Math.max(0, input.due ?? 0),
      };
      setState((prev) => ({
        ...prev,
        suppliers: [supplier, ...prev.suppliers],
      }));
      toast(`নতুন সাপ্লায়ার যোগ হয়েছে: ${supplier.name}`);
      return supplier;
    },
    [toast],
  );

  const addLedger = useCallback<DemoStoreValue["addLedger"]>(
    (input) => {
      const entry: DemoLedgerEntry = {
        id: makeId("ldg"),
        party: input.party.trim(),
        date: new Date().toISOString(),
        amount: Math.max(0, input.amount),
        direction: input.direction,
        kind: input.kind,
        note: input.note?.trim() || undefined,
      };
      setState((prev) => {
        const accountId = resolveAccountId(prev, input.accountId);
        const accounts = prev.accounts.map((acc) => {
          if (acc.id !== accountId) return acc;
          const delta = entry.direction === "in" ? entry.amount : -entry.amount;
          return { ...acc, balance: Math.max(0, acc.balance + delta) };
        });

        const customers =
          entry.kind === "collection"
            ? prev.customers.map((c) =>
                c.name === entry.party ? { ...c, due: Math.max(0, c.due - entry.amount) } : c,
              )
            : prev.customers;

        const suppliers =
          entry.kind === "payment"
            ? prev.suppliers.map((s) =>
                s.name === entry.party
                  ? {
                      ...s,
                      due: Math.max(0, s.due - entry.amount),
                      lastTxn: formatDateBn(entry.date),
                    }
                  : s,
              )
            : prev.suppliers;

        return {
          ...prev,
          accounts,
          customers,
          suppliers,
          ledger: [entry, ...prev.ledger],
        };
      });
      toast("হিসাবের এন্ট্রি সংরক্ষণ হয়েছে");
      return entry;
    },
    [toast],
  );

  const advanceOrder = useCallback<DemoStoreValue["advanceOrder"]>(
    (id, dsrId) => {
      const current = state.orders.find((order) => order.id === id);
      if (!current || current.status === "completed" || activeRole === "sr") return;
      if (activeRole === "dsr" && (
        current.dsrName !== activeStaff?.name ||
        (current.status !== "ready" && current.status !== "in_transit")
      )) return;

      const nextStatus = ORDER_PIPELINE[ORDER_PIPELINE.indexOf(current.status) + 1];
      if (!nextStatus) return;

      const assignee = state.staff.find((member) => member.id === dsrId && member.role === "DSR" && member.active);
      if (nextStatus === "ready" && !assignee) {
        toast("একজন সক্রিয় DSR বেছে নিন");
        return;
      }

      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => order.id === id && order.status === current.status ? {
          ...order,
          status: nextStatus,
          dsrName: nextStatus === "ready" && assignee ? assignee.name : order.dsrName,
          due: nextStatus === "completed" ? 0 : order.due,
        } : order),
      }));
      toast("অর্ডার ধাপ আপডেট হয়েছে");
    },
    [activeRole, activeStaff?.name, state.orders, state.staff, toast],
  );

  const addOrder = useCallback<DemoStoreValue["addOrder"]>(
    (input) => {
      const seq = String(state.orders.length + 101).padStart(4, "0");
      const seqCh = String(state.orders.length + 201).padStart(4, "0");
      const srName = input.srName?.trim() || activeStaff?.name || "রাকিব হাসান";
      const total = Math.max(0, Math.round(input.total));
      const order: DemoOrder = {
        id: makeId("ord"),
        number: `FO-2611-${seq}`,
        challanNo: `CH-2611-${seqCh}`,
        customerName: input.customerName.trim(),
        area: input.area.trim() || "ঢাকা",
        total,
        itemsCount: Math.max(1, input.itemsCount),
        due: total,
        srName,
        dsrName: "অ্যাসাইন হয়নি",
        status: "submitted",
        source: "sr",
        date: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        orders: [order, ...prev.orders],
        staff: prev.staff.map((member) =>
          member.name === srName
            ? {
                ...member,
                orders: member.orders + 1,
                value: member.value + order.total,
                pending: member.pending + 1,
              }
            : member,
        ),
      }));
      toast(`নতুন ফিল্ড অর্ডার জমা হয়েছে (${order.number})`);
      return order;
    },
    [activeStaff?.name, state.orders.length, toast],
  );

  const toggleVisit = useCallback(
    (customerId: string) => {
      let nowVisited = true;
      setState((prev) => {
        const list = prev.visitedCustomerIds ?? [];
        const exists = list.includes(customerId);
        nowVisited = !exists;
        return {
          ...prev,
          visitedCustomerIds: exists
            ? list.filter((id) => id !== customerId)
            : [...list, customerId],
        };
      });
      toast(nowVisited ? "দোকান ভিজিট চিহ্নিত হয়েছে" : "ভিজিট তালিকা থেকে সরানো হয়েছে");
    },
    [toast],
  );

  const submitHandover = useCallback<DemoStoreValue["submitHandover"]>(
    (input) => {
      const handover: DemoHandover = {
        id: makeId("ho"),
        dsrName: input.dsrName.trim() || activeStaff?.name || "কামরুল ইসলাম",
        amount: Math.max(0, Math.round(input.amount)),
        count: Math.max(1, input.count),
        date: new Date().toISOString(),
        status: "submitted",
      };
      setState((prev) => ({
        ...prev,
        handovers: [handover, ...(prev.handovers ?? [])],
      }));
      toast("ক্যাশ হ্যান্ডওভার জমা হয়েছে");
      return handover;
    },
    [activeStaff?.name, toast],
  );

  const addStaff = useCallback<DemoStoreValue["addStaff"]>(
    (input) => {
      const cleanName = input.name.trim();
      const rawHandle =
        input.handle?.trim() ||
        `@${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "") || "staff"}.${input.role.toLowerCase()}`;
      const member = {
        id: makeId("stf"),
        name: cleanName,
        handle: rawHandle.startsWith("@") ? rawHandle : `@${rawHandle}`,
        role: input.role,
        phone: input.phone.trim(),
        routeName: input.routeName.trim() || "মিরপুর - সাভার রুট",
        active: true,
        orders: 0,
        value: 0,
        pending: 0,
      };
      setState((prev) => ({
        ...prev,
        staff: [member, ...prev.staff],
      }));
      toast(`নতুন ${member.role} যোগ হয়েছে: ${member.name}`);
      return member;
    },
    [toast],
  );

  const addRoute = useCallback<DemoStoreValue["addRoute"]>(
    (input) => {
      const code = input.code?.trim() || `RT-0${state.routes.length + 1}`;
      const route = {
        id: makeId("rt"),
        name: input.name.trim(),
        code,
        area: input.area.trim(),
        customers: 0,
        staffName: input.staffName?.trim() || "অ্যাসাইন বাকি",
      };
      setState((prev) => ({
        ...prev,
        routes: [route, ...prev.routes],
      }));
      toast(`নতুন রুট তৈরি হয়েছে: ${route.name}`);
      return route;
    },
    [state.routes.length, toast],
  );

  const updateBusiness = useCallback<DemoStoreValue["updateBusiness"]>(
    (patch) => {
      setState((prev) => ({
        ...prev,
        orgs: prev.orgs.map((org) =>
          org.id === prev.activeOrgId ? { ...org, ...patch } : org,
        ),
      }));
      toast("ব্যবসার তথ্য আপডেট হয়েছে");
    },
    [toast],
  );

  const updateSettings = useCallback<DemoStoreValue["updateSettings"]>(
    (patch) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }));
      toast("সেটিংস সংরক্ষণ হয়েছে");
    },
    [toast],
  );

  const resetDemo = useCallback(() => {
    removeStorage(storageKeyFor(mode, userKey));
    suppressNextSyncRef.current = true;
    const seed = createState();
    setState(seed);
    const token = getSessionToken();
    if (token && !token.startsWith("local-")) {
      (async () => {
        let res = await fetchExpressJson<{ ok?: boolean; state?: Partial<DemoState> }>(
          "/api/state/reset",
          {
            method: "POST",
            headers: getAuthHeaders(),
          },
        );
        if (res === null) {
          res = await callPosApi<{ ok?: boolean; state?: Partial<DemoState> }>(
            "reset-state",
            { token },
          );
        }
        if (res?.ok && res.state) {
          suppressNextSyncRef.current = true;
          setState(normalizeRemoteState(res.state, seed));
        }
      })();
    }
    toast("ডাটা রিসেট হয়েছে");
  }, [mode, userKey, createState, toast]);

  const logout = useCallback(() => {
    onLogout?.();
  }, [onLogout]);

  const value = useMemo<DemoStoreValue>(
    () => ({
      mode,
      role: activeRole,
      currentUser,
      activeStaff,
      basePath,
      subPath,
      go,
      openRoleModal,
      state,
      visibleServiceJobs,
      visibleNotifications,
      unreadNotificationsCount,
      activeOrg,
      capabilities,
      setOrgId,
      addSale,
      addPurchase,
      addCustomer,
      deleteCustomer,
      addProduct,
      addCategory,
      renameCategory,
      deleteCategory,
      updateProductCategory,
      addEmployee,
      updateEmployeePassword,
      updateAdminPassword,
      deleteEmployee,
      paySalary,
      addServiceJob,
      updateServiceJobStaff,
      updateServiceJobStatus,
      completeServiceJob,
      linkServiceSale,
      markNotificationRead,
      markAllNotificationsRead,
      addSupplier,
      addLedger,
      advanceOrder,
      addOrder,
      toggleVisit,
      submitHandover,
      addStaff,
      addRoute,
      updateBusiness,
      updateSettings,
      resetDemo,
      logout,
      toast,
      toastMessage,
    }),
    [
      mode,
      activeRole,
      currentUser,
      activeStaff,
      basePath,
      subPath,
      go,
      openRoleModal,
      state,
      visibleServiceJobs,
      visibleNotifications,
      unreadNotificationsCount,
      activeOrg,
      capabilities,
      setOrgId,
      addSale,
      addPurchase,
      addCustomer,
      deleteCustomer,
      addProduct,
      addCategory,
      renameCategory,
      deleteCategory,
      updateProductCategory,
      addEmployee,
      updateEmployeePassword,
      updateAdminPassword,
      deleteEmployee,
      paySalary,
      addServiceJob,
      updateServiceJobStaff,
      updateServiceJobStatus,
      completeServiceJob,
      linkServiceSale,
      markNotificationRead,
      markAllNotificationsRead,
      addSupplier,
      addLedger,
      advanceOrder,
      addOrder,
      toggleVisit,
      submitHandover,
      addStaff,
      addRoute,
      updateBusiness,
      updateSettings,
      resetDemo,
      logout,
      toast,
      toastMessage,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoStoreValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemo must be used inside <DemoProvider>");
  }
  return ctx;
}
