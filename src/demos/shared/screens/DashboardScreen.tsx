import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Package,
  Plus,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isRouteAllowedForRole } from "../../../lib/auth";
import {
  formatDateBn,
  formatMoneyBn,
  getDemoModeMeta,
  toBn,
  type DemoMode,
} from "../../../lib/global";
import { useDemo } from "../demoStore";

interface QuickActionDef {
  label: string;
  to: string;
  icon: typeof ShoppingCart;
  tone: string;
  requires?: "suppliers" | "deliveries" | "fieldTeam";
}

const QUICK_ACTIONS: QuickActionDef[] = [
  {
    label: "নতুন বিক্রি",
    to: "/sales/new",
    icon: ShoppingCart,
    tone: "dm-tone-emerald",
  },
  {
    label: "নতুন ক্রয়",
    to: "/purchases/new",
    icon: ShoppingBag,
    tone: "dm-tone-purple",
  },
  {
    label: "স্টক",
    to: "/stock",
    icon: Boxes,
    tone: "dm-tone-amber",
  },
  {
    label: "কাস্টমার",
    to: "/customers",
    icon: Users,
    tone: "dm-tone-blue",
  },
  {
    label: "সার্ভিসিং",
    to: "/servicing",
    icon: Wrench,
    tone: "dm-tone-teal",
  },
  {
    label: "নোটিফিকেশন",
    to: "/notifications",
    icon: Bell,
    tone: "dm-tone-amber",
  },
  {
    label: "স্টাফ ও বেতন",
    to: "/staff",
    icon: UserCheck,
    tone: "dm-tone-indigo",
  },
  {
    label: "সেলস রিটার্ন",
    to: "/sales/returns",
    icon: RotateCcw,
    tone: "dm-tone-teal",
  },
  {
    label: "রিপোর্ট",
    to: "/reports",
    icon: BarChart3,
    tone: "dm-tone-purple",
  },
  {
    label: "কালেকশন",
    to: "/money",
    icon: Wallet,
    tone: "dm-tone-emerald",
  },
  {
    label: "পেমেন্ট",
    to: "/money",
    icon: CreditCard,
    tone: "dm-tone-rose",
  },
  {
    label: "খরচ",
    to: "/money",
    icon: TrendingDown,
    tone: "dm-tone-orange",
  },
  {
    label: "সাপ্লায়ার",
    to: "/suppliers",
    icon: Building2,
    tone: "dm-tone-slate",
    requires: "suppliers",
  },
  {
    label: "ডেলিভারি",
    to: "/deliveries",
    icon: Truck,
    tone: "dm-tone-teal",
    requires: "deliveries",
  },
  {
    label: "ফিল্ড টিম",
    to: "/field-team",
    icon: Smartphone,
    tone: "dm-tone-indigo",
    requires: "fieldTeam",
  },
];

const MODE_ACTIONS: Record<DemoMode, readonly string[]> = {
  "retail-pos": ["/sales/new", "/servicing", "/notifications", "/staff", "/stock", "/customers"],
};

function localDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DashboardScreen() {
  const {
    mode,
    state,
    activeOrg,
    currentUser,
    visibleServiceJobs,
    unreadNotificationsCount,
    capabilities,
    go,
  } = useDemo();
  const isAdmin = currentUser.role === "admin";
  const modeMeta = getDemoModeMeta(mode);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [activePointIdx, setActivePointIdx] = useState<number | null>(null);
  const [showAllActions, setShowAllActions] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const todayIso = useMemo(() => new Date().toISOString(), []);
  const todayKey = useMemo(() => localDayKey(todayIso), [todayIso]);

  const stats = useMemo(() => {
    const todayInvoices = state.invoices.filter((inv) => localDayKey(inv.date) === todayKey);
    const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const todayPaid = todayInvoices.reduce((sum, inv) => sum + inv.paid, 0);
    const todayPurchases = state.purchases.filter((inv) => localDayKey(inv.date) === todayKey);
    const purchaseTotal = todayPurchases.reduce((sum, inv) => sum + inv.total, 0);
    const supplierPayable = state.suppliers.reduce((sum, supplier) => sum + supplier.due, 0);

    const totalDue = state.customers.reduce((sum, c) => sum + c.due, 0);
    const dueCustomerCount = state.customers.filter((c) => c.due > 0).length;

    const stockValue = state.products.reduce(
      (sum, p) => sum + Math.max(0, p.paidStock + p.freeStock) * p.purchaseRate,
      0,
    );
    const freeStockCount = state.products.filter((p) => p.freeStock > 0).length;

    const lowStockCount = state.products.filter(
      (p) => p.paidStock + p.freeStock <= p.minStock,
    ).length;

    const pendingApprovalCount = capabilities.showDeliveries
      ? state.orders.filter((o) => o.status === "submitted").length
      : 0;
    const unassignedDeliveryCount = capabilities.showDeliveries
      ? state.orders.filter((o) => o.status === "unassigned").length
      : 0;
    const inTransitCount = capabilities.showDeliveries
      ? state.orders.filter((o) => o.status === "in_transit").length
      : 0;

    return {
      todaySales,
      todayPaid,
      todayInvoiceCount: todayInvoices.length,
      purchaseTotal,
      todayPurchaseCount: todayPurchases.length,
      supplierPayable,
      supplierDueCount: state.suppliers.filter((supplier) => supplier.due > 0).length,
      totalDue,
      dueCustomerCount,
      stockValue,
      productCount: state.products.length,
      freeStockCount,
      lowStockCount,
      pendingApprovalCount,
      unassignedDeliveryCount,
      inTransitCount,
    };
  }, [state, todayKey, capabilities.showDeliveries]);

  const visibleActions = useMemo(() => {
    const allowed = QUICK_ACTIONS.filter((tile) => {
      if (!isRouteAllowedForRole(tile.to, currentUser.role)) return false;
      if (tile.requires === "suppliers") return capabilities.showSuppliers;
      if (tile.requires === "deliveries") return capabilities.showDeliveries;
      if (tile.requires === "fieldTeam") return capabilities.showFieldTeam;
      return true;
    });
    const preferred = MODE_ACTIONS[mode];
    return [...preferred.flatMap((route) => allowed.filter((item) => item.to === route)),
      ...allowed.filter((item) => !preferred.includes(item.to))];
  }, [capabilities, mode, currentUser.role]);

  const renderedActions = useMemo(() => {
    if (!isMobile || showAllActions || visibleActions.length <= 6) {
      return visibleActions;
    }
    return visibleActions.slice(0, 6);
  }, [isMobile, showAllActions, visibleActions]);

  const chartData = useMemo(() => {
    const weekdaysBn = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
    const byDay = new Map<string, number>();
    const countByDay = new Map<string, number>();

    for (const inv of state.invoices) {
      const k = localDayKey(inv.date);
      byDay.set(k, (byDay.get(k) ?? 0) + inv.total);
      countByDay.set(k, (countByDay.get(k) ?? 0) + 1);
    }

    const anchor = new Date();
    const weekPoints = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() - (6 - idx));
      const key = localDayKey(d.toISOString());
      return {
        label: weekdaysBn[d.getDay()],
        fullLabel: formatDateBn(d.toISOString()),
        value: byDay.get(key) ?? 0,
        count: countByDay.get(key) ?? 0,
      };
    });

    const monthPoints = [0, 1, 2, 3].map((bucket) => {
      let sum = 0;
      let count = 0;
      const endOffset = (3 - bucket) * 7;
      const startOffset = endOffset + 6;
      for (let back = startOffset; back >= endOffset; back--) {
        const d = new Date(anchor);
        d.setDate(anchor.getDate() - back);
        const key = localDayKey(d.toISOString());
        sum += byDay.get(key) ?? 0;
        count += countByDay.get(key) ?? 0;
      }
      return {
        label: `সপ্তাহ ${toBn(bucket + 1)}`,
        fullLabel: `সপ্তাহ ${toBn(bucket + 1)} (৭ দিন)`,
        value: sum,
        count,
      };
    });

    const series = period === "week" ? weekPoints : monthPoints;
    const periodTotal = series.reduce((sum, p) => sum + p.value, 0);
    const invoiceCount = series.reduce((sum, p) => sum + p.count, 0);
    const dailyAvg = Math.round(periodTotal / (period === "week" ? 7 : 28));

    const rawMax = Math.max(...series.map((s) => s.value), 0);
    const maxVal = rawMax > 0 ? Math.ceil(rawMax / 1000) * 1000 : 1000;

    const width = 640;
    const height = 196;
    const padX = 88;
    const padY = 28;

    const points = series.map((item, i) => {
      const x = padX + (i * (width - padX - 24)) / Math.max(1, series.length - 1);
      const y = height - padY - (item.value / maxVal) * (height - padY * 2);
      return { ...item, x, y };
    });

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

    return {
      points,
      linePath,
      areaPath,
      width,
      height,
      padX,
      padY,
      maxVal,
      periodTotal,
      dailyAvg,
      invoiceCount,
    };
  }, [period, state.invoices]);

  const checklistRows = useMemo(() => {
    const rows: {
      id: string;
      label: string;
      sub: string;
      count: number;
      to: string;
      tone: string;
      badgeCls: string;
      icon: typeof Clock;
    }[] = [];

    if (capabilities.showDeliveries && stats.pendingApprovalCount > 0) {
      rows.push({
        id: "approval",
        label: "অনুমোদনের অপেক্ষায়",
        sub: "মাঠের SR অর্ডার যাচাই বাকি",
        count: stats.pendingApprovalCount,
        to: "/deliveries",
        tone: "dm-tone-amber",
        badgeCls: "dm-badge dm-badge-amber",
        icon: Clock,
      });
    }

    if (capabilities.showDeliveries && stats.unassignedDeliveryCount > 0) {
      rows.push({
        id: "assign",
        label: "ডেলিভারি অ্যাসাইন",
        sub: "DSR ও চালান নির্ধারণ বাকি",
        count: stats.unassignedDeliveryCount,
        to: "/deliveries",
        tone: "dm-tone-blue",
        badgeCls: "dm-badge dm-badge-blue",
        icon: Truck,
      });
    }

    if (stats.lowStockCount > 0) {
      rows.push({
        id: "low-stock",
        label: "লো স্টক",
        sub: "মজুত সতর্কতা স্তরে আছে",
        count: stats.lowStockCount,
        to: "/stock",
        tone: "dm-tone-rose",
        badgeCls: "dm-badge dm-badge-rose",
        icon: AlertTriangle,
      });
    }

    return rows;
  }, [capabilities.showDeliveries, stats]);

  const totalPendingTasks =
    stats.pendingApprovalCount + stats.unassignedDeliveryCount + stats.lowStockCount;

  const activePoint =
    activePointIdx !== null && chartData.points[activePointIdx]
      ? chartData.points[activePointIdx]
      : null;

  const sales = { label: "আজকের বিক্রি", value: formatMoneyBn(stats.todaySales), detail: `${toBn(stats.todayInvoiceCount)}টি ইনভয়েস`, to: "/sales", icon: TrendingUp, tone: "emerald" };
  const receivables = { label: "ক্রেতার কাছে পাওনা", value: formatMoneyBn(stats.totalDue), detail: `${toBn(stats.dueCustomerCount)}জন কাস্টমার`, to: "/customers", icon: Wallet, tone: "amber" };
  const stockValue = { label: "মজুতের ক্রয়মূল্য", value: formatMoneyBn(stats.stockValue), detail: `${toBn(stats.productCount)} ধরনের পণ্য`, to: "/stock", icon: Package, tone: "blue" };

  const metrics = [
    { ...sales, label: "আজকের কাউন্টার বিক্রি" },
    { label: "বিক্রি থেকে পরিশোধ", value: formatMoneyBn(stats.todayPaid), detail: "আজকের বিল থেকে আদায়", to: "/sales", icon: CreditCard, tone: "emerald" },
    { label: "কমে আসা মজুত", value: toBn(stats.lowStockCount), detail: "ন্যূনতম মজুতে বা তার নিচে", to: "/stock", icon: AlertTriangle, tone: "rose" },
    receivables.value !== "৳ ০" ? receivables : stockValue,
  ];

  if (!isAdmin) {
    const ongoingOrPendingJobs = visibleServiceJobs.filter(
      (j) => j.status === "pending" || j.status === "ongoing",
    );
    const completedJobs = visibleServiceJobs.filter(
      (j) => j.status === "completed" || j.status === "delivered",
    );

    const roleMetrics = [
      {
        label: "চলমান ও অপেক্ষমাণ কাজ",
        value: `${toBn(ongoingOrPendingJobs.length)}টি`,
        detail: "আপনার অ্যাসাইনকৃত সার্ভিসিং টাস্ক",
        to: "/servicing",
        icon: Wrench,
        tone: "emerald",
      },
      {
        label: "সম্পন্ন সার্ভিসিং",
        value: `${toBn(completedJobs.length)}টি`,
        detail: "ডেলিভারি ও সম্পন্ন কাজ",
        to: "/servicing",
        icon: CheckCircle2,
        tone: "blue",
      },
      {
        label: "অপঠিত নোটিফিকেশন",
        value: `${toBn(unreadNotificationsCount)}টি`,
        detail: "নতুন অ্যাসাইনমেন্ট ও ডেডলাইন",
        to: "/notifications",
        icon: Bell,
        tone: "amber",
      },
      {
        label: "স্টকে উপলব্ধ পণ্য",
        value: `${toBn(stats.productCount)}টি`,
        detail: "সার্ভিসিং যন্ত্রাংশ ও পণ্য",
        to: "/stock",
        icon: Package,
        tone: "teal",
      },
    ];

    return (
      <div className="dm-stack-md">
        <header className="dm-greeting">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h1>
                {currentUser.role === "servicing"
                  ? "সার্ভিসিং বিভাগ ড্যাশবোর্ড"
                  : "স্টাফ সার্ভিসিং ড্যাশবোর্ড"}
              </h1>
              <p>
                {currentUser.name} ({currentUser.phone}) · {activeOrg.name} · {formatDateBn(todayIso)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => go("/servicing")}
              className="dm-btn dm-btn-primary"
            >
              <Plus size={17} aria-hidden="true" />
              <span>নতুন সার্ভিসিং এন্ট্রি</span>
            </button>
          </div>
        </header>

        <section className="dm-kpi-grid" aria-label="সার্ভিসিং কাজের সূচক">
          {roleMetrics.map(({ label, value, detail, to, icon: Icon, tone }) => (
            <button key={label} type="button" onClick={() => go(to)} className="dm-kpi-card">
              <span className={`dm-kpi-icon dm-tone-${tone}`} aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className="dm-kpi-meta">
                <span className="dm-kpi-label">{label}</span>
                <span className="dm-kpi-value">{value}</span>
                <span className="dm-kpi-sub">{detail}</span>
              </span>
            </button>
          ))}
        </section>

        <section aria-label="দ্রুত কাজ">
          <div className="dm-section-head">
            <h2>অনুমোদিত মডিউলসমূহ</h2>
          </div>
          <div className="dm-actions-grid" data-count={renderedActions.length}>
            {renderedActions.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => go(item.to)}
                  className={`dm-action-tile${index === 0 ? " is-featured" : ""}`}
                >
                  <span className={`dm-action-icon ${item.tone}`} aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="dm-action-label">{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="dm-card" aria-label="আপনার অ্যাসাইনকৃত সার্ভিসিং কাজ">
          <div className="dm-card-head">
            <div>
              <h2 className="dm-card-title">আপনার অ্যাসাইনকৃত সার্ভিসিং কাজ</h2>
              <p className="dm-page-sub">
                শুধুমাত্র আপনার জন্য নির্ধারিত বা আপনার বিভাগের সার্ভিসিং তালিকা
              </p>
            </div>
            <button
              type="button"
              onClick={() => go("/servicing")}
              className="dm-section-link"
              style={{ minHeight: 44 }}
            >
              সব দেখুন ({toBn(visibleServiceJobs.length)})
            </button>
          </div>

          {visibleServiceJobs.length === 0 ? (
            <div className="dm-empty-state">
              <Wrench size={30} aria-hidden="true" />
              <strong>কোনো অ্যাসাইনকৃত সার্ভিসিং কাজ নেই</strong>
              <span>নতুন সার্ভিসিং এন্ট্রি যোগ করতে সার্ভিসিং পেজে যান</span>
            </div>
          ) : (
            <div className="dm-checklist">
              {visibleServiceJobs.slice(0, 6).map((job) => (
                <div
                  key={job.id}
                  className="dm-check-row"
                  style={{ cursor: "default", flexWrap: "wrap", gap: 10 }}
                >
                  <span className="dm-check-row-left">
                    <span className="dm-kpi-icon dm-tone-teal" aria-hidden="true">
                      <Wrench size={17} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: "block" }}>
                        {job.jobNo} — {job.title}
                      </strong>
                      <small className="dm-text-muted" style={{ display: "block" }}>
                        কাস্টমার: {job.customerName} ({job.customerMobile}) · ডিভাইস: {job.deviceName || "—"}
                      </small>
                      <small className="dm-text-muted" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <Calendar size={12} aria-hidden="true" />
                        <span>
                          এন্ট্রি: {formatDateBn(job.entryDate)} ({job.entryTime}) · চার্জ: {formatMoneyBn(job.serviceCharge)}
                        </span>
                      </small>
                    </span>
                  </span>
                  <span className="dm-table-actions">
                    <button
                      type="button"
                      onClick={() => go(`/servicing?jobId=${encodeURIComponent(job.id)}`)}
                      className="dm-btn dm-btn-outline dm-btn-sm"
                      style={{ minHeight: 40 }}
                    >
                      বিস্তারিত
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        go(
                          `/sales/new?serviceJobId=${encodeURIComponent(job.id)}&customer=${encodeURIComponent(job.customerName)}`,
                        )
                      }
                      className="dm-btn dm-btn-primary dm-btn-sm"
                      style={{ minHeight: 40 }}
                    >
                      <ShoppingCart size={14} aria-hidden="true" />
                      <span>বিক্রয় করুন</span>
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="dm-stack-md">
      <header className="dm-greeting">
        <h1>{modeMeta.labelBn} ড্যাশবোর্ড</h1>
        <p>{activeOrg.name} · {formatDateBn(todayIso)}</p>
      </header>

      <section className="dm-kpi-grid" aria-label="মূল ব্যবসার সূচক">
        {metrics.map(({ label, value, detail, to, icon: Icon, tone }) => (
          <button key={label} type="button" onClick={() => go(to)} className="dm-kpi-card">
            <span className={`dm-kpi-icon dm-tone-${tone}`} aria-hidden="true"><Icon size={20} /></span>
            <span className="dm-kpi-meta">
              <span className="dm-kpi-label">{label}</span>
              <span className="dm-kpi-value">{value}</span>
              <span className="dm-kpi-sub">{detail}</span>
            </span>
          </button>
        ))}
      </section>

      {/* Quick Actions Grid */}
      <section aria-label="দ্রুত কাজ">
        <div className="dm-section-head">
          <h2>দ্রুত কাজ</h2>
          {isMobile && visibleActions.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllActions((v) => !v)}
              className="dm-section-link"
              style={{ minHeight: 44 }}
            >
              {showAllActions
                ? "কম দেখুন"
                : `আরও ${toBn(visibleActions.length - 6)}টি দেখুন`}
            </button>
          )}
        </div>

        <div className="dm-actions-grid" data-count={renderedActions.length}>
          {renderedActions.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => go(item.to)}
                className={`dm-action-tile${index === 0 ? " is-featured" : ""}`}
              >
                <span className={`dm-action-icon ${item.tone}`} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="dm-action-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bottom Split: Sales Trend Chart + Today's Tasks */}
      <section className="dm-dash-split" aria-label="বিক্রির প্রবণতা ও আজকের কাজ">
        {/* Left: Smooth Cubic-Bezier Sales Chart */}
        <div className="dm-card">
          <div className="dm-card-head">
            <div>
              <h2 className="dm-card-title">বিক্রির প্রবণতা</h2>
              <p className="dm-page-sub">সাম্প্রতিক বিক্রয় কার্যক্রমের গ্রাফ</p>
            </div>
            <select
              aria-label="বিক্রির প্রবণতা সময়কাল"
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value as "week" | "month");
                setActivePointIdx(null);
              }}
              className="dm-select"
              style={{ width: "auto", minWidth: 128 }}
            >
              <option value="week">এই সপ্তাহ</option>
              <option value="month">এই মাস</option>
            </select>
          </div>

          <div className="dm-chart-wrap">
            <svg
              viewBox={`0 0 ${chartData.width} ${chartData.height}`}
              className="dm-chart-svg"
              role="img"
              aria-label="বিক্রির প্রবণতা চার্ট"
            >
              <defs>
                <linearGradient id="dmSalesTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                const y = chartData.padY + ratio * (chartData.height - chartData.padY * 2);
                return (
                  <line
                    key={idx}
                    x1={chartData.padX - 6}
                    y1={y}
                    x2={chartData.width - 14}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                );
              })}

              <text
                x={chartData.padX - 10}
                y={chartData.padY + 4}
                textAnchor="end"
                fill="#475569"
                fontSize="11.5"
                fontWeight="700"
              >
                {formatMoneyBn(chartData.maxVal)}
              </text>
              <text
                x={chartData.padX - 10}
                y={chartData.height / 2 + 4}
                textAnchor="end"
                fill="#475569"
                fontSize="11.5"
                fontWeight="700"
              >
                {formatMoneyBn(Math.round(chartData.maxVal / 2))}
              </text>
              <text
                x={chartData.padX - 10}
                y={chartData.height - chartData.padY + 4}
                textAnchor="end"
                fill="#475569"
                fontSize="11.5"
                fontWeight="700"
              >
                ৳ ০
              </text>

              <path d={chartData.areaPath} fill="url(#dmSalesTrendGrad)" />

              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={chartData.padY}
                  x2={activePoint.x}
                  y2={chartData.height - chartData.padY}
                  stroke="#0f172a"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              <path
                d={chartData.linePath}
                fill="none"
                stroke="#059669"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {chartData.points.map((pt, idx) => {
                const isHovered = activePointIdx === idx;
                const tipX = Math.min(
                  chartData.width - 118,
                  Math.max(chartData.padX, pt.x - 56),
                );
                const tipY = Math.max(4, pt.y - 34);

                return (
                  <g
                    key={pt.label}
                    onMouseEnter={() => setActivePointIdx(idx)}
                    onMouseLeave={() => setActivePointIdx(null)}
                    onClick={() =>
                      setActivePointIdx((cur) => (cur === idx ? null : idx))
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <circle cx={pt.x} cy={pt.y} r={18} fill="transparent" />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6.5 : 4.2}
                      fill="#ffffff"
                      stroke="#059669"
                      strokeWidth={isHovered ? 3.2 : 2.5}
                    />
                    {isHovered && (
                      <g>
                        <rect
                          x={tipX}
                          y={tipY}
                          width={112}
                          height={25}
                          rx={8}
                          fill="#0f172a"
                        />
                        <text
                          x={tipX + 56}
                          y={tipY + 16.5}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11.5"
                          fontWeight="700"
                        >
                          {formatMoneyBn(pt.value)}
                        </text>
                      </g>
                    )}
                    <text
                      x={pt.x}
                      y={chartData.height - 5}
                      textAnchor="middle"
                      fill={isHovered ? "#0f172a" : "#64748b"}
                      fontSize="11.5"
                      fontWeight="700"
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {activePoint && (
            <div className="dm-chart-tooltip">
              <span>{activePoint.fullLabel}:</span>
              <span>{formatMoneyBn(activePoint.value)}</span>
              <span>({toBn(activePoint.count)}টি ইনভয়েস)</span>
            </div>
          )}

          <div className="dm-chart-stats">
            <span>
              {period === "week" ? "সপ্তাহের মোট:" : "মাসের মোট:"}{" "}
              <strong>{formatMoneyBn(chartData.periodTotal)}</strong>
            </span>
            <span>
              দৈনিক গড়: <strong>{formatMoneyBn(chartData.dailyAvg)}</strong>
            </span>
            <span>
              মোট ইনভয়েস: <strong>{toBn(chartData.invoiceCount)}টি</strong>
            </span>
          </div>
        </div>

        {/* Right: Today's Tasks */}
        <div className="dm-card">
          <div className="dm-card-head">
            <div>
              <h2 className="dm-card-title">আজকের কাজ</h2>
              <p className="dm-page-sub">পেন্ডিং ও জরুরি করণীয়</p>
            </div>
            <span className="dm-badge dm-badge-emerald">
              {toBn(totalPendingTasks)}টি কাজ
            </span>
          </div>

          {checklistRows.length === 0 ? (
            <div className="dm-empty-state">
              <CheckCircle2 size={32} className="dm-text-emerald" aria-hidden="true" />
              <p>আজ কোনো জরুরি কাজ নেই</p>
            </div>
          ) : (
            <div className="dm-checklist">
              {checklistRows.map((row) => {
                const RowIcon = row.icon;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => go(row.to)}
                    className="dm-check-row"
                  >
                    <span className="dm-check-row-left">
                      <span className={`dm-kpi-icon ${row.tone}`} aria-hidden="true">
                        <RowIcon size={17} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block" }}>{row.label}</span>
                        <small className="dm-text-muted" style={{ fontWeight: 500 }}>
                          {row.sub}
                        </small>
                      </span>
                    </span>
                    <span className="dm-table-actions">
                      <span className={row.badgeCls}>{toBn(row.count)}টি</span>
                      <ChevronRight size={16} className="dm-text-muted" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
