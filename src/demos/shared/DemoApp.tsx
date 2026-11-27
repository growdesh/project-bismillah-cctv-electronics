import { ShieldAlert } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Seo } from "../../components/Seo";
import { isRouteAllowedForRole } from "../../lib/auth";
import { getDemoModeMeta } from "../../lib/global";
import { DemoShell } from "./DemoShell";
import { useDemo } from "./demoStore";
import type { DemoRole } from "./demoTypes";
import {
  AccountsScreen,
  AdminScreen,
  CompaniesScreen,
  CustomersScreen,
  DashboardScreen,
  MoneyScreen,
  MoreScreen,
  NotificationsScreen,
  PosTradeScreen,
  PurchasesScreen,
  ReportsScreen,
  SalesReturnsScreen,
  SalesScreen,
  ServicingScreen,
  SettingsScreen,
  StaffScreen,
  StockScreen,
  SuppliersScreen,
} from "./screens";

function normalizeSubRoute(subPath: string): string {
  const clean = subPath.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

export function DemoApp({
  officeRoutes,
  renderField,
}: {
  officeRoutes?: Readonly<Record<string, ReactNode>>;
  renderField?: (route: string, role: Exclude<DemoRole, "admin">) => ReactNode;
}) {
  const { mode, role, basePath, subPath, activeOrg, currentUser, go } = useDemo();
  const route = normalizeSubRoute(subPath);
  const meta = getDemoModeMeta(mode);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.querySelector(".dm-main-col")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [route, role]);

  if (role !== "admin" && renderField) return renderField(route, role);

  const isAllowed = isRouteAllowedForRole(route, currentUser.role);

  const extraScreen = officeRoutes && Object.hasOwn(officeRoutes, route) ? officeRoutes[route] : undefined;
  let screen = extraScreen ?? <DashboardScreen />;

  if (!isAllowed) {
    screen = (
      <div className="dm-stack-md">
        <div className="dm-card dm-empty-state" role="alert">
          <ShieldAlert size={36} className="dm-text-rose" aria-hidden="true" />
          <strong>অনুমতি সংরক্ষিত (Access Denied)</strong>
          <span>
            এই পেজ এবং আর্থিক/প্রশাসনিক তথ্য শুধুমাত্র অ্যাডমিনের জন্য সংরক্ষিত। আপনার অ্যাকাউন্ট থেকে সার্ভিসিং এবং অনুমোদিত বিক্রয় কার্যক্রম পরিচালনা করা যাবে।
          </span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => go("/servicing")}
              className="dm-btn dm-btn-primary"
            >
              সার্ভিসিং বিভাগে যান
            </button>
            <button
              type="button"
              onClick={() => go("/")}
              className="dm-btn dm-btn-outline"
            >
              ড্যাশবোর্ডে ফিরুন
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    switch (route) {
      case "/":
        screen = <DashboardScreen />;
        break;
      case "/sales":
        screen = <SalesScreen />;
        break;
      case "/sales/new":
        screen = <PosTradeScreen key="sale" kind="sale" />;
        break;
      case "/sales/returns":
      case "/sales/returns/new":
        screen = <SalesReturnsScreen />;
        break;
      case "/purchases":
        screen = <PurchasesScreen />;
        break;
      case "/purchases/new":
        screen = <PosTradeScreen key="purchase" kind="purchase" />;
        break;
      case "/stock":
        screen = <StockScreen />;
        break;
      case "/servicing":
        screen = <ServicingScreen />;
        break;
      case "/notifications":
        screen = <NotificationsScreen />;
        break;
      case "/staff":
        screen = <StaffScreen />;
        break;
      case "/customers":
        screen = <CustomersScreen />;
        break;
      case "/suppliers":
        screen = <SuppliersScreen />;
        break;
      case "/companies":
        screen = <CompaniesScreen />;
        break;
      case "/money":
        screen = <MoneyScreen />;
        break;
      case "/accounts":
        screen = <AccountsScreen />;
        break;
      case "/reports":
        screen = <ReportsScreen />;
        break;
      case "/administration":
        screen = <AdminScreen />;
        break;
      case "/more":
        screen = <MoreScreen />;
        break;
      case "/settings":
        screen = <SettingsScreen />;
        break;
    }
  }

  return (
    <>
      <Seo
        title={`${activeOrg.name} — ${meta.labelBn}`}
        description={`${activeOrg.name} — ${meta.businessTypeBn}`}
        path={basePath || "/"}
        noIndex
      />
      <DemoShell>{screen}</DemoShell>
    </>
  );
}
