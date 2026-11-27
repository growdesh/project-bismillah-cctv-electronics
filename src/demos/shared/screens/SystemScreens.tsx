import {
  ArrowLeft,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  CircleHelp,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  ShoppingBag,
  Truck,
  UserCheck,
  UserRound,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isRouteAllowedForRole, normalizePasswordInput } from "../../../lib/auth";
import { BUSINESS, CONTACT, MESSAGES } from "../../../lib/config";
import {
  GLOBAL_POLICY,
  getDemoModeMeta,
  toBn,
} from "../../../lib/global";
import { useRouter } from "../../../lib/router";
import { telLink, waLink } from "../../../lib/wa";
import { useDemo } from "../demoStore";

/* ─────────────────────────── 1. AdminScreen ─────────────────────────── */

type AdminTab =
  | "overview"
  | "employees"
  | "roles"
  | "modules"
  | "assignments"
  | "logs";

interface AdminEmployee {
  id: string;
  name: string;
  role: string;
  phone: string;
  branch: string;
  status: "সক্রিয়" | "বিরতি";
}

export function AdminScreen() {
  const { state, activeOrg, capabilities, go, toast } = useDemo();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [empModalOpen, setEmpModalOpen] = useState<boolean>(false);

  const [employees, setEmployees] = useState<AdminEmployee[]>(() => [
    {
      id: "emp-1",
      name: activeOrg.ownerName,
      role: "অ্যাডমিন / মালিক",
      phone: activeOrg.phone,
      branch: activeOrg.name,
      status: "সক্রিয়",
    },
    {
      id: "emp-2",
      name: "মো. সাইফুল ইসলাম",
      role: "ম্যানেজার",
      phone: "01712004455",
      branch: activeOrg.name,
      status: "সক্রিয়",
    },
    {
      id: "emp-3",
      name: "তানিয়া আক্তার",
      role: "ক্যাশিয়ার",
      phone: "01812005566",
      branch: activeOrg.name,
      status: "সক্রিয়",
    },
  ]);

  const [modulePerms, setModulePerms] = useState<Record<string, boolean>>({
    salesPos: true,
    stockPurchase: true,
    accounting: true,
    reports: true,
    fieldDelivery: true,
    deleteInvoice: false,
  });

  const [auditLogs, setAuditLogs] = useState<
    { id: string; action: string; actor: string; time: string }[]
  >([
    {
      id: "log-1",
      action: `${activeOrg.name} শাখায় ক্যাশিয়ার রোল সক্রিয় করা হয়েছে`,
      actor: activeOrg.ownerName,
      time: "আজ · ১০:১৫ am",
    },
    {
      id: "log-2",
      action: "রিপোর্ট দেখার অনুমতি ম্যানেজার রোলে যুক্ত হয়েছে",
      actor: activeOrg.ownerName,
      time: "গতকাল · ০৫:৩০ pm",
    },
  ]);

  const [newEmpName, setNewEmpName] = useState<string>("");
  const [newEmpPhone, setNewEmpPhone] = useState<string>("");
  const [newEmpRole, setNewEmpRole] = useState<string>("ক্যাশিয়ার");

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) {
      toast("কর্মচারীর নাম লিখুন");
      return;
    }
    const created: AdminEmployee = {
      id: `emp-${Date.now()}`,
      name: newEmpName.trim(),
      role: newEmpRole,
      phone: newEmpPhone.trim() || "01700000000",
      branch: activeOrg.name,
      status: "সক্রিয়",
    };
    setEmployees((prev) => [created, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        action: `নতুন কর্মচারী যোগ: ${created.name} (${created.role})`,
        actor: activeOrg.ownerName,
        time: "এইমাত্র",
      },
      ...prev,
    ]);
    setNewEmpName("");
    setNewEmpPhone("");
    setEmpModalOpen(false);
    toast(`কর্মচারী যোগ হয়েছে: ${created.name}`);
  };

  const toggleModulePerm = (key: string, label: string) => {
    setModulePerms((prev) => {
      const next = !prev[key];
      setAuditLogs((logs) => [
        {
          id: `log-${Date.now()}`,
          action: `${label} অনুমতি ${next ? "চালু" : "বন্ধ"} করা হয়েছে`,
          actor: activeOrg.ownerName,
          time: "এইমাত্র",
        },
        ...logs,
      ]);
      toast(`${label} ${next ? "চালু" : "বন্ধ"} হয়েছে`);
      return { ...prev, [key]: next };
    });
  };

  return (
    <div className="dm-stack-md">
      <div className="dm-page-head">
        <div className="dm-page-head-left">
          <button
            type="button"
            aria-label="হোমে ফিরুন"
            onClick={() => go("/")}
            className="dm-back-btn"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div>
            <h1 className="dm-page-title">অ্যাডমিনিস্ট্রেশন</h1>
            <p className="dm-page-sub">কর্মচারী, রোল, মডিউল অ্যাক্সেস ও শাখা নিয়ন্ত্রণ</p>
          </div>
        </div>
        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => setEmpModalOpen(true)}
            className="dm-btn dm-btn-primary"
          >
            <Plus size={17} aria-hidden="true" />
            <span>কর্মচারী</span>
          </button>
        </div>
      </div>

      {/* 6 Tabs */}
      <div className="dm-tabs" role="tablist" aria-label="অ্যাডমিন সেকশন">
        {[
          { id: "overview" as const, label: "ওভারভিউ" },
          { id: "employees" as const, label: "কর্মী" },
          { id: "roles" as const, label: "রোল" },
          { id: "modules" as const, label: "মডিউল অ্যাক্সেস" },
          { id: "assignments" as const, label: "অ্যাসাইনমেন্ট" },
          { id: "logs" as const, label: "কার্যক্রম" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`dm-tab${tab === item.id ? " is-active" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="dm-stack-md">
          <div className="dm-pills">
            <button
              type="button"
              onClick={() => setEmpModalOpen(true)}
              className="dm-pill"
              style={{ minHeight: 44 }}
            >
              কর্মচারী যোগ
            </button>
            <button
              type="button"
              onClick={() => setTab("roles")}
              className="dm-pill"
              style={{ minHeight: 44 }}
            >
              রোল তৈরি
            </button>
            <button
              type="button"
              onClick={() => setTab("modules")}
              className="dm-pill"
              style={{ minHeight: 44 }}
            >
              মডিউল অ্যাক্সেস
            </button>
            <button
              type="button"
              onClick={() => setTab("assignments")}
              className="dm-pill"
              style={{ minHeight: 44 }}
            >
              শাখা / ওয়্যারহাউস
            </button>
          </div>

          <div className="dm-kpi-grid">
            <div className="dm-kpi-card" style={{ cursor: "default" }}>
              <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
                <Users size={19} />
              </span>
              <span className="dm-kpi-meta">
                <span className="dm-kpi-label">মোট কর্মচারী</span>
                <span className="dm-kpi-value dm-text-emerald">
                  {toBn(employees.length + state.staff.length)}জন
                </span>
              </span>
            </div>
            <div className="dm-kpi-card" style={{ cursor: "default" }}>
              <span className="dm-kpi-icon dm-tone-blue" aria-hidden="true">
                <Shield size={19} />
              </span>
              <span className="dm-kpi-meta">
                <span className="dm-kpi-label">সক্রিয় শাখা</span>
                <span className="dm-kpi-value dm-text-blue">
                  {toBn(state.orgs.length)}টি
                </span>
              </span>
            </div>
          </div>

          <div className="dm-card">
            <h2 className="dm-card-title" style={{ marginBottom: 10 }}>
              সাম্প্রতিক অনুমতি পরিবর্তন
            </h2>
            <div className="dm-feed-list">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="dm-feed-item">
                  <div className="dm-feed-meta">
                    <strong>{log.action}</strong>
                    <small>
                      {log.actor} · {log.time}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "employees" && (
        <div className="dm-table-wrap">
          <table className="dm-table">
            <thead>
              <tr>
                <th>নাম</th>
                <th>রোল</th>
                <th>মোবাইল</th>
                <th>শাখা</th>
                <th>অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <strong>{emp.name}</strong>
                  </td>
                  <td>
                    <span className="dm-badge dm-badge-blue">{emp.role}</span>
                  </td>
                  <td>{emp.phone}</td>
                  <td>{emp.branch}</td>
                  <td>
                    <span className="dm-badge dm-badge-emerald">{emp.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "roles" && (
        <div className="dm-table-wrap">
          <table className="dm-table">
            <thead>
              <tr>
                <th>রোল</th>
                <th>বিবরণ</th>
                <th>অনুমতি স্তর</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>অ্যাডমিন / মালিক</strong>
                </td>
                <td>সব মডিউল, সেটিংস ও ডিলিট অ্যাক্সেস</td>
                <td>
                  <span className="dm-badge dm-badge-emerald">পূর্ণ অ্যাক্সেস</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>ম্যানেজার</strong>
                </td>
                <td>বিক্রি, ক্রয়, স্টক ও রিপোর্ট পরিচালনা</td>
                <td>
                  <span className="dm-badge dm-badge-blue">ব্যবস্থাপনা</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>ক্যাশিয়ার</strong>
                </td>
                <td>POS বিলিং, কালেকশন ও ইনভয়েস প্রিন্ট</td>
                <td>
                  <span className="dm-badge dm-badge-amber">কাউন্টার</span>
                </td>
              </tr>
              {capabilities.showFieldTeam && (
                <tr>
                  <td>
                    <strong>SR / DSR</strong>
                  </td>
                  <td>মাঠের অর্ডার সংগ্রহ ও চালান ডেলিভারি</td>
                  <td>
                    <span className="dm-badge dm-badge-slate">ফিল্ড অ্যাপ</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "modules" && (
        <div className="dm-card dm-form-grid">
          <h2 className="dm-card-title">মডিউল অ্যাক্সেস নিয়ন্ত্রণ</h2>
          {[
            { key: "salesPos", label: "বিক্রয় ও POS বিলিং" },
            { key: "stockPurchase", label: "স্টক ও ক্রয় ব্যবস্থাপনা" },
            { key: "accounting", label: "হিসাব, কালেকশন ও খরচ" },
            { key: "reports", label: "ব্যবসায়িক রিপোর্ট ও লাভ-ক্ষতি" },
            ...(capabilities.showDeliveries
              ? [{ key: "fieldDelivery", label: "অর্ডার ও ডেলিভারি পাইপলাইন" }]
              : []),
            { key: "deleteInvoice", label: "ইনভয়েস মুছে ফেলার অনুমতি" },
          ].map((item) => (
            <div key={item.key} className="dm-toggle-row">
              <span style={{ fontWeight: 700 }}>{item.label}</span>
              <button
                type="button"
                aria-pressed={Boolean(modulePerms[item.key])}
                onClick={() => toggleModulePerm(item.key, item.label)}
                className={`dm-btn dm-btn-sm ${
                  modulePerms[item.key] ? "dm-btn-soft-emerald" : "dm-btn-outline"
                }`}
                style={{ minHeight: 44 }}
              >
                {modulePerms[item.key] ? "চালু" : "বন্ধ"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "assignments" && (
        <div className="dm-table-wrap">
          <table className="dm-table">
            <thead>
              <tr>
                <th>শাখা / প্রতিষ্ঠান</th>
                <th>ঠিকানা</th>
                <th>ডিলার কোড</th>
                <th>ফিল্ড মডিউল</th>
              </tr>
            </thead>
            <tbody>
              {state.orgs.map((org) => (
                <tr key={org.id}>
                  <td>
                    <strong>{org.name}</strong>
                  </td>
                  <td>{org.address}</td>
                  <td>
                    <span className="dm-badge dm-badge-slate">{org.dealerCode}</span>
                  </td>
                  <td>
                    <span
                      className={`dm-badge ${
                        org.hideFieldModules ? "dm-badge-slate" : "dm-badge-emerald"
                      }`}
                    >
                      {org.hideFieldModules ? "স্ট্যান্ডার্ড" : "সক্রিয়"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "logs" && (
        <div className="dm-feed-list">
          {auditLogs.map((log) => (
            <div key={log.id} className="dm-feed-item">
              <div className="dm-feed-meta">
                <strong>{log.action}</strong>
                <small>
                  {log.actor} · {log.time}
                </small>
              </div>
              <span className="dm-badge dm-badge-emerald">নিরাপদ</span>
            </div>
          ))}
        </div>
      )}

      {empModalOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="নতুন কর্মচারী যোগ"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEmpModalOpen(false);
          }}
        >
          <form onSubmit={handleAddEmployee} className="dm-modal">
            <div className="dm-modal-head">
              <h2 className="dm-modal-title">নতুন কর্মচারী যোগ করুন</h2>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setEmpModalOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-field">
                <label htmlFor="dm-emp-name">কর্মচারীর নাম *</label>
                <input
                  id="dm-emp-name"
                  required
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="dm-input"
                />
              </div>
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-emp-role">রোল</label>
                  <select
                    id="dm-emp-role"
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    className="dm-select"
                  >
                    <option value="ক্যাশিয়ার">ক্যাশিয়ার</option>
                    <option value="ম্যানেজার">ম্যানেজার</option>
                    <option value="অ্যাকাউন্ট্যান্ট">অ্যাকাউন্ট্যান্ট</option>
                  </select>
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-emp-phone">মোবাইল</label>
                  <input
                    id="dm-emp-phone"
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="dm-input"
                  />
                </div>
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="dm-btn dm-btn-outline"
              >
                বাতিল
              </button>
              <button type="submit" className="dm-btn dm-btn-primary">
                যোগ করুন
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── 2. MoreScreen ─────────────────────────── */

export function MoreScreen() {
  const { currentUser, unreadNotificationsCount, capabilities, go, logout } = useDemo();

  const modules = useMemo(() => {
    const list: {
      label: string;
      to: string;
      tone: string;
      icon: typeof ShoppingBag;
      show: boolean;
    }[] = [
      {
        label: "সার্ভিসিং",
        to: "/servicing",
        tone: "dm-tone-teal",
        icon: Wrench,
        show: true,
      },
      {
        label:
          unreadNotificationsCount > 0
            ? `নোটিফিকেশন (${toBn(unreadNotificationsCount)})`
            : "নোটিফিকেশন",
        to: "/notifications",
        tone: "dm-tone-amber",
        icon: Bell,
        show: true,
      },
      {
        label: "পণ্য ও স্টক",
        to: "/stock",
        tone: "dm-tone-amber",
        icon: Boxes,
        show: true,
      },
      {
        label: "কাস্টমার",
        to: "/customers",
        tone: "dm-tone-blue",
        icon: Users,
        show: true,
      },
      {
        label: "ক্রয়",
        to: "/purchases",
        tone: "dm-tone-purple",
        icon: ShoppingBag,
        show: true,
      },
      {
        label: "স্টাফ ও বেতন",
        to: "/staff",
        tone: "dm-tone-indigo",
        icon: UserCheck,
        show: true,
      },
      {
        label: "সাপ্লায়ার",
        to: "/suppliers",
        tone: "dm-tone-indigo",
        icon: Building2,
        show: capabilities.showSuppliers,
      },
      {
        label: "কোম্পানি",
        to: "/companies",
        tone: "dm-tone-blue",
        icon: Building2,
        show: true,
      },
      {
        label: "অর্ডার ও ডেলিভারি",
        to: "/deliveries",
        tone: "dm-tone-teal",
        icon: Truck,
        show: capabilities.showDeliveries,
      },
      {
        label: "রিটার্ন",
        to: "/sales/returns",
        tone: "dm-tone-emerald",
        icon: RotateCcw,
        show: true,
      },
      {
        label: "SR / DSR",
        to: "/field-team",
        tone: "dm-tone-emerald",
        icon: UserRound,
        show: capabilities.showFieldTeam,
      },
      {
        label: "হিসাব",
        to: "/money",
        tone: "dm-tone-orange",
        icon: Wallet,
        show: true,
      },
      {
        label: "অ্যাকাউন্টস",
        to: "/accounts",
        tone: "dm-tone-amber",
        icon: CreditCard,
        show: true,
      },
      {
        label: "রিপোর্ট",
        to: "/reports",
        tone: "dm-tone-purple",
        icon: BarChart3,
        show: true,
      },
      {
        label: "অ্যাডমিন",
        to: "/administration",
        tone: "dm-tone-slate",
        icon: Shield,
        show: true,
      },
      {
        label: "সেটিংস",
        to: "/settings",
        tone: "dm-tone-emerald",
        icon: Settings,
        show: true,
      },
    ];
    return list.filter(
      (item) => item.show && isRouteAllowedForRole(item.to, currentUser.role),
    );
  }, [capabilities, currentUser.role, unreadNotificationsCount]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="dm-stack-md">
      <div className="dm-page-head">
        <div className="dm-page-head-left">
          <button
            type="button"
            aria-label="হোমে ফিরুন"
            onClick={() => go("/")}
            className="dm-back-btn"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div>
            <h1 className="dm-page-title">আরও</h1>
            <p className="dm-page-sub">সকল মডিউল ও দ্রুত সহায়তা</p>
          </div>
        </div>
      </div>

      {/* 3-Col Grid of Pastel Module Cards */}
      <div className="dm-tiles-grid">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.label}
              type="button"
              onClick={() => go(mod.to)}
              className="dm-module-tile"
            >
              <span className={`dm-action-icon ${mod.tone}`} aria-hidden="true">
                <Icon size={21} />
              </span>
              <strong>{mod.label}</strong>
            </button>
          );
        })}
      </div>

      {/* যোগাযোগ Card */}
      <div className="dm-card dm-stack-sm">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
            <LayoutGrid size={18} />
          </span>
          <div>
            <h2 className="dm-card-title">{BUSINESS.nameBn}</h2>
            <p className="dm-page-sub">
              {BUSINESS.nameEn} · স্বত্বাধিকারী: {BUSINESS.ownerBn} ({BUSINESS.ownerEn})
            </p>
          </div>
        </div>

        <div className="dm-page-actions">
          <a
            href={waLink(MESSAGES.general)}
            target="_blank"
            rel="noopener noreferrer"
            className="dm-btn dm-btn-primary"
          >
            <MessageCircle size={17} aria-hidden="true" />
            <span>WhatsApp যোগাযোগ</span>
          </a>
          <a href={telLink} className="dm-btn dm-btn-outline">
            <Phone size={16} aria-hidden="true" />
            <span>{CONTACT.phoneDisplay}</span>
          </a>
        </div>
      </div>

      {/* লগ আউট */}
      <button
        type="button"
        onClick={handleLogout}
        className="dm-btn dm-btn-danger dm-btn-full"
      >
        <LogOut size={17} aria-hidden="true" />
        <span>লগআউট করুন</span>
      </button>
    </div>
  );
}

/* ─────────────────────────── 3. SettingsScreen ─────────────────────────── */

type SettingsTab = "business" | "invoice" | "stock" | "account" | "system";

export function SettingsScreen() {
  const {
    mode,
    state,
    activeOrg,
    currentUser,
    go,
    updateBusiness,
    updateSettings,
    updateAdminPassword,
    resetDemo,
    toast,
  } = useDemo();

  const { search } = useRouter();
  const modeMeta = getDemoModeMeta(mode);
  const [tab, setTab] = useState<SettingsTab>(() => {
    const q = new URLSearchParams(search).get("tab");
    if (q === "account" || q === "invoice" || q === "stock" || q === "system") return q;
    return "business";
  });
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  useEffect(() => {
    const q = new URLSearchParams(search).get("tab");
    if (q === "account" || q === "invoice" || q === "stock" || q === "system" || q === "business") {
      setTab(q);
    }
  }, [search]);

  // Admin password change state
  const [adminNewPw, setAdminNewPw] = useState<string>("");
  const [adminConfirmPw, setAdminConfirmPw] = useState<string>("");
  const [showAdminNewPw, setShowAdminNewPw] = useState<boolean>(false);
  const [showAdminConfirmPw, setShowAdminConfirmPw] = useState<boolean>(false);
  const [adminPwError, setAdminPwError] = useState<string | null>(null);
  const [adminPwSuccess, setAdminPwSuccess] = useState<string | null>(null);
  const [savingAdminPw, setSavingAdminPw] = useState<boolean>(false);

  // Business form state
  const [bizName, setBizName] = useState<string>(activeOrg.name);
  const [bizPhone, setBizPhone] = useState<string>(activeOrg.phone);
  const [bizAddress, setBizAddress] = useState<string>(activeOrg.address);
  const [bizEmail, setBizEmail] = useState<string>(activeOrg.email);
  const [bizLicense, setBizLicense] = useState<string>(activeOrg.tradeLicense);
  const [bizBin, setBizBin] = useState<string>(activeOrg.bin);

  // Invoice settings state
  const [invPrefix, setInvPrefix] = useState<string>(state.settings.invoicePrefix);
  const [invFooter, setInvFooter] = useState<string>(state.settings.invoiceFooter);
  const [invTemplate, setInvTemplate] = useState<"classic" | "compact">(
    state.settings.invoiceTemplate,
  );

  useEffect(() => {
    setBizName(activeOrg.name);
    setBizPhone(activeOrg.phone);
    setBizAddress(activeOrg.address);
    setBizEmail(activeOrg.email);
    setBizLicense(activeOrg.tradeLicense);
    setBizBin(activeOrg.bin);
  }, [activeOrg]);

  useEffect(() => {
    setInvPrefix(state.settings.invoicePrefix);
    setInvFooter(state.settings.invoiceFooter);
    setInvTemplate(state.settings.invoiceTemplate);
  }, [state.settings]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard?.writeText(activeOrg.dealerCode);
    } catch {
      // Clipboard may be blocked on insecure origins.
    }
    toast(`ডিলার কোড কপি হয়েছে: ${activeOrg.dealerCode}`);
  };

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) {
      toast("ব্যবসার নাম লিখুন");
      return;
    }
    updateBusiness({
      name: bizName.trim(),
      phone: bizPhone.trim() || CONTACT.phoneDisplay,
      address: bizAddress.trim(),
      email: bizEmail.trim() || CONTACT.email,
      tradeLicense: bizLicense.trim(),
      bin: bizBin.trim(),
    });
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      invoicePrefix: invPrefix.trim() || "INV",
      invoiceFooter: invFooter.trim(),
      invoiceTemplate: invTemplate,
    });
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingAdminPw) return;
    const cleanNew = normalizePasswordInput(adminNewPw);
    const cleanConfirm = normalizePasswordInput(adminConfirmPw);
    if (cleanNew.length < 4) {
      setAdminPwSuccess(null);
      setAdminPwError("নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে");
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setAdminPwSuccess(null);
      setAdminPwError("নতুন পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মেলেনি");
      return;
    }
    setAdminPwError(null);
    setAdminPwSuccess(null);
    setSavingAdminPw(true);
    try {
      const ok = await updateAdminPassword(cleanNew);
      if (ok) {
        setAdminNewPw("");
        setAdminConfirmPw("");
        setAdminPwSuccess("অ্যাডমিনের পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।");
      } else {
        setAdminPwError("পাসওয়ার্ড পরিবর্তন করা যায়নি। আবার চেষ্টা করুন।");
      }
    } finally {
      setSavingAdminPw(false);
    }
  };

  return (
    <div className="dm-stack-md">
      <div className="dm-page-head">
        <div className="dm-page-head-left">
          <button
            type="button"
            aria-label="হোমে ফিরুন"
            onClick={() => go("/")}
            className="dm-back-btn"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div>
            <h1 className="dm-page-title">সেটিংস</h1>
            <p className="dm-page-sub">ব্যবসা, ইনভয়েস, স্টক ও সিস্টেম পছন্দসমূহ</p>
          </div>
        </div>
        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="dm-btn dm-btn-soft-emerald dm-btn-sm"
            style={{ minHeight: 44 }}
          >
            <CircleHelp size={16} aria-hidden="true" />
            <span>সেটিংস ব্যবহার</span>
          </button>
        </div>
      </div>

      {/* 5 Tabs */}
      <div className="dm-tabs" role="tablist" aria-label="সেটিংস ট্যাব">
        {[
          { id: "business" as const, label: "ব্যবসা" },
          { id: "invoice" as const, label: "ইনভয়েস" },
          { id: "stock" as const, label: "স্টক" },
          { id: "account" as const, label: "অ্যাকাউন্ট ও পাসওয়ার্ড" },
          { id: "system" as const, label: "সিস্টেম" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`dm-tab${tab === item.id ? " is-active" : ""}`}
            style={{ minHeight: 44 }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Tab 1: ব্যবসা */}
      {tab === "business" && (
        <form onSubmit={handleSaveBusiness} className="dm-card dm-form-grid">
          <h2 className="dm-card-title">ব্যবসার তথ্য</h2>

          <div className="dm-dealer-code-card" style={{ background: "var(--dm-surface-tint)" }}>
            <div>
              <span className="dm-kpi-label">আপনার কোড</span>
              <div className="dm-dealer-code-value">{activeOrg.dealerCode}</div>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="dm-btn dm-btn-outline dm-btn-sm"
              style={{ minHeight: 44 }}
            >
              <Copy size={15} aria-hidden="true" />
              <span>কপি</span>
            </button>
          </div>

          <div className="dm-field">
            <label htmlFor="dm-set-name">ব্যবসার নাম</label>
            <input
              id="dm-set-name"
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              className="dm-input"
            />
          </div>

          <div className="dm-form-row-2">
            <div className="dm-field">
              <label htmlFor="dm-set-phone">মোবাইল</label>
              <input
                id="dm-set-phone"
                value={bizPhone}
                onChange={(e) => setBizPhone(e.target.value)}
                className="dm-input"
              />
            </div>
            <div className="dm-field">
              <label htmlFor="dm-set-email">ইমেইল</label>
              <input
                id="dm-set-email"
                type="email"
                value={bizEmail}
                onChange={(e) => setBizEmail(e.target.value)}
                className="dm-input"
              />
            </div>
          </div>

          <div className="dm-field">
            <label htmlFor="dm-set-address">ঠিকানা</label>
            <input
              id="dm-set-address"
              value={bizAddress}
              onChange={(e) => setBizAddress(e.target.value)}
              className="dm-input"
            />
          </div>

          <div className="dm-form-row-2">
            <div className="dm-field">
              <label htmlFor="dm-set-tl">ট্রেড লাইসেন্স</label>
              <input
                id="dm-set-tl"
                value={bizLicense}
                onChange={(e) => setBizLicense(e.target.value)}
                className="dm-input"
              />
            </div>
            <div className="dm-field">
              <label htmlFor="dm-set-bin">BIN নম্বর</label>
              <input
                id="dm-set-bin"
                value={bizBin}
                onChange={(e) => setBizBin(e.target.value)}
                className="dm-input"
              />
            </div>
          </div>

          <div>
            <button type="submit" className="dm-btn dm-btn-primary">
              তথ্য সংরক্ষণ করুন
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: ইনভয়েস */}
      {tab === "invoice" && (
        <form onSubmit={handleSaveInvoice} className="dm-card dm-form-grid">
          <h2 className="dm-card-title">ইনভয়েস ও প্রিন্ট সেটিংস</h2>

          <div className="dm-form-row-2">
            <div className="dm-field">
              <label htmlFor="dm-set-prefix">ইনভয়েস প্রিফিক্স</label>
              <input
                id="dm-set-prefix"
                value={invPrefix}
                onChange={(e) => setInvPrefix(e.target.value)}
                className="dm-input"
              />
            </div>
            <div className="dm-field">
              <label htmlFor="dm-set-tpl">ইনভয়েস টেমপ্লেট</label>
              <select
                id="dm-set-tpl"
                value={invTemplate}
                onChange={(e) =>
                  setInvTemplate(e.target.value as "classic" | "compact")
                }
                className="dm-select"
              >
                <option value="classic">ক্লাসিক A4 চালান</option>
                <option value="compact">কম্প্যাক্ট POS রসিদ</option>
              </select>
            </div>
          </div>

          <div className="dm-field">
            <label htmlFor="dm-set-footer">ইনভয়েস ফুটার নোট</label>
            <textarea
              id="dm-set-footer"
              value={invFooter}
              onChange={(e) => setInvFooter(e.target.value)}
              className="dm-textarea"
            />
          </div>

          <div>
            <button type="submit" className="dm-btn dm-btn-primary">
              ইনভয়েস সেটিংস সংরক্ষণ
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: স্টক */}
      {tab === "stock" && (
        <div className="dm-card dm-form-grid">
          <h2 className="dm-card-title">স্টক ও ভ্যাট নিয়ম</h2>

          <label className="dm-toggle-row" style={{ cursor: "pointer" }}>
            <div>
              <strong style={{ display: "block" }}>নেগেটিভ স্টক অনুমোদন</strong>
              <small className="dm-text-muted">
                মজুত শূন্য হলেও POS থেকে বিক্রি সম্পন্ন করা যাবে
              </small>
            </div>
            <input
              type="checkbox"
              checked={state.settings.allowNegativeStock}
              onChange={(e) =>
                updateSettings({ allowNegativeStock: e.target.checked })
              }
              style={{ width: 22, height: 22 }}
            />
          </label>

          <label className="dm-toggle-row" style={{ cursor: "pointer" }}>
            <div>
              <strong style={{ display: "block" }}>VAT UI প্রদর্শন</strong>
              <small className="dm-text-muted">
                ইনভয়েসে ভ্যাট/ট্যাক্স ঘর প্রদর্শন করুন
              </small>
            </div>
            <input
              type="checkbox"
              checked={state.settings.vatEnabled}
              onChange={(e) => updateSettings({ vatEnabled: e.target.checked })}
              style={{ width: 22, height: 22 }}
            />
          </label>
        </div>
      )}

      {/* Tab 4: অ্যাকাউন্ট ও পাসওয়ার্ড */}
      {tab === "account" && (
        <form onSubmit={handleChangeAdminPassword} className="dm-card dm-form-grid">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
              <KeyRound size={19} />
            </span>
            <div>
              <h2 className="dm-card-title">অ্যাডমিন অ্যাকাউন্ট ও পাসওয়ার্ড পরিবর্তন</h2>
              <p className="dm-page-sub">
                {currentUser.name} ({currentUser.phone}) · নিরাপত্তা পাসওয়ার্ড আপডেট করুন
              </p>
            </div>
          </div>

          {adminPwError && (
            <div
              role="alert"
              className="dm-card dm-card-pad-sm"
              style={{
                background: "#fef2f2",
                borderColor: "#fecaca",
                color: "#991b1b",
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              {adminPwError}
            </div>
          )}

          {adminPwSuccess && (
            <div
              role="status"
              className="dm-card dm-card-pad-sm"
              style={{
                background: "#ecfdf5",
                borderColor: "#a7f3d0",
                color: "#065f46",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={17} aria-hidden="true" />
              <span>{adminPwSuccess}</span>
            </div>
          )}

          <div className="dm-field">
            <label htmlFor="dm-admin-new-pw">নতুন পাসওয়ার্ড *</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                id="dm-admin-new-pw"
                type={showAdminNewPw ? "text" : "password"}
                required
                minLength={4}
                value={adminNewPw}
                onChange={(e) => {
                  setAdminNewPw(e.target.value);
                  if (adminPwError) setAdminPwError(null);
                  if (adminPwSuccess) setAdminPwSuccess(null);
                }}
                placeholder="কমপক্ষে ৪ অক্ষরের নতুন পাসওয়ার্ড"
                className="dm-input"
                style={{ flex: 1, minHeight: 44 }}
              />
              <button
                type="button"
                aria-label={showAdminNewPw ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                onClick={() => setShowAdminNewPw((prev) => !prev)}
                className="dm-icon-btn"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                {showAdminNewPw ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className="dm-field">
            <label htmlFor="dm-admin-confirm-pw">নতুন পাসওয়ার্ড নিশ্চিত করুন *</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                id="dm-admin-confirm-pw"
                type={showAdminConfirmPw ? "text" : "password"}
                required
                minLength={4}
                value={adminConfirmPw}
                onChange={(e) => {
                  setAdminConfirmPw(e.target.value);
                  if (adminPwError) setAdminPwError(null);
                  if (adminPwSuccess) setAdminPwSuccess(null);
                }}
                placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                className="dm-input"
                style={{ flex: 1, minHeight: 44 }}
              />
              <button
                type="button"
                aria-label={showAdminConfirmPw ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                onClick={() => setShowAdminConfirmPw((prev) => !prev)}
                className="dm-icon-btn"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                {showAdminConfirmPw ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <small className="dm-text-muted">
            পাসওয়ার্ড পরিবর্তন করলে সার্ভারে নিরাপদভাবে হ্যাশ করে সংরক্ষণ করা হবে। বর্তমান সেশন চালু থাকবে এবং অন্য সেশনগুলো লগআউট হয়ে যাবে।
          </small>

          <div>
            <button
              type="submit"
              disabled={savingAdminPw}
              className="dm-btn dm-btn-primary"
              style={{ minHeight: 44 }}
            >
              <KeyRound size={16} aria-hidden="true" />
              <span>{savingAdminPw ? "সংরক্ষণ হচ্ছে…" : "অ্যাডমিন পাসওয়ার্ড পরিবর্তন করুন"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 5: সিস্টেম */}
      {tab === "system" && (
        <div className="dm-card dm-form-grid">
          <h2 className="dm-card-title">সিস্টেম তথ্য</h2>

          <div className="dm-feed-list">
            <div className="dm-feed-item">
              <span>মুদ্রা</span>
              <strong>
                {GLOBAL_POLICY.currencyCode} {GLOBAL_POLICY.currencySymbol}
              </strong>
            </div>
            <div className="dm-feed-item">
              <span>ভাষা</span>
              <strong>বাংলা</strong>
            </div>
            <div className="dm-feed-item">
              <span>ব্যবসার ধরন</span>
              <strong>{modeMeta.businessTypeBn}</strong>
            </div>
            <div className="dm-feed-item">
              <span>স্বত্বাধিকারী</span>
              <strong>{BUSINESS.ownerBn}</strong>
            </div>
          </div>

          <div
            className="dm-card dm-card-pad-sm"
            style={{
              background: "var(--dm-amber-50)",
              borderColor: "var(--dm-amber-200)",
            }}
          >
            <strong style={{ display: "block", color: "#92400e" }}>
              ডাটা রিসেট
            </strong>
            <p className="dm-page-sub" style={{ color: "#78350f", marginBottom: 10 }}>
              বর্তমান সেশনের সকল পরিবর্তন মুছে প্রাথমিক ডাটায় ফিরে যান।
            </p>
            <button
              type="button"
              onClick={resetDemo}
              className="dm-btn dm-btn-dark"
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span>ডাটা রিসেট করুন</span>
            </button>
          </div>
        </div>
      )}

      {helpOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="সেটিংস ব্যবহার"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHelpOpen(false);
          }}
        >
          <div className="dm-modal">
            <div className="dm-modal-head">
              <h2 className="dm-modal-title">সেটিংস ব্যবহার নির্দেশিকা</h2>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setHelpOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <p>১. ব্যবসার নাম বা তথ্য আপডেট করলে সাথে সাথে উপরের হেডার ও ইনভয়েসে দেখা যাবে।</p>
              <p>২. যেকোনো সময় সিস্টেম ট্যাব থেকে `ডাটা রিসেট` করে শুরুতে ফিরতে পারবেন।</p>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="dm-btn dm-btn-primary"
              >
                বুঝেছি
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
