import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  House,
  KeyRound,
  LayoutGrid,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Truck,
  UserCheck,
  UserRound,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BrandMark } from "../../components/BrandMark";
import { PWAInstallButton } from "../../components/PWAInstallButton";
import { isRouteAllowedForRole } from "../../lib/auth";
import { BUSINESS } from "../../lib/config";
import {
  formatDateBn,
  formatMoneyBn,
  formatNumberBn,
  getDemoModeMeta,
  toBn,
} from "../../lib/global";
import { Link, useRouter } from "../../lib/router";
import { buildDemoRouteHref, useDemo } from "./demoStore";
import "./demo.css";

interface NavDef {
  label: string;
  subRoute: string;
  icon: typeof House;
  badgeCount?: number;
}

function isRouteActive(subPath: string, subRoute: string): boolean {
  const cleanSub = subPath === "" ? "/" : subPath;
  if (subRoute === "/") return cleanSub === "/";
  return cleanSub === subRoute || cleanSub.startsWith(`${subRoute}/`);
}

export function DemoShell({ children }: { children: ReactNode }) {
  const {
    mode,
    role,
    basePath,
    subPath,
    go,
    state,
    activeOrg,
    currentUser,
    unreadNotificationsCount,
    capabilities,
    setOrgId,
    resetDemo,
    logout,
    toast,
    toastMessage,
  } = useDemo();
  const isAdmin = currentUser.role === "admin";

  const { search } = useRouter();
  const urlStaffId = useMemo(
    () => new URLSearchParams(search).get("staff")?.trim() || undefined,
    [search],
  );

  const modeMeta = getDemoModeMeta(mode);

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchKind, setSearchKind] = useState<string>("সব");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileWrapRef = useRef<HTMLDivElement>(null);

  const mainNav = useMemo<NavDef[]>(() => {
    const list: NavDef[] = [
      { label: "হোম", subRoute: "/", icon: House },
      { label: "বিক্রি", subRoute: "/sales", icon: ShoppingCart },
      { label: "ক্রয়", subRoute: "/purchases", icon: ShoppingBag },
      { label: "স্টক", subRoute: "/stock", icon: Boxes },
      { label: "সার্ভিসিং", subRoute: "/servicing", icon: Wrench },
      {
        label: "নোটিফিকেশন",
        subRoute: "/notifications",
        icon: Bell,
        badgeCount: unreadNotificationsCount,
      },
      { label: "স্টাফ", subRoute: "/staff", icon: UserCheck },
      { label: "কাস্টমার", subRoute: "/customers", icon: Users },
    ];
    if (capabilities.showSuppliers) {
      list.push({ label: "সাপ্লায়ার", subRoute: "/suppliers", icon: Building2 });
    }
    return list.filter((item) => isRouteAllowedForRole(item.subRoute, currentUser.role));
  }, [capabilities.showSuppliers, currentUser.role, unreadNotificationsCount]);

  const managementNav = useMemo<NavDef[]>(() => {
    const list: NavDef[] = [
      { label: "হিসাব", subRoute: "/money", icon: Wallet },
      { label: "রিপোর্ট", subRoute: "/reports", icon: BarChart3 },
    ];
    if (capabilities.showDeliveries) {
      list.push({ label: "অর্ডার ও ডেলিভারি", subRoute: "/deliveries", icon: Truck });
    }
    if (capabilities.showFieldTeam) {
      list.push({ label: "ফিল্ড টিম", subRoute: "/field-team", icon: UserRound });
    }
    list.push({ label: "অ্যাডমিন", subRoute: "/administration", icon: Shield });
    list.push({ label: "আরও", subRoute: "/more", icon: LayoutGrid });
    return list.filter((item) => isRouteAllowedForRole(item.subRoute, currentUser.role));
  }, [capabilities.showDeliveries, capabilities.showFieldTeam, currentUser.role]);

  const bottomTabs = useMemo<NavDef[]>(() => {
    if (isAdmin) {
      return [
        { label: "হোম", subRoute: "/", icon: House },
        { label: "বিক্রি", subRoute: "/sales", icon: ShoppingCart },
        { label: "সার্ভিসিং", subRoute: "/servicing", icon: Wrench },
        { label: "স্টাফ", subRoute: "/staff", icon: UserCheck },
        { label: "আরও", subRoute: "/more", icon: LayoutGrid },
      ];
    }
    return [
      { label: "হোম", subRoute: "/", icon: House },
      { label: "বিক্রি", subRoute: "/sales", icon: ShoppingCart },
      { label: "সার্ভিসিং", subRoute: "/servicing", icon: Wrench },
      {
        label: "নোটিফিকেশন",
        subRoute: "/notifications",
        icon: Bell,
        badgeCount: unreadNotificationsCount,
      },
      { label: "আরও", subRoute: "/more", icon: LayoutGrid },
    ];
  }, [isAdmin, unreadNotificationsCount]);

  useEffect(() => {
    if (!searchOpen) return;
    setSearchTerm("");
    setSearchKind("সব");
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [searchOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
        return;
      }
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        Boolean(target?.isContentEditable);
      if (editable) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setProfileOpen(false);
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (profileWrapRef.current && !profileWrapRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [profileOpen]);

  const searchMatches = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];

    const customers = state.customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.mobile.toLowerCase().includes(q) ||
          c.area.toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map((c) => ({
        key: `cust-${c.id}`,
        kind: "কাস্টমার",
        title: c.name,
        sub: `${c.mobile} · ${c.area}`,
        amount: c.due,
        to: "/customers",
      }));

    const invoices = state.invoices
      .filter(
        (inv) =>
          inv.number.toLowerCase().includes(q) ||
          inv.partyName.toLowerCase().includes(q) ||
          inv.partyMobile.toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map((inv) => ({
        key: `inv-${inv.id}`,
        kind: "ইনভয়েস",
        title: inv.number,
        sub: `${inv.partyName} · ${formatDateBn(inv.date)}`,
        amount: inv.total,
        to: "/sales",
      }));

    const products = state.products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map((p) => ({
        key: `prd-${p.id}`,
        kind: "পণ্য",
        title: p.name,
        sub: `${p.sku} · স্টক ${formatNumberBn(p.paidStock + p.freeStock)} ${p.unit}`,
        amount: p.saleRate,
        to: "/stock",
      }));

    const orders = capabilities.showDeliveries
      ? state.orders
          .filter(
            (o) =>
              o.number.toLowerCase().includes(q) ||
              o.challanNo.toLowerCase().includes(q) ||
              o.customerName.toLowerCase().includes(q),
          )
          .slice(0, 3)
          .map((o) => ({
            key: `ord-${o.id}`,
            kind: "অর্ডার",
            title: o.number,
            sub: `${o.customerName} · ${o.challanNo}`,
            amount: o.total,
            to: "/deliveries",
          }))
      : [];

    const all = [...customers, ...invoices, ...orders, ...products];
    if (searchKind === "সব") return all.slice(0, 12);
    return all.filter((item) => item.kind === searchKind).slice(0, 12);
  }, [searchTerm, searchKind, state.customers, state.invoices, state.products, state.orders, capabilities.showDeliveries]);

  const searchKindOptions = capabilities.showDeliveries
    ? (["সব", "কাস্টমার", "ইনভয়েস", "অর্ডার", "পণ্য"] as const)
    : (["সব", "কাস্টমার", "ইনভয়েস", "পণ্য"] as const);

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
  };

  const navLinkTo = (subRoute: string) =>
    buildDemoRouteHref(basePath, subRoute, mode, role, urlStaffId);

  return (
    <div className="dm-root">

      <div className="dm-shell">
        <aside
          aria-label="সাইডবার নেভিগেশন"
          data-navigation={collapsed ? "collapsed" : "expanded"}
          className={`dm-sidebar${collapsed ? " is-collapsed" : ""}`}
        >
          <div className="dm-sidebar-head">
            <Link to={navLinkTo("/")} className="dm-sidebar-brand">
              <BrandMark size={38} />
              {!collapsed && <span className="dm-sidebar-title">{modeMeta.brandTitle}</span>}
            </Link>
            <button
              type="button"
              aria-label={collapsed ? "সাইডবার বড় করুন" : "সাইডবার ছোট করুন"}
              onClick={() => setCollapsed((c) => !c)}
              className="dm-sidebar-toggle"
            >
              {collapsed ? (
                <ChevronRight size={16} aria-hidden="true" />
              ) : (
                <ChevronLeft size={16} aria-hidden="true" />
              )}
            </button>
          </div>

          <nav aria-label="প্রধান মেনু" data-sidebar-nav="true" className="dm-sidebar-nav">
            <div className="dm-nav-group">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(subPath, item.subRoute);
                return (
                  <Link
                    key={item.subRoute}
                    to={navLinkTo(item.subRoute)}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`dm-nav-item${active ? " is-active" : ""}`}
                  >
                    {active && <span className="dm-nav-bar" aria-hidden="true" />}
                    <span className="dm-nav-icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    {!collapsed && (
                      <span
                        className="dm-nav-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flex: 1,
                        }}
                      >
                        <span>{item.label}</span>
                        {(item.badgeCount ?? 0) > 0 && (
                          <span className="dm-badge dm-badge-rose" style={{ fontSize: 11, padding: "1px 6px" }}>
                            {toBn(item.badgeCount ?? 0)}
                          </span>
                        )}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="dm-nav-divider">
              {!collapsed ? (
                <p className="dm-nav-group-label">ম্যানেজমেন্ট</p>
              ) : (
                <span className="dm-nav-divider-line" aria-hidden="true" />
              )}
              <div className="dm-nav-group">
                {managementNav.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(subPath, item.subRoute);
                  return (
                    <Link
                      key={item.subRoute}
                      to={navLinkTo(item.subRoute)}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`dm-nav-item${active ? " is-active" : ""}`}
                    >
                      {active && <span className="dm-nav-bar" aria-hidden="true" />}
                      <span className="dm-nav-icon" aria-hidden="true">
                        <Icon size={18} />
                      </span>
                      {!collapsed && <span className="dm-nav-label">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="dm-sidebar-footer" data-sidebar-footer="true">
            {isAdmin && (
              <button
                type="button"
                onClick={() => go("/settings")}
                aria-label="সেটিংস"
                title={collapsed ? "সেটিংস" : undefined}
                className="dm-footer-action"
              >
                <Settings size={16} aria-hidden="true" />
                {!collapsed && <span>সেটিংস</span>}
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              aria-label="লগআউট"
              title={collapsed ? "লগআউট" : undefined}
              className="dm-footer-action is-danger"
            >
              <LogOut size={16} aria-hidden="true" />
              {!collapsed && <span>লগআউট</span>}
            </button>
          </div>
        </aside>

        <div className="dm-main-col">
          <header className="dm-topbar">
            <div className="dm-topbar-org">
              <Link to={navLinkTo("/")} className="dm-mobile-logo" aria-label={activeOrg.name}>
                <BrandMark size={34} />
              </Link>
              <div className="dm-org-meta">
                <p className="dm-org-title">{activeOrg.name}</p>
                <p className="dm-org-address">
                  <MapPin size={13} aria-hidden="true" />
                  <span>{BUSINESS.nameEn} · {activeOrg.ownerName}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="খুঁজুন"
              className="dm-topbar-search"
            >
              <span className="dm-topbar-search-inner">
                <Search size={16} aria-hidden="true" />
                <span>খুঁজুন…</span>
              </span>
              <kbd className="dm-kbd" aria-hidden="true">
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>

            <div className="dm-topbar-right">
              {state.orgs.length > 1 && (
                <select
                  aria-label="প্রতিষ্ঠান পরিবর্তন"
                  value={activeOrg.id}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="dm-org-select"
                >
                  {state.orgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              )}

              <PWAInstallButton variant="topbar" onInstalledToast={toast} />

              <button
                type="button"
                aria-label={
                  unreadNotificationsCount > 0
                    ? `নোটিফিকেশন (${toBn(unreadNotificationsCount)}টি অপঠিত)`
                    : "নোটিফিকেশন"
                }
                onClick={() => go("/notifications")}
                className="dm-icon-btn"
                style={{ position: "relative", minWidth: 40, minHeight: 40 }}
              >
                <Bell size={18} aria-hidden="true" />
                {unreadNotificationsCount > 0 && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      minWidth: 18,
                      height: 18,
                      padding: "0 4px",
                      borderRadius: 999,
                      background: "var(--dm-rose)",
                      color: "#fff",
                      fontSize: 10.5,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {toBn(unreadNotificationsCount)}
                  </span>
                )}
              </button>

              <button
                type="button"
                aria-label="খুঁজুন"
                onClick={() => setSearchOpen(true)}
                className="dm-mobile-search-btn"
              >
                <Search size={19} aria-hidden="true" />
              </button>

              <div className="dm-profile-wrap" ref={profileWrapRef}>
                <button
                  type="button"
                  aria-label="প্রোফাইল মেনু"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  onClick={() => setProfileOpen((p) => !p)}
                  className="dm-avatar-btn"
                >
                  <span>{activeOrg.initials}</span>
                  <span className="dm-avatar-dot" aria-hidden="true" />
                </button>

                {profileOpen && (
                  <div className="dm-profile-menu" role="menu" aria-label="প্রোফাইল অপশন">
                    <div className="dm-profile-head">
                      <strong>{currentUser.name}</strong>
                      <span>
                        {currentUser.phone} ·{" "}
                        {currentUser.role === "admin"
                          ? "অ্যাডমিন"
                          : currentUser.role === "servicing"
                            ? "সার্ভিসিং বিভাগ"
                            : "স্টাফ"}
                      </span>
                    </div>

                    {state.orgs.length > 1 && (
                      <div className="dm-profile-org">
                        <label htmlFor="dm-mobile-org-switch">প্রতিষ্ঠান</label>
                        <select
                          id="dm-mobile-org-switch"
                          value={activeOrg.id}
                          onChange={(e) => {
                            setOrgId(e.target.value);
                            setProfileOpen(false);
                          }}
                          className="dm-select"
                        >
                          {state.orgs.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      className="dm-profile-item"
                      onClick={() => {
                        setProfileOpen(false);
                        go("/notifications");
                      }}
                    >
                      <Bell size={16} aria-hidden="true" />
                      <span>
                        নোটিফিকেশন{" "}
                        {unreadNotificationsCount > 0
                          ? `(${toBn(unreadNotificationsCount)})`
                          : ""}
                      </span>
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          className="dm-profile-item"
                          style={{ minHeight: 44 }}
                          onClick={() => {
                            setProfileOpen(false);
                            go("/settings?tab=account");
                          }}
                        >
                          <KeyRound size={16} aria-hidden="true" />
                          <span>পাসওয়ার্ড পরিবর্তন</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          className="dm-profile-item"
                          style={{ minHeight: 44 }}
                          onClick={() => {
                            setProfileOpen(false);
                            go("/settings");
                          }}
                        >
                          <Settings size={16} aria-hidden="true" />
                          <span>সেটিংস</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          className="dm-profile-item"
                          style={{ minHeight: 44 }}
                          onClick={() => {
                            setProfileOpen(false);
                            resetDemo();
                          }}
                        >
                          <RefreshCw size={16} aria-hidden="true" />
                          <span>ডাটা রিসেট করুন</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      className="dm-profile-item"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} aria-hidden="true" />
                      <span>লগআউট</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="dm-content">{children}</main>
        </div>
      </div>

      <nav aria-label="মোবাইল নেভিগেশন" className="dm-bottom-nav">
        <div className="dm-bottom-grid">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isRouteActive(subPath, tab.subRoute);
            return (
              <Link
                key={tab.subRoute}
                to={navLinkTo(tab.subRoute)}
                aria-current={active ? "page" : undefined}
                className={`dm-bottom-tab${active ? " is-active" : ""}`}
              >
                {active && <span className="dm-bottom-tab-bar" aria-hidden="true" />}
                <span className="dm-bottom-tab-icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="dm-bottom-tab-label">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {searchOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="গ্লোবাল সার্চ"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false);
          }}
        >
          <div className="dm-modal dm-modal-lg">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">খুঁজুন</h2>
                <p className="dm-modal-sub">কাস্টমার, ইনভয়েস, পণ্য বা অর্ডার</p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setSearchOpen(false)}
                className="dm-modal-close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="dm-modal-body">
              <input
                ref={searchInputRef}
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="নাম, মোবাইল, ইনভয়েস নম্বর, SKU বা অর্ডার লিখুন…"
                className="dm-input"
              />

              <div className="dm-pills dm-pills-scroll" style={{ marginTop: 12 }}>
                {searchKindOptions.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={searchKind === kind}
                    onClick={() => setSearchKind(kind)}
                    className={`dm-pill${searchKind === kind ? " is-active" : ""}`}
                  >
                    {kind}
                  </button>
                ))}
              </div>

              <div className="dm-search-results">
                {searchMatches.length === 0 ? (
                  <p className="dm-empty-inline">
                    {searchTerm.trim()
                      ? "কোনো ফলাফল পাওয়া যায়নি"
                      : "খুঁজতে উপরের বক্সে নাম বা নম্বর লিখুন…"}
                  </p>
                ) : (
                  searchMatches.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        go(item.to);
                      }}
                      className="dm-search-result"
                    >
                      <span className="dm-badge dm-badge-emerald">{item.kind}</span>
                      <span className="dm-search-result-meta">
                        <strong>{item.title}</strong>
                        <small>{item.sub}</small>
                      </span>
                      <span className="dm-search-result-amount">
                        {formatMoneyBn(item.amount)}
                      </span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="dm-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
