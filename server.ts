import crypto from "node:crypto";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { createRetailPosState } from "./src/demos/retail-pos/seed";
import type {
  DemoState,
  PosAuthUser,
  PosNotification,
  PosServiceJob,
  PosUserRole,
} from "./src/demos/shared/demoTypes";
import { BUSINESS } from "./src/lib/config";
import { toEnDigits } from "./src/lib/global";

const PORT = Number(process.env.PORT) || 3000;

try {
  // Node 22+ built-in .env loader (no-op if .env does not exist)
  (process as { loadEnvFile?: (path?: string) => void }).loadEnvFile?.(".env");
} catch {
  // Ignore missing .env
}

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://ltpkaonghjlijissazkz.supabase.co"
).replace(/\/+$/, "");

const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_uZE9zBUNkeZazJxsBPOzog_peWypFH_";

async function callPosApi<T extends Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown>,
): Promise<{ transportOk: true; data: T } | { transportOk: false }> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { transportOk: false };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/pos-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const text = await res.text();
    if (!text) return { transportOk: false };
    const data = JSON.parse(text) as T;
    if (res.status >= 500 || typeof data?.ok !== "boolean") {
      return { transportOk: false };
    }
    return { transportOk: true, data };
  } catch {
    return { transportOk: false };
  }
}

function normalizePhone(raw: string): string {
  const digits = toEnDigits(String(raw || "")).replace(/[\s\-()]+/g, "").trim();
  if (digits.startsWith("+880")) return `0${digits.slice(4)}`;
  if (digits.startsWith("880") && digits.length === 13) return `0${digits.slice(3)}`;
  return digits;
}

function normalizePassword(raw: string): string {
  return toEnDigits(String(raw || "")).trim();
}

export function hashPasswordScrypt(plainPassword: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPasswordScrypt(plainPassword: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith("scrypt$")) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 3) return false;
  const [, salt, hexHash] = parts;
  const derived = crypto.scryptSync(plainPassword, salt, 64);
  const target = Buffer.from(hexHash, "hex");
  if (derived.length !== target.length) return false;
  return crypto.timingSafeEqual(derived, target);
}

interface ServerAccountRecord {
  id: string;
  name: string;
  phone: string;
  role: PosUserRole;
  staffId?: string;
  passwordHash: string;
  passwordUpdatedAt: string;
}

const ADMIN_PHONE = normalizePhone(process.env.POS_ADMIN_PHONE || "01609099713");
const ADMIN_PASS = normalizePassword(process.env.POS_ADMIN_PASSWORD || "01609099713");
const SERVICING_PHONE = normalizePhone(process.env.POS_SERVICING_PHONE || "01700998877");
const SERVICING_PASS = normalizePassword(process.env.POS_SERVICING_PASSWORD || "01700998877");

let serverState: DemoState = createRetailPosState();
const accountByPhone = new Map<string, ServerAccountRecord>();
const activeSessions = new Map<string, { user: PosAuthUser; expiresAt: number }>();

function bootstrapAccountsFromState(state: DemoState) {
  accountByPhone.clear();
  const nowIso = new Date().toISOString();

  accountByPhone.set(ADMIN_PHONE, {
    id: "usr-admin",
    name: BUSINESS.ownerBn,
    phone: ADMIN_PHONE,
    role: "admin",
    passwordHash: hashPasswordScrypt(ADMIN_PASS),
    passwordUpdatedAt: nowIso,
  });

  accountByPhone.set(SERVICING_PHONE, {
    id: "emp-servicing",
    name: "সার্ভিসিং বিভাগ",
    phone: SERVICING_PHONE,
    role: "servicing",
    staffId: "emp-servicing",
    passwordHash: hashPasswordScrypt(SERVICING_PASS),
    passwordUpdatedAt: nowIso,
  });

  for (const emp of state.employees) {
    const cleanPhone = normalizePhone(emp.phone);
    if (!cleanPhone) continue;
    const role: PosUserRole = emp.roleType === "servicing" ? "servicing" : "staff";
    if (!accountByPhone.has(cleanPhone)) {
      // Every staff member's mobile number and initial password are identical, hashed with scrypt
      accountByPhone.set(cleanPhone, {
        id: emp.id,
        name: emp.name,
        phone: cleanPhone,
        role,
        staffId: emp.id,
        passwordHash: hashPasswordScrypt(cleanPhone),
        passwordUpdatedAt: emp.passwordUpdatedAt || emp.joinedAt || nowIso,
      });
    }
  }
}

bootstrapAccountsFromState(serverState);

function canUserAccessServiceJob(user: PosAuthUser, job: PosServiceJob): boolean {
  if (user.role === "admin") return true;
  if (!user.staffId) return false;
  return job.staffIds.includes(user.staffId);
}

function canUserAccessNotification(user: PosAuthUser, ntf: PosNotification): boolean {
  if (user.role === "admin") return true;
  if (!user.staffId) return false;
  return ntf.assignedStaffIds.includes(user.staffId);
}

function sanitizeStateForUser(state: DemoState, user: PosAuthUser): DemoState {
  if (user.role === "admin") {
    return state;
  }

  const visibleJobs = state.serviceJobs.filter((j) => canUserAccessServiceJob(user, j));
  const visibleJobIds = new Set(visibleJobs.map((j) => j.id));
  const linkedInvoiceIds = new Set(visibleJobs.flatMap((j) => j.linkedInvoiceIds));

  return {
    ...state,
    products: state.products.map((p) => ({
      ...p,
      purchaseRate: 0, // Strip purchase costs for non-admin roles
    })),
    serviceJobs: visibleJobs,
    notifications: state.notifications.filter((n) => canUserAccessNotification(user, n)),
    invoices: state.invoices.filter(
      (inv) =>
        (inv.serviceJobId && visibleJobIds.has(inv.serviceJobId)) ||
        linkedInvoiceIds.has(inv.id),
    ),
    purchases: [],
    ledger: [],
    salaryPayments: [],
    accounts: state.accounts.map((a) => ({
      ...a,
      balance: 0, // Hide overall business account balances
    })),
  };
}

interface AuthedRequest extends Request {
  authUser?: PosAuthUser;
  authToken?: string;
  isSupabaseToken?: boolean;
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const xPosHeader = typeof req.headers["x-pos-token"] === "string" ? req.headers["x-pos-token"].trim() : "";
  const token = (header.startsWith("Bearer ") ? header.slice(7).trim() : "") || xPosHeader;
  if (!token) {
    res.status(401).json({ ok: false, error: "অনুমোদিত নয়। অনুগ্রহ করে লগইন করুন।" });
    return;
  }
  const session = activeSessions.get(token);
  if (session && session.expiresAt >= Date.now()) {
    req.authUser = session.user;
    req.authToken = token;
    req.isSupabaseToken = false;
    next();
    return;
  }
  if (session) {
    activeSessions.delete(token);
  }

  // Verify token against Supabase pos-api
  const rpc = await callPosApi<{ ok: boolean; user?: PosAuthUser; error?: string }>("me", {
    token,
  });
  if (rpc.transportOk && rpc.data.ok && rpc.data.user) {
    req.authUser = rpc.data.user;
    req.authToken = token;
    req.isSupabaseToken = true;
    next();
    return;
  }

  res.status(401).json({ ok: false, error: "সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।" });
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.role !== "admin") {
    res.status(403).json({
      ok: false,
      error: "শুধুমাত্র অ্যাডমিন এই তথ্য বা সেটিংস পরিচালনা করতে পারবেন।",
    });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // 1. Login Endpoint (Supabase RPC first, scrypt fallback when offline)
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const rawPhone = String(req.body?.phone ?? "");
    const rawPassword = String(req.body?.password ?? "");
    const phone = normalizePhone(rawPhone);
    const password = normalizePassword(rawPassword);

    if (!phone) {
      res.status(400).json({ ok: false, field: "phone", error: "মোবাইল নম্বর লিখুন" });
      return;
    }
    if (!password) {
      res.status(400).json({ ok: false, field: "password", error: "পাসওয়ার্ড লিখুন" });
      return;
    }

    const rpc = await callPosApi<{
      ok: boolean;
      token?: string;
      user?: PosAuthUser;
      field?: "phone" | "password" | "form";
      error?: string;
    }>("login", { phone, password });

    if (rpc.transportOk) {
      if (!rpc.data.ok || !rpc.data.token || !rpc.data.user) {
        res.status(401).json({
          ok: false,
          field: rpc.data.field || "form",
          error: rpc.data.error || "মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।",
        });
        return;
      }
      res.json({ ok: true, token: rpc.data.token, user: rpc.data.user });
      return;
    }

    const account = accountByPhone.get(phone);
    if (!account || !verifyPasswordScrypt(password, account.passwordHash)) {
      res.status(401).json({
        ok: false,
        field: "form",
        error: "মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।",
      });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const user: PosAuthUser = {
      id: account.id,
      name: account.name,
      phone: account.phone,
      role: account.role,
      staffId: account.staffId,
    };

    activeSessions.set(token, {
      user,
      expiresAt: Date.now() + 1000 * 60 * 60 * 12,
    });

    res.json({ ok: true, token, user });
  });

  app.post("/api/auth/logout", requireAuth, async (req: AuthedRequest, res: Response) => {
    if (req.authToken) {
      activeSessions.delete(req.authToken);
      if (req.isSupabaseToken) {
        await callPosApi("logout", { token: req.authToken });
      }
    }
    res.json({ ok: true });
  });

  app.get("/api/auth/me", requireAuth, (req: AuthedRequest, res: Response) => {
    res.json({ ok: true, user: req.authUser });
  });

  // 2. Role-filtered State Sync
  app.get("/api/state", requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    if (req.isSupabaseToken && req.authToken) {
      const rpc = await callPosApi<{ ok: boolean; state?: DemoState; error?: string }>(
        "get-state",
        { token: req.authToken },
      );
      if (rpc.transportOk && rpc.data.ok && rpc.data.state) {
        if (user.role === "admin") {
          serverState = rpc.data.state;
        }
        res.json({ ok: true, state: rpc.data.state });
        return;
      }
    }
    res.json({
      ok: true,
      state: sanitizeStateForUser(serverState, user),
    });
  });

  app.post("/api/state/reset", requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    if (req.isSupabaseToken && req.authToken) {
      const rpc = await callPosApi<{ ok: boolean; state?: DemoState; error?: string }>(
        "reset-state",
        { token: req.authToken },
      );
      if (rpc.transportOk) {
        if (!rpc.data.ok || !rpc.data.state) {
          res.status(400).json({ ok: false, error: rpc.data.error || "ডাটা রিসেট ব্যর্থ হয়েছে" });
          return;
        }
        serverState = rpc.data.state;
        res.json({ ok: true, state: rpc.data.state });
        return;
      }
    }
    serverState = createRetailPosState();
    bootstrapAccountsFromState(serverState);
    res.json({ ok: true, state: serverState });
  });

  // 3. Admin-only Staff Account & Password Management (No self-service reset)
  app.post("/api/staff", requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    const name = String(req.body?.name ?? "").trim();
    const phone = normalizePhone(String(req.body?.phone ?? ""));
    const address = String(req.body?.address ?? "").trim() || "—";
    const monthlySalary = Math.max(0, Math.round(Number(req.body?.monthlySalary) || 0));
    const roleType: "staff" | "servicing" =
      req.body?.roleType === "servicing" ? "servicing" : "staff";
    // Initial password defaults to mobile number as required
    const rawInitialPassword = normalizePassword(String(req.body?.password || phone));

    if (!name || !phone) {
      res.status(400).json({ ok: false, error: "কর্মীর নাম ও মোবাইল নম্বর আবশ্যক" });
      return;
    }

    const nowIso = new Date().toISOString();
    const id = String(req.body?.id || `emp-${Date.now().toString(36)}`);

    if (req.isSupabaseToken && req.authToken) {
      const rpc = await callPosApi<{ ok: boolean; employee?: DemoState["employees"][number]; error?: string }>(
        "upsert-staff",
        {
          token: req.authToken,
          id,
          name,
          phone,
          address,
          monthlySalary,
          roleType,
          password: rawInitialPassword || phone,
          active: true,
        },
      );
      if (rpc.transportOk) {
        if (!rpc.data.ok || !rpc.data.employee) {
          res.status(400).json({ ok: false, error: rpc.data.error || "স্টাফ সংরক্ষণ ব্যর্থ হয়েছে" });
          return;
        }
        serverState = {
          ...serverState,
          employees: [
            rpc.data.employee,
            ...serverState.employees.filter((e) => e.id !== rpc.data.employee!.id && normalizePhone(e.phone) !== phone),
          ],
        };
        res.json({ ok: true, employee: rpc.data.employee });
        return;
      }
    }

    const newEmp = {
      id,
      name,
      phone,
      address,
      monthlySalary,
      joinedAt: nowIso,
      active: true,
      roleType,
      passwordUpdatedAt: nowIso,
    };

    serverState = {
      ...serverState,
      employees: [newEmp, ...serverState.employees.filter((e) => e.id !== id && normalizePhone(e.phone) !== phone)],
    };

    accountByPhone.set(phone, {
      id,
      name,
      phone,
      role: roleType,
      staffId: id,
      passwordHash: hashPasswordScrypt(rawInitialPassword || phone),
      passwordUpdatedAt: nowIso,
    });

    res.json({ ok: true, employee: newEmp });
  });

  app.put("/api/auth/password", requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    const newPassword = normalizePassword(String(req.body?.password ?? ""));
    if (!newPassword || newPassword.length < 4) {
      res.status(400).json({ ok: false, error: "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে" });
      return;
    }

    const adminUser = req.authUser!;
    if (req.isSupabaseToken && req.authToken) {
      const rpc = await callPosApi<{ ok: boolean; passwordUpdatedAt?: string; error?: string }>(
        "change-password",
        {
          token: req.authToken,
          targetUserId: adminUser.id,
          newPassword,
        },
      );
      if (rpc.transportOk) {
        if (!rpc.data.ok) {
          res.status(400).json({ ok: false, error: rpc.data.error || "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে" });
          return;
        }
        res.json({ ok: true, passwordUpdatedAt: rpc.data.passwordUpdatedAt || new Date().toISOString() });
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const phone = normalizePhone(adminUser.phone);
    accountByPhone.set(phone, {
      id: adminUser.id,
      name: adminUser.name,
      phone,
      role: "admin",
      passwordHash: hashPasswordScrypt(newPassword),
      passwordUpdatedAt: nowIso,
    });
    for (const [tok, sess] of activeSessions.entries()) {
      if (sess.user.id === adminUser.id && tok !== req.authToken) {
        activeSessions.delete(tok);
      }
    }
    res.json({ ok: true, passwordUpdatedAt: nowIso });
  });

  app.put("/api/staff/:id/password", requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    const empId = String(req.params.id);
    const newPassword = normalizePassword(String(req.body?.password ?? ""));
    if (!newPassword || newPassword.length < 4) {
      res.status(400).json({ ok: false, error: "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে" });
      return;
    }

    if (req.isSupabaseToken && req.authToken) {
      const rpc = await callPosApi<{ ok: boolean; passwordUpdatedAt?: string; error?: string }>(
        "change-password",
        {
          token: req.authToken,
          targetUserId: empId,
          newPassword,
        },
      );
      if (rpc.transportOk) {
        if (!rpc.data.ok) {
          res.status(404).json({ ok: false, error: rpc.data.error || "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে" });
          return;
        }
        const updatedIso = rpc.data.passwordUpdatedAt || new Date().toISOString();
        serverState = {
          ...serverState,
          employees: serverState.employees.map((e) =>
            e.id === empId ? { ...e, passwordUpdatedAt: updatedIso } : e,
          ),
        };
        res.json({ ok: true, passwordUpdatedAt: updatedIso });
        return;
      }
    }

    const emp = serverState.employees.find((e) => e.id === empId);
    if (!emp) {
      res.status(404).json({ ok: false, error: "স্টাফ খুঁজে পাওয়া যায়নি" });
      return;
    }

    const phone = normalizePhone(emp.phone);
    const nowIso = new Date().toISOString();
    const role: PosUserRole = emp.roleType === "servicing" ? "servicing" : "staff";

    accountByPhone.set(phone, {
      id: emp.id,
      name: emp.name,
      phone,
      role,
      staffId: emp.id,
      passwordHash: hashPasswordScrypt(newPassword),
      passwordUpdatedAt: nowIso,
    });
    for (const [tok, sess] of activeSessions.entries()) {
      if (sess.user.id === emp.id) {
        activeSessions.delete(tok);
      }
    }

    serverState = {
      ...serverState,
      employees: serverState.employees.map((e) =>
        e.id === empId ? { ...e, passwordUpdatedAt: nowIso } : e,
      ),
    };

    res.json({ ok: true, passwordUpdatedAt: nowIso });
  });

  app.delete("/api/staff/:id", requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    const empId = String(req.params.id);
    if (req.isSupabaseToken && req.authToken) {
      const rpc = await callPosApi<{ ok: boolean; error?: string }>("delete-staff", {
        token: req.authToken,
        userId: empId,
      });
      if (rpc.transportOk) {
        if (!rpc.data.ok) {
          res.status(400).json({ ok: false, error: rpc.data.error || "স্টাফ মোছা ব্যর্থ হয়েছে" });
          return;
        }
        serverState = {
          ...serverState,
          employees: serverState.employees.filter((e) => e.id !== empId),
        };
        res.json({ ok: true });
        return;
      }
    }

    const emp = serverState.employees.find((e) => e.id === empId);
    if (emp) {
      const phone = normalizePhone(emp.phone);
      if (phone !== ADMIN_PHONE) {
        accountByPhone.delete(phone);
      }
    }
    serverState = {
      ...serverState,
      employees: serverState.employees.filter((e) => e.id !== empId),
    };
    res.json({ ok: true });
  });

  // 4. Servicing Records API with Strict Record-Level Privacy
  app.get("/api/servicing", requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    if (req.isSupabaseToken && req.authToken) {
      const rpc = await callPosApi<{ ok: boolean; state?: DemoState }>("get-state", {
        token: req.authToken,
      });
      if (rpc.transportOk && rpc.data.ok && rpc.data.state) {
        res.json({ ok: true, serviceJobs: rpc.data.state.serviceJobs });
        return;
      }
    }
    const jobs = serverState.serviceJobs.filter((j) => canUserAccessServiceJob(user, j));
    res.json({ ok: true, serviceJobs: jobs });
  });

  app.get("/api/servicing/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    if (req.isSupabaseToken && req.authToken) {
      const rpc = await callPosApi<{ ok: boolean; state?: DemoState }>("get-state", {
        token: req.authToken,
      });
      if (rpc.transportOk && rpc.data.ok && rpc.data.state) {
        const job = rpc.data.state.serviceJobs.find((j) => j.id === req.params.id);
        if (!job) {
          res.status(403).json({
            ok: false,
            error: "আপনার এই সার্ভিসিং রেকর্ড দেখার অনুমতি নেই বা রেকর্ডটি পাওয়া যায়নি।",
          });
          return;
        }
        res.json({ ok: true, serviceJob: job });
        return;
      }
    }
    const job = serverState.serviceJobs.find((j) => j.id === req.params.id);
    if (!job) {
      res.status(404).json({ ok: false, error: "সার্ভিসিং রেকর্ড পাওয়া যায়নি" });
      return;
    }
    if (!canUserAccessServiceJob(user, job)) {
      res.status(403).json({
        ok: false,
        error: "আপনার এই সার্ভিসিং রেকর্ড দেখার অনুমতি নেই। শুধুমাত্র অ্যাডমিন ও অ্যাসাইন করা স্টাফ দেখতে পারবেন।",
      });
      return;
    }
    res.json({ ok: true, serviceJob: job });
  });

  app.post("/api/servicing", requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const body = req.body ?? {};
    const entryDate = String(body.entryDate ?? "").trim();
    const entryTime = String(body.entryTime ?? "").trim();
    const customerName = String(body.customerName ?? "").trim();
    const customerMobile = String(body.customerMobile ?? "").trim();
    const deviceName = String(body.deviceName ?? "").trim();
    const problemDescription = String(body.problemDescription ?? "").trim();

    if (!entryDate || !entryTime) {
      res.status(400).json({ ok: false, error: "সার্ভিসিং এন্ট্রির তারিখ এবং সময় নির্বাচন করা আবশ্যক" });
      return;
    }
    if (!customerName || !customerMobile || !deviceName || !problemDescription) {
      res.status(400).json({ ok: false, error: "কাস্টমার, ডিভাইস ও সমস্যার বিবরণ পূরণ করা আবশ্যক" });
      return;
    }

    const rawStaffIds: string[] = Array.isArray(body.staffIds) ? body.staffIds.map(String) : [];
    if (user.role !== "admin" && user.staffId && !rawStaffIds.includes(user.staffId)) {
      rawStaffIds.push(user.staffId);
    }
    const uniqueStaffIds = Array.from(new Set(rawStaffIds));
    const staffNames = uniqueStaffIds
      .map((id) => serverState.employees.find((e) => e.id === id)?.name)
      .filter((n): n is string => Boolean(n));

    const seq = String(serverState.serviceJobs.length + 101).padStart(3, "0");
    const serviceCharge = Math.max(0, Math.round(Number(body.serviceCharge) || 0));
    const paidCharge = Math.max(0, Math.min(serviceCharge, Math.round(Number(body.paidCharge) || 0)));
    const dueCharge = Math.max(0, serviceCharge - paidCharge);
    const paymentStatus: "paid" | "partial" | "due" =
      serviceCharge > 0 && dueCharge === 0 ? "paid" : paidCharge > 0 ? "partial" : "due";

    const job: PosServiceJob = {
      id: String(body.id || `srv-${Date.now().toString(36)}`),
      jobNo: String(body.jobNo || `SRV-${seq}`),
      title: String(body.title || `${deviceName} — সার্ভিসিং`).trim(),
      deviceName,
      problemDescription,
      description: String(body.description ?? "").trim(),
      customerName,
      customerMobile,
      location: String(body.location ?? "সিলেট").trim() || "সিলেট",
      entryDate,
      entryTime,
      expectedDeliveryDate: body.expectedDeliveryDate ? String(body.expectedDeliveryDate).trim() : undefined,
      staffIds: uniqueStaffIds,
      staffNames,
      status: body.status || "pending",
      paymentStatus,
      serviceCharge,
      paidCharge,
      dueCharge,
      createdAt: new Date().toISOString(),
      linkedInvoiceIds: [],
    };

    const newNotif: PosNotification = {
      id: `ntf-${Date.now().toString(36)}`,
      type: "new_entry",
      title: `নতুন সার্ভিসিং এন্ট্রি (${job.jobNo})`,
      message: `${job.customerName} (${job.location}) — ${job.deviceName}: ${job.problemDescription}। তারিখ: ${job.entryDate} ${job.entryTime}। নিয়োজিত: ${staffNames.join(", ") || "নির্ধারিত নয়"}`,
      serviceJobId: job.id,
      jobNo: job.jobNo,
      assignedStaffIds: uniqueStaffIds,
      createdAt: new Date().toISOString(),
      readByUserIds: [],
    };

    serverState = {
      ...serverState,
      serviceJobs: [job, ...serverState.serviceJobs.filter((j) => j.id !== job.id)],
      notifications: [newNotif, ...serverState.notifications],
    };

    res.json({ ok: true, serviceJob: job, notification: newNotif });
  });

  // Sync client mutations back to server store (and Supabase) with role check
  app.post("/api/state/sync", requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const incoming = req.body?.state as DemoState | undefined;
    if (!incoming || typeof incoming !== "object") {
      res.status(400).json({ ok: false, error: "Invalid state payload" });
      return;
    }

    if (req.isSupabaseToken && req.authToken) {
      const rpc = await callPosApi<{ ok: boolean; error?: string }>("sync-state", {
        token: req.authToken,
        state: incoming,
      });
      if (rpc.transportOk) {
        if (!rpc.data.ok) {
          res.status(400).json({ ok: false, error: rpc.data.error || "Sync failed" });
          return;
        }
        if (user.role === "admin") {
          serverState = { ...serverState, ...incoming };
        }
        res.json({ ok: true });
        return;
      }
    }

    if (user.role === "admin") {
      serverState = {
        ...serverState,
        ...incoming,
      };
      // Ensure any newly added employees in state also have hashed login accounts
      for (const emp of serverState.employees) {
        const cleanPhone = normalizePhone(emp.phone);
        if (cleanPhone && !accountByPhone.has(cleanPhone)) {
          accountByPhone.set(cleanPhone, {
            id: emp.id,
            name: emp.name,
            phone: cleanPhone,
            role: emp.roleType === "servicing" ? "servicing" : "staff",
            staffId: emp.id,
            passwordHash: hashPasswordScrypt(cleanPhone),
            passwordUpdatedAt: emp.passwordUpdatedAt || new Date().toISOString(),
          });
        }
      }
    } else {
      // Staff / Servicing can only update their assigned serviceJobs, notifications, customers, products stock, and servicing invoices
      const incomingJobs = Array.isArray(incoming.serviceJobs) ? incoming.serviceJobs : [];
      const mergedJobsMap = new Map<string, PosServiceJob>();
      for (const existing of serverState.serviceJobs) {
        mergedJobsMap.set(existing.id, existing);
      }
      for (const job of incomingJobs) {
        const existing = mergedJobsMap.get(job.id);
        if (!existing || canUserAccessServiceJob(user, existing) || canUserAccessServiceJob(user, job)) {
          mergedJobsMap.set(job.id, job);
        }
      }

      const incomingNotifs = Array.isArray(incoming.notifications) ? incoming.notifications : [];
      const mergedNotifsMap = new Map<string, PosNotification>();
      for (const existing of serverState.notifications) {
        mergedNotifsMap.set(existing.id, existing);
      }
      for (const ntf of incomingNotifs) {
        mergedNotifsMap.set(ntf.id, ntf);
      }

      // Preserve product purchaseRate on server while allowing stock updates
      const incomingProducts = Array.isArray(incoming.products) ? incoming.products : [];
      const updatedProducts = serverState.products.map((srvProd) => {
        const match = incomingProducts.find((p) => p.id === srvProd.id);
        if (!match) return srvProd;
        return {
          ...srvProd,
          paidStock: match.paidStock,
          freeStock: match.freeStock,
        };
      });

      const incomingInvoices = Array.isArray(incoming.invoices) ? incoming.invoices : [];
      const existingInvIds = new Set(serverState.invoices.map((i) => i.id));
      const newInvoices = incomingInvoices.filter((i) => !existingInvIds.has(i.id));

      serverState = {
        ...serverState,
        products: updatedProducts,
        customers: Array.isArray(incoming.customers) ? incoming.customers : serverState.customers,
        invoices: [...newInvoices, ...serverState.invoices],
        serviceJobs: Array.from(mergedJobsMap.values()),
        notifications: Array.from(mergedNotifsMap.values()),
      };
    }

    res.json({ ok: true });
  });

  // 5. Protected Reports & Financial Endpoints (Strictly Admin-Only: 403 for Servicing & Staff)
  app.get("/api/reports", requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    let targetState = serverState;
    if (req.isSupabaseToken && req.authToken) {
      const rpc = await callPosApi<{ ok: boolean; state?: DemoState }>("get-state", {
        token: req.authToken,
      });
      if (rpc.transportOk && rpc.data.ok && rpc.data.state) {
        targetState = rpc.data.state;
      }
    }
    const totalSales = targetState.invoices.reduce((s, i) => s + i.total, 0);
    const totalPurchases = targetState.purchases.reduce((s, i) => s + i.total, 0);
    res.json({
      ok: true,
      reports: {
        totalSales,
        totalPurchases,
        invoicesCount: targetState.invoices.length,
        accounts: targetState.accounts,
      },
    });
  });

  app.get("/api/notifications", requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    if (req.isSupabaseToken && req.authToken) {
      const rpc = await callPosApi<{ ok: boolean; state?: DemoState }>("get-state", {
        token: req.authToken,
      });
      if (rpc.transportOk && rpc.data.ok && rpc.data.state) {
        res.json({ ok: true, notifications: rpc.data.state.notifications });
        return;
      }
    }
    const list = serverState.notifications.filter((n) => canUserAccessNotification(user, n));
    res.json({ ok: true, notifications: list });
  });

  // Mount Vite or Static Dist
  if (process.env.NODE_ENV === "production") {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bismillah CCTV & Electronics POS server listening on http://0.0.0.0:${PORT}`);
  });
}

// Only start server when executed directly
if (process.argv[1] && process.argv[1].endsWith("server.ts")) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
