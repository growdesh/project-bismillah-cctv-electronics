import {
  ArrowLeft,
  Building2,
  CircleHelp,
  Eye,
  FileText,
  Filter,
  FolderKanban,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatDateBn,
  formatMoneyBn,
  formatNumberBn,
  parseAmountInput,
  toBn,
} from "../../../lib/global";
import { useDemo } from "../demoStore";
import type { DemoCustomer, DemoInvoice } from "../demoTypes";

function invoiceBadge(status: DemoInvoice["status"]) {
  if (status === "paid") return { label: "পরিশোধিত", cls: "dm-badge dm-badge-emerald" };
  if (status === "partial") return { label: "আংশিক", cls: "dm-badge dm-badge-amber" };
  return { label: "বাকি", cls: "dm-badge dm-badge-rose" };
}

/* ─────────────────────────── 1. SalesScreen ─────────────────────────── */

export function SalesScreen() {
  const { state, activeOrg, currentUser, visibleServiceJobs, go, toast } = useDemo();
  const isAdmin = currentUser.role === "admin";
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | DemoInvoice["status"]>("all");
  const [filtersOpen, setFiltersOpen] = useState<boolean>(true);
  const [selectedInvoice, setSelectedInvoice] = useState<DemoInvoice | null>(null);

  const accessibleInvoices = useMemo(() => {
    if (isAdmin) return state.invoices;
    const allowedJobIds = new Set(visibleServiceJobs.map((j) => j.id));
    const allowedInvoiceIds = new Set(
      visibleServiceJobs.flatMap((j) => j.linkedInvoiceIds),
    );
    return state.invoices.filter(
      (inv) =>
        (inv.serviceJobId && allowedJobIds.has(inv.serviceJobId)) ||
        allowedInvoiceIds.has(inv.id) ||
        (inv.serviceCharge ?? 0) > 0,
    );
  }, [isAdmin, state.invoices, visibleServiceJobs, currentUser.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accessibleInvoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.number.toLowerCase().includes(q) ||
        inv.partyName.toLowerCase().includes(q) ||
        inv.partyMobile.toLowerCase().includes(q)
      );
    });
  }, [accessibleInvoices, search, statusFilter]);

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
            <h1 className="dm-page-title">{isAdmin ? "ইনভয়েস" : "সার্ভিসিং বিক্রয় ইনভয়েস"}</h1>
            <p className="dm-page-sub">
              {isAdmin
                ? `মোট ${toBn(accessibleInvoices.length)}টি বিক্রয় ইনভয়েস`
                : `আপনার সার্ভিসিং কাজের সাথে যুক্ত ${toBn(accessibleInvoices.length)}টি ইনভয়েস`}
            </p>
          </div>
        </div>
        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => go("/sales/new")}
            className="dm-btn dm-btn-primary"
          >
            <Plus size={17} aria-hidden="true" />
            <span>নতুন বিক্রি</span>
          </button>
        </div>
      </div>

      <div className="dm-search-row">
        <div className="dm-search-box">
          <Search size={17} className="dm-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ইনভয়েস নং, কাস্টমার বা মোবাইল খুঁজুন…"
            className="dm-search-input"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((f) => !f)}
          className="dm-btn dm-btn-outline"
        >
          <Filter size={16} aria-hidden="true" />
          <span>ফিল্টার</span>
        </button>
      </div>

      {filtersOpen && (
        <div className="dm-pills dm-pills-scroll" role="group" aria-label="ইনভয়েস ফিল্টার">
          {[
            { id: "all" as const, label: "সব" },
            { id: "paid" as const, label: "পরিশোধিত" },
            { id: "partial" as const, label: "আংশিক" },
            { id: "due" as const, label: "বাকি" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              aria-pressed={statusFilter === pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`dm-pill${statusFilter === pill.id ? " is-active" : ""}`}
              style={{ minHeight: 44 }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}

      <div className="dm-table-wrap">
        <table className="dm-table">
          <thead>
            <tr>
              <th>ইনভয়েস</th>
              <th>কাস্টমার</th>
              <th>মোট</th>
              <th>জমা</th>
              <th>বাকি</th>
              <th>কার্যক্রম</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="dm-empty-inline">
                  কোনো ইনভয়েস পাওয়া যায়নি
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const badge = invoiceBadge(inv.status);
                return (
                  <tr key={inv.id}>
                    <td>
                      <strong className="dm-text-emerald" style={{ display: "block" }}>
                        {inv.number}
                      </strong>
                      <small className="dm-text-muted">{inv.timeLabel}</small>
                    </td>
                    <td>
                      <strong style={{ display: "block" }}>{inv.partyName}</strong>
                      <small className="dm-text-muted">{inv.partyMobile}</small>
                    </td>
                    <td>
                      <strong>{formatMoneyBn(inv.total)}</strong>
                    </td>
                    <td className="dm-text-emerald" style={{ fontWeight: 700 }}>
                      {formatMoneyBn(inv.paid)}
                    </td>
                    <td>
                      <span
                        className={inv.due > 0 ? "dm-text-rose" : "dm-text-muted"}
                        style={{ fontWeight: 700 }}
                      >
                        {formatMoneyBn(inv.due)}
                      </span>
                      <div style={{ marginTop: 2 }}>
                        <span className={badge.cls}>{badge.label}</span>
                      </div>
                    </td>
                    <td>
                      <div className="dm-table-actions">
                        <button
                          type="button"
                          aria-label={`${inv.number} দেখুন`}
                          onClick={() => setSelectedInvoice(inv)}
                          className="dm-icon-btn"
                          style={{ minWidth: 44, minHeight: 44 }}
                        >
                          <Eye size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            toast(`${inv.number} PDF প্রিভিউ খোলা হয়েছে`);
                          }}
                          className="dm-btn dm-btn-outline dm-btn-sm"
                          style={{ minHeight: 44 }}
                        >
                          <FileText size={14} aria-hidden="true" />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`${inv.number} আরও অপশন`}
                          onClick={() => setSelectedInvoice(inv)}
                          className="dm-icon-btn"
                          style={{ minWidth: 44, minHeight: 44 }}
                        >
                          <MoreHorizontal size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="ইনভয়েস বিস্তারিত"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedInvoice(null);
          }}
        >
          <div className="dm-modal dm-modal-lg">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">{selectedInvoice.number}</h2>
                <p className="dm-modal-sub">
                  {activeOrg.name} · {selectedInvoice.timeLabel}
                </p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setSelectedInvoice(null)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="dm-modal-body">
              <div
                className="dm-card dm-card-pad-sm"
                style={{ background: "var(--dm-surface-tint)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <strong style={{ display: "block" }}>কাস্টমার: {selectedInvoice.partyName}</strong>
                    <span className="dm-text-muted">মোবাইল: {selectedInvoice.partyMobile}</span>
                  </div>
                  <span className={invoiceBadge(selectedInvoice.status).cls}>
                    {invoiceBadge(selectedInvoice.status).label}
                  </span>
                </div>
              </div>

              <div className="dm-table-wrap">
                <table className="dm-table">
                  <thead>
                    <tr>
                      <th>পণ্য</th>
                      <th>পরিমাণ</th>
                      <th>দর</th>
                      <th>মোট</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item, idx) => (
                        <tr key={`${item.productId}-${idx}`}>
                          <td>{item.name}</td>
                          <td>
                            {toBn(item.qty)} {item.unit}
                          </td>
                          <td>{formatMoneyBn(item.rate)}</td>
                          <td>
                            <strong>{formatMoneyBn(item.total)}</strong>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>মোট {toBn(selectedInvoice.itemsCount)}টি পণ্য</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="dm-cart-summary">
                {(selectedInvoice.serviceCharge ?? 0) > 0 && (
                  <div className="dm-summary-row">
                    <span>সার্ভিসিং চার্জ</span>
                    <strong>{formatMoneyBn(selectedInvoice.serviceCharge ?? 0)}</strong>
                  </div>
                )}
                {(selectedInvoice.discount ?? 0) > 0 && (
                  <div className="dm-summary-row">
                    <span>ছাড়</span>
                    <strong className="dm-text-emerald">
                      − {formatMoneyBn(selectedInvoice.discount ?? 0)}
                    </strong>
                  </div>
                )}
                <div className="dm-summary-row is-total">
                  <span>সর্বমোট</span>
                  <span>{formatMoneyBn(selectedInvoice.total)}</span>
                </div>
                <div className="dm-summary-row">
                  <span>জমা</span>
                  <strong className="dm-text-emerald">{formatMoneyBn(selectedInvoice.paid)}</strong>
                </div>
                <div className="dm-summary-row">
                  <span>বাকি</span>
                  <strong className={selectedInvoice.due > 0 ? "dm-text-rose" : "dm-text-emerald"}>
                    {formatMoneyBn(selectedInvoice.due)}
                  </strong>
                </div>
              </div>

              <p className="dm-text-muted" style={{ fontSize: 12 }}>
                {state.settings.invoiceFooter}
              </p>
            </div>

            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => {
                  toast(`${selectedInvoice.number} প্রিন্ট / PDF প্রস্তুত`);
                  if (typeof window !== "undefined") window.print();
                }}
                className="dm-btn dm-btn-outline"
              >
                <Printer size={16} aria-hidden="true" />
                <span>প্রিন্ট / PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="dm-btn dm-btn-primary"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── 2. PurchasesScreen ─────────────────────────── */

export function PurchasesScreen() {
  const { state, go } = useDemo();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | DemoInvoice["status"]>("all");
  const [selectedPurchase, setSelectedPurchase] = useState<DemoInvoice | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.purchases.filter((pur) => {
      if (statusFilter !== "all" && pur.status !== statusFilter) return false;
      if (!q) return true;
      return (
        pur.number.toLowerCase().includes(q) ||
        pur.partyName.toLowerCase().includes(q) ||
        pur.partyMobile.toLowerCase().includes(q)
      );
    });
  }, [state.purchases, search, statusFilter]);

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
            <h1 className="dm-page-title">ক্রয়</h1>
            <p className="dm-page-sub">মোট {toBn(state.purchases.length)}টি ক্রয় চালান</p>
          </div>
        </div>
        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => go("/purchases/new")}
            className="dm-btn dm-btn-blue"
          >
            <Plus size={17} aria-hidden="true" />
            <span>নতুন কেনাকাটা</span>
          </button>
        </div>
      </div>

      <div className="dm-search-row">
        <div className="dm-search-box">
          <Search size={17} className="dm-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নম্বর / সাপ্লায়ার / মোবাইল খুঁজুন…"
            className="dm-search-input"
          />
        </div>
      </div>

      <div className="dm-pills dm-pills-scroll" role="group" aria-label="ক্রয় ফিল্টার">
        {[
          { id: "all" as const, label: "সব" },
          { id: "paid" as const, label: "পরিশোধিত" },
          { id: "partial" as const, label: "আংশিক" },
          { id: "due" as const, label: "দেনা" },
        ].map((pill) => (
          <button
            key={pill.id}
            type="button"
            aria-pressed={statusFilter === pill.id}
            onClick={() => setStatusFilter(pill.id)}
            className={`dm-pill${statusFilter === pill.id ? " is-active" : ""}`}
            style={{ minHeight: 44 }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="dm-section-head" style={{ marginTop: 4 }}>
        <h2>সাম্প্রতিক ক্রয়</h2>
      </div>

      <div className="dm-table-wrap">
        <table className="dm-table">
          <thead>
            <tr>
              <th>ক্রয়</th>
              <th>সাপ্লায়ার</th>
              <th>মোট</th>
              <th>জমা</th>
              <th>দেনা</th>
              <th>কার্যক্রম</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="dm-empty-inline">
                  কোনো ক্রয় রেকর্ড পাওয়া যায়নি
                </td>
              </tr>
            ) : (
              filtered.map((pur) => (
                <tr key={pur.id}>
                  <td>
                    <strong className="dm-text-emerald" style={{ display: "block" }}>
                      {pur.number}
                    </strong>
                    <small className="dm-text-muted">{pur.timeLabel}</small>
                  </td>
                  <td>
                    <strong style={{ display: "block" }}>{pur.partyName}</strong>
                    <small className="dm-text-muted">{pur.partyMobile}</small>
                  </td>
                  <td>
                    <strong>{formatMoneyBn(pur.total)}</strong>
                  </td>
                  <td className="dm-text-emerald" style={{ fontWeight: 700 }}>
                    {formatMoneyBn(pur.paid)}
                  </td>
                  <td
                    className={pur.due > 0 ? "dm-text-rose" : "dm-text-muted"}
                    style={{ fontWeight: 700 }}
                  >
                    {formatMoneyBn(pur.due)}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedPurchase(pur)}
                      className="dm-section-link"
                      style={{ minHeight: 44 }}
                    >
                      বিস্তারিত
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedPurchase && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="ক্রয় বিস্তারিত"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPurchase(null);
          }}
        >
          <div className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">{selectedPurchase.number}</h2>
                <p className="dm-modal-sub">
                  সাপ্লায়ার: {selectedPurchase.partyName} · {selectedPurchase.timeLabel}
                </p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setSelectedPurchase(null)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              {selectedPurchase.items?.map((item, i) => (
                <div key={i} className="dm-feed-item">
                  <div className="dm-feed-meta">
                    <strong>{item.name}</strong>
                    <small>
                      {toBn(item.qty)} {item.unit} × {formatMoneyBn(item.rate)}
                    </small>
                  </div>
                  <strong>{formatMoneyBn(item.total)}</strong>
                </div>
              ))}
              <div className="dm-cart-summary">
                <div className="dm-summary-row is-total">
                  <span>মোট বিল</span>
                  <span>{formatMoneyBn(selectedPurchase.total)}</span>
                </div>
                <div className="dm-summary-row">
                  <span>পরিশোধিত</span>
                  <strong className="dm-text-emerald">{formatMoneyBn(selectedPurchase.paid)}</strong>
                </div>
                <div className="dm-summary-row">
                  <span>দেনা</span>
                  <strong className={selectedPurchase.due > 0 ? "dm-text-rose" : "dm-text-emerald"}>
                    {formatMoneyBn(selectedPurchase.due)}
                  </strong>
                </div>
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="dm-btn dm-btn-primary"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── 3. StockScreen ─────────────────────────── */

export function StockScreen() {
  const {
    state,
    currentUser,
    capabilities,
    go,
    addProduct,
    addCategory,
    renameCategory,
    deleteCategory,
    updateProductCategory,
    toast,
  } = useDemo();
  const isAdmin = currentUser.role === "admin";
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<string>("সব");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [companyFilter, setCompanyFilter] = useState<string>("সব");
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [catModalOpen, setCatModalOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState<string>("");

  const [name, setName] = useState<string>("");
  const [catInput, setCatInput] = useState<string>(
    () => state.categories[0] ?? "সাধারণ",
  );
  const [customNewCatInProduct, setCustomNewCatInProduct] = useState<string>("");
  const [companyInput, setCompanyInput] = useState<string>("");
  const [unitInput, setUnitInput] = useState<string>("পিস");
  const [buyRate, setBuyRate] = useState<string>("");
  const [sellRate, setSellRate] = useState<string>("");
  const [paidQty, setPaidQty] = useState<string>("25");
  const [freeQty, setFreeQty] = useState<string>("0");

  const managedCategories = useMemo(() => {
    const s = new Set<string>(state.categories);
    for (const p of state.products) {
      if (p.category) s.add(p.category);
    }
    return Array.from(s);
  }, [state.categories, state.products]);

  const categories = useMemo(() => ["সব", ...managedCategories], [managedCategories]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of state.products) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return map;
  }, [state.products]);

  const companies = useMemo(() => {
    const s = new Set(state.products.map((p) => p.company).filter(Boolean));
    return ["সব", ...Array.from(s)];
  }, [state.products]);

  const kpis = useMemo(() => {
    const paidStock = state.products.reduce((sum, p) => sum + Math.max(0, p.paidStock), 0);
    const freeStock = state.products.reduce((sum, p) => sum + Math.max(0, p.freeStock), 0);
    const totalValue = state.products.reduce(
      (sum, p) => sum + Math.max(0, p.paidStock + p.freeStock) * p.purchaseRate,
      0,
    );
    const saleValue = state.products.reduce(
      (sum, p) => sum + Math.max(0, p.paidStock + p.freeStock) * p.saleRate,
      0,
    );
    const profit = Math.max(0, saleValue - totalValue);
    return {
      companyCount: Math.max(companies.length - 1, state.companies.length),
      productCount: state.products.length,
      paidStock,
      freeStock,
      totalValue,
      saleValue,
      profit,
    };
  }, [state.products, state.companies.length, companies.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.products.filter((p) => {
      const total = p.paidStock + p.freeStock;
      if (category !== "সব" && p.category !== category) return false;
      if (companyFilter !== "সব" && p.company !== companyFilter) return false;
      if (stockFilter === "low" && !(total > 0 && total <= p.minStock)) return false;
      if (stockFilter === "out" && total > 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q)
      );
    });
  }, [state.products, search, category, companyFilter, stockFilter]);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("পণ্যের নাম দিন");
      return;
    }
    const resolvedCategory =
      catInput === "__new__"
        ? customNewCatInProduct.trim() || "সাধারণ"
        : catInput || managedCategories[0] || "সাধারণ";
    addProduct({
      name,
      category: resolvedCategory,
      company: companyInput || state.companies[0]?.name || "নিজস্ব",
      unit: unitInput || "পিস",
      purchaseRate: Math.max(0, parseAmountInput(buyRate)),
      saleRate: Math.max(0, parseAmountInput(sellRate)),
      paidStock: Math.max(0, Math.round(parseAmountInput(paidQty))),
      freeStock: capabilities.showPaidFreeStock
        ? Math.max(0, Math.round(parseAmountInput(freeQty)))
        : 0,
    });
    setName("");
    setCatInput(managedCategories[0] ?? "সাধারণ");
    setCustomNewCatInProduct("");
    setCompanyInput("");
    setBuyRate("");
    setSellRate("");
    setPaidQty("25");
    setFreeQty("0");
    setAddModalOpen(false);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast("ক্যাটাগরির নাম লিখুন");
      return;
    }
    addCategory(newCategoryName);
    setNewCategoryName("");
  };

  const handleRenameSubmit = (oldName: string) => {
    if (!editingCatValue.trim()) return;
    renameCategory(oldName, editingCatValue);
    if (category === oldName) setCategory(editingCatValue.trim());
    setEditingCat(null);
    setEditingCatValue("");
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
            <h1 className="dm-page-title">স্টক</h1>
            <p className="dm-page-sub">
              {capabilities.showPaidFreeStock
                ? "পেইড ও ফ্রি স্টকসহ সম্পূর্ণ ইনভেন্টরি"
                : "পণ্যের বর্তমান মজুত, ক্যাটাগরি ও মূল্য তালিকা"}
            </p>
          </div>
        </div>
        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => setCatModalOpen(true)}
            className="dm-btn dm-btn-soft-emerald"
          >
            <FolderKanban size={17} aria-hidden="true" />
            <span>ক্যাটাগরি ({toBn(managedCategories.length)})</span>
          </button>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="dm-btn dm-btn-blue"
          >
            <Plus size={17} aria-hidden="true" />
            <span>নতুন পণ্য</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {capabilities.showPaidFreeStock ? (
        <div className="dm-kpi-grid">
          <div className="dm-kpi-card" style={{ cursor: "default" }}>
            <span className="dm-kpi-icon dm-tone-blue" aria-hidden="true">
              <Building2 size={19} />
            </span>
            <span className="dm-kpi-meta">
              <span className="dm-kpi-label">কোম্পানি</span>
              <span className="dm-kpi-value dm-text-blue">{toBn(kpis.companyCount)}</span>
            </span>
          </div>
          <div className="dm-kpi-card" style={{ cursor: "default" }}>
            <span className="dm-kpi-icon dm-tone-amber" aria-hidden="true">
              <Package size={19} />
            </span>
            <span className="dm-kpi-meta">
              <span className="dm-kpi-label">পণ্য</span>
              <span className="dm-kpi-value dm-text-amber">{toBn(kpis.productCount)}</span>
            </span>
          </div>
          <div className="dm-kpi-card" style={{ cursor: "default" }}>
            <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
              <Package size={19} />
            </span>
            <span className="dm-kpi-meta">
              <span className="dm-kpi-label">পেইড স্টক</span>
              <span className="dm-kpi-value dm-text-emerald">
                {formatNumberBn(kpis.paidStock)}
              </span>
            </span>
          </div>
          <div className="dm-kpi-card" style={{ cursor: "default" }}>
            <span className="dm-kpi-icon dm-tone-orange" aria-hidden="true">
              <Package size={19} />
            </span>
            <span className="dm-kpi-meta">
              <span className="dm-kpi-label">ফ্রি স্টক</span>
              <span className="dm-kpi-value dm-text-amber">
                {formatNumberBn(kpis.freeStock)}
              </span>
            </span>
          </div>
          {isAdmin && (
            <>
              <div className="dm-kpi-card" style={{ cursor: "default" }}>
                <span className="dm-kpi-icon dm-tone-rose" aria-hidden="true">
                  <Wallet size={19} />
                </span>
                <span className="dm-kpi-meta">
                  <span className="dm-kpi-label">মূল্য (WAC)</span>
                  <span className="dm-kpi-value dm-text-rose">
                    {formatMoneyBn(kpis.totalValue)}
                  </span>
                </span>
              </div>
              <div className="dm-kpi-card" style={{ cursor: "default" }}>
                <span className="dm-kpi-icon dm-tone-teal" aria-hidden="true">
                  <TrendingUp size={19} />
                </span>
                <span className="dm-kpi-meta">
                  <span className="dm-kpi-label">সম্ভাব্য বিক্রি</span>
                  <span className="dm-kpi-value dm-text-blue">
                    {formatMoneyBn(kpis.saleValue)}
                  </span>
                </span>
              </div>
              <div className="dm-kpi-card" style={{ cursor: "default" }}>
                <span className="dm-kpi-icon dm-tone-purple" aria-hidden="true">
                  <TrendingUp size={19} />
                </span>
                <span className="dm-kpi-meta">
                  <span className="dm-kpi-label">সম্ভাব্য লাভ</span>
                  <span className="dm-kpi-value dm-text-emerald">
                    {formatMoneyBn(kpis.profit)}
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="dm-kpi-grid">
          <div className="dm-kpi-card" style={{ cursor: "default" }}>
            <span className="dm-kpi-icon dm-tone-amber" aria-hidden="true">
              <Package size={19} />
            </span>
            <span className="dm-kpi-meta">
              <span className="dm-kpi-label">মোট পণ্য</span>
              <span className="dm-kpi-value">{toBn(kpis.productCount)}টি</span>
            </span>
          </div>
          <div className="dm-kpi-card" style={{ cursor: "default" }}>
            <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
              <Package size={19} />
            </span>
            <span className="dm-kpi-meta">
              <span className="dm-kpi-label">মোট মজুত</span>
              <span className="dm-kpi-value dm-text-emerald">
                {formatNumberBn(kpis.paidStock)}
              </span>
            </span>
          </div>
          {isAdmin && (
            <>
              <div className="dm-kpi-card" style={{ cursor: "default" }}>
                <span className="dm-kpi-icon dm-tone-blue" aria-hidden="true">
                  <Wallet size={19} />
                </span>
                <span className="dm-kpi-meta">
                  <span className="dm-kpi-label">স্টক মূল্য</span>
                  <span className="dm-kpi-value dm-text-blue">
                    {formatMoneyBn(kpis.totalValue)}
                  </span>
                </span>
              </div>
              <div className="dm-kpi-card" style={{ cursor: "default" }}>
                <span className="dm-kpi-icon dm-tone-purple" aria-hidden="true">
                  <TrendingUp size={19} />
                </span>
                <span className="dm-kpi-meta">
                  <span className="dm-kpi-label">সম্ভাব্য লাভ</span>
                  <span className="dm-kpi-value dm-text-emerald">
                    {formatMoneyBn(kpis.profit)}
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="dm-search-row">
        <div className="dm-search-box">
          <Search size={17} className="dm-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="পণ্য, SKU বা বারকোড খুঁজুন…"
            className="dm-search-input"
          />
        </div>
        <select
          aria-label="কোম্পানি ফিল্টার"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="dm-select"
          style={{ width: "auto", maxWidth: "100%", minWidth: 145 }}
        >
          {companies.map((c) => (
            <option key={c} value={c}>
              {c === "সব" ? "সব কোম্পানি" : c}
            </option>
          ))}
        </select>
      </div>

      <div className="dm-pills dm-pills-scroll">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            aria-pressed={category === cat}
            onClick={() => setCategory(cat)}
            className={`dm-pill${category === cat ? " is-active" : ""}`}
            style={{ minHeight: 44 }}
          >
            {cat}
          </button>
        ))}
        {[
          { id: "all" as const, label: "সব স্টক" },
          { id: "low" as const, label: "কম স্টক" },
          { id: "out" as const, label: "স্টক নেই" },
        ].map((sf) => (
          <button
            key={sf.id}
            type="button"
            aria-pressed={stockFilter === sf.id}
            onClick={() => setStockFilter(sf.id)}
            className={`dm-pill${stockFilter === sf.id ? " is-dark" : ""}`}
            style={{ minHeight: 44 }}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* 5-Col Stock Table */}
      <div className="dm-table-wrap">
        <table className="dm-table">
          <thead>
            <tr>
              <th>পণ্য</th>
              <th>কোম্পানি ও ক্যাটাগরি</th>
              <th>{isAdmin ? "দর (ক্রয় / বিক্রয়)" : "বিক্রয় দর"}</th>
              <th>স্টক</th>
              <th>{isAdmin ? "মোট ক্রয়মূল্য" : "মোট বিক্রয়মূল্য"}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="dm-empty-inline">
                  কোনো পণ্য পাওয়া যায়নি
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const total = p.paidStock + p.freeStock;
                const isOut = total <= 0;
                const isLow = total > 0 && total <= p.minStock;
                return (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ display: "block" }}>{p.name}</strong>
                      <small className="dm-text-muted">{p.sku}</small>
                    </td>
                    <td>
                      <span style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                        {p.company}
                      </span>
                      <select
                        aria-label={`${p.name} ক্যাটাগরি`}
                        value={p.category}
                        onChange={(e) => updateProductCategory(p.id, e.target.value)}
                        className="dm-select dm-inline-cat-select"
                      >
                        {managedCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span style={{ display: "block" }}>
                        বিক্রয়: <strong>{formatMoneyBn(p.saleRate)}</strong>
                      </span>
                      {isAdmin && (
                        <small className="dm-text-muted">
                          ক্রয়: {formatMoneyBn(p.purchaseRate)}
                        </small>
                      )}
                    </td>
                    <td>
                      {capabilities.showPaidFreeStock ? (
                        <div>
                          <span
                            className={`dm-badge ${
                              isOut
                                ? "dm-badge-rose"
                                : isLow
                                  ? "dm-badge-amber"
                                  : "dm-badge-emerald"
                            }`}
                          >
                            পেইড {toBn(p.paidStock)} · ফ্রি {toBn(p.freeStock)}
                          </span>
                          <small className="dm-text-muted" style={{ display: "block", marginTop: 2 }}>
                            মোট {toBn(total)} {p.unit}
                          </small>
                        </div>
                      ) : (
                        <span
                          className={`dm-badge ${
                            isOut
                              ? "dm-badge-rose"
                              : isLow
                                ? "dm-badge-amber"
                                : "dm-badge-emerald"
                          }`}
                        >
                          {isOut ? "স্টক নেই" : `${toBn(p.paidStock)} ${p.unit}`}
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>
                        {formatMoneyBn(total * (isAdmin ? p.purchaseRate : p.saleRate))}
                      </strong>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {addModalOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="নতুন পণ্য যোগ"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddModalOpen(false);
          }}
        >
          <form onSubmit={handleAddProduct} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">নতুন পণ্য যোগ করুন</h2>
                <p className="dm-modal-sub">ইনভেন্টরিতে নতুন আইটেম যুক্ত হবে</p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setAddModalOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-field">
                <label htmlFor="dm-stk-name">পণ্যের নাম *</label>
                <input
                  id="dm-stk-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="পণ্যের নাম লিখুন"
                  className="dm-input"
                />
              </div>
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-stk-cat">ক্যাটাগরি</label>
                  <select
                    id="dm-stk-cat"
                    value={catInput}
                    onChange={(e) => setCatInput(e.target.value)}
                    className="dm-select"
                  >
                    {managedCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__new__">+ নতুন ক্যাটাগরি লিখুন</option>
                  </select>
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-stk-comp">কোম্পানি</label>
                  <input
                    id="dm-stk-comp"
                    value={companyInput}
                    onChange={(e) => setCompanyInput(e.target.value)}
                    placeholder="যেমন: Hikvision"
                    className="dm-input"
                  />
                </div>
              </div>
              {catInput === "__new__" && (
                <div className="dm-field">
                  <label htmlFor="dm-stk-cat-new">নতুন ক্যাটাগরির নাম *</label>
                  <input
                    id="dm-stk-cat-new"
                    required
                    value={customNewCatInProduct}
                    onChange={(e) => setCustomNewCatInProduct(e.target.value)}
                    placeholder="যেমন: ইন্টারকম ও অ্যাক্সেস কন্ট্রোল"
                    className="dm-input"
                  />
                </div>
              )}
              <div className={isAdmin ? "dm-form-row-2" : "dm-field"}>
                {isAdmin && (
                  <div className="dm-field">
                    <label htmlFor="dm-stk-buy">ক্রয় দর (৳)</label>
                    <input
                      id="dm-stk-buy"
                      value={buyRate}
                      onChange={(e) => setBuyRate(e.target.value)}
                      placeholder="500"
                      className="dm-input"
                    />
                  </div>
                )}
                <div className="dm-field">
                  <label htmlFor="dm-stk-sell">বিক্রয় দর (৳)</label>
                  <input
                    id="dm-stk-sell"
                    value={sellRate}
                    onChange={(e) => setSellRate(e.target.value)}
                    placeholder="560"
                    className="dm-input"
                  />
                </div>
              </div>
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-stk-unit">ইউনিট</label>
                  <input
                    id="dm-stk-unit"
                    value={unitInput}
                    onChange={(e) => setUnitInput(e.target.value)}
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-stk-paid">
                    {capabilities.showPaidFreeStock ? "পেইড স্টক" : "স্টক পরিমাণ"}
                  </label>
                  <input
                    id="dm-stk-paid"
                    value={paidQty}
                    onChange={(e) => setPaidQty(e.target.value)}
                    className="dm-input"
                  />
                </div>
              </div>
              {capabilities.showPaidFreeStock && (
                <div className="dm-field">
                  <label htmlFor="dm-stk-free">ফ্রি স্টক (যদি থাকে)</label>
                  <input
                    id="dm-stk-free"
                    value={freeQty}
                    onChange={(e) => setFreeQty(e.target.value)}
                    className="dm-input"
                  />
                </div>
              )}
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="dm-btn dm-btn-outline"
              >
                বাতিল
              </button>
              <button type="submit" className="dm-btn dm-btn-blue">
                সংরক্ষণ করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Management Modal */}
      {catModalOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="ক্যাটাগরি ব্যবস্থাপনা"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCatModalOpen(false);
          }}
        >
          <div className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">ক্যাটাগরি ব্যবস্থাপনা</h2>
                <p className="dm-modal-sub">নতুন ক্যাটাগরি যোগ, পরিবর্তন বা মুছে ফেলুন</p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setCatModalOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="dm-modal-body">
              <form onSubmit={handleAddCategory} className="dm-cat-add-row">
                <input
                  aria-label="নতুন ক্যাটাগরির নাম"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="নতুন ক্যাটাগরি লিখুন…"
                  className="dm-input"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="dm-btn dm-btn-primary">
                  <Plus size={16} aria-hidden="true" />
                  <span>যোগ করুন</span>
                </button>
              </form>

              <div className="dm-cat-list">
                {managedCategories.map((cat) => {
                  const count = categoryCounts.get(cat) ?? 0;
                  const isEditing = editingCat === cat;
                  return (
                    <div key={cat} className="dm-cat-row">
                      {isEditing ? (
                        <div className="dm-cat-edit-row">
                          <input
                            aria-label="ক্যাটাগরির নতুন নাম"
                            value={editingCatValue}
                            onChange={(e) => setEditingCatValue(e.target.value)}
                            className="dm-input"
                            style={{ minHeight: 40, flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameSubmit(cat)}
                            className="dm-btn dm-btn-primary dm-btn-sm"
                            style={{ minHeight: 40 }}
                          >
                            সংরক্ষণ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCat(null)}
                            className="dm-btn dm-btn-outline dm-btn-sm"
                            style={{ minHeight: 40 }}
                          >
                            বাতিল
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ display: "block" }}>{cat}</strong>
                            <small className="dm-text-muted">{toBn(count)}টি পণ্য</small>
                          </div>
                          <div className="dm-table-actions">
                            <button
                              type="button"
                              aria-label={`${cat} নাম পরিবর্তন`}
                              onClick={() => {
                                setEditingCat(cat);
                                setEditingCatValue(cat);
                              }}
                              className="dm-icon-btn"
                              style={{ width: 40, height: 40 }}
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                            {cat !== "সাধারণ" && (
                              <button
                                type="button"
                                aria-label={`${cat} মুছে ফেলুন`}
                                onClick={() => {
                                  if (category === cat) setCategory("সব");
                                  deleteCategory(cat);
                                }}
                                className="dm-icon-btn"
                                style={{ width: 40, height: 40, color: "var(--dm-rose)" }}
                              >
                                <Trash2 size={15} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="dm-btn dm-btn-outline"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── 4. CustomersScreen ─────────────────────────── */

export function CustomersScreen() {
  const { state, go, addCustomer, deleteCustomer, addLedger, toast } = useDemo();
  const [search, setSearch] = useState<string>("");
  const [tab, setTab] = useState<"all" | "due" | "paid">("all");
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [viewCustomer, setViewCustomer] = useState<DemoCustomer | null>(null);

  const [cName, setCName] = useState<string>("");
  const [cMobile, setCMobile] = useState<string>("");
  const [cArea, setCArea] = useState<string>("");
  const [cDue, setCDue] = useState<string>("0");

  const stats = useMemo(() => {
    const totalDue = state.customers.reduce((sum, c) => sum + c.due, 0);
    const dueCount = state.customers.filter((c) => c.due > 0).length;
    return { totalDue, dueCount };
  }, [state.customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.customers.filter((c) => {
      if (tab === "due" && c.due <= 0) return false;
      if (tab === "paid" && c.due > 0) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q) ||
        c.area.toLowerCase().includes(q)
      );
    });
  }, [state.customers, search, tab]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) {
      toast("কাস্টমারের নাম লিখুন");
      return;
    }
    addCustomer({
      name: cName,
      mobile: cMobile || "01700000000",
      area: cArea || "ঢাকা",
      due: Math.max(0, Math.round(parseAmountInput(cDue))),
    });
    setCName("");
    setCMobile("");
    setCArea("");
    setCDue("0");
    setAddOpen(false);
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
            <h1 className="dm-page-title">কাস্টমার</h1>
            <p className="dm-page-sub">মোট {toBn(state.customers.length)}জন কাস্টমার</p>
          </div>
        </div>
        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="dm-btn dm-btn-primary"
          >
            <Plus size={17} aria-hidden="true" />
            <span>নতুন কাস্টমার</span>
          </button>
        </div>
      </div>

      <div className="dm-kpi-grid">
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-blue" aria-hidden="true">
            <Users size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মোট পাওনা</span>
            <span className="dm-kpi-value dm-text-rose">
              {formatMoneyBn(stats.totalDue)}
            </span>
          </span>
        </div>
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-amber" aria-hidden="true">
            <Wallet size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">বাকি আছে</span>
            <span className="dm-kpi-value dm-text-amber">
              {toBn(stats.dueCount)}জন
            </span>
          </span>
        </div>
      </div>

      <div className="dm-search-row">
        <div className="dm-search-box">
          <Search size={17} className="dm-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম, মোবাইল বা এলাকা খুঁজুন…"
            className="dm-search-input"
          />
        </div>
      </div>

      <div className="dm-pills dm-pills-scroll" role="tablist" aria-label="কাস্টমার ফিল্টার">
        {[
          { id: "all" as const, label: "সব" },
          { id: "due" as const, label: "বাকি আছে" },
          { id: "paid" as const, label: "পরিশোধিত" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`dm-pill${tab === item.id ? " is-active" : ""}`}
            style={{ minHeight: 44 }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="dm-table-wrap">
        <table className="dm-table">
          <thead>
            <tr>
              <th>কাস্টমার</th>
              <th>মোবাইল</th>
              <th>এলাকা</th>
              <th>বাকি</th>
              <th>কার্যক্রম</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="dm-empty-inline">
                  কোনো কাস্টমার পাওয়া যায়নি
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong className="dm-text-emerald">{c.name}</strong>
                  </td>
                  <td>{c.mobile}</td>
                  <td>{c.area || "—"}</td>
                  <td
                    className={c.due > 0 ? "dm-text-rose" : "dm-text-emerald"}
                    style={{ fontWeight: 700 }}
                  >
                    {formatMoneyBn(c.due)}
                  </td>
                  <td>
                    <div className="dm-table-actions">
                      <button
                        type="button"
                        aria-label={`${c.name} দেখুন`}
                        onClick={() => setViewCustomer(c)}
                        className="dm-icon-btn"
                        style={{ minWidth: 44, minHeight: 44 }}
                      >
                        <Eye size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${c.name} মুছুন`}
                        onClick={() => deleteCustomer(c.id)}
                        className="dm-icon-btn"
                        style={{
                          minWidth: 44,
                          minHeight: 44,
                          color: "var(--dm-rose)",
                        }}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="নতুন কাস্টমার যোগ"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
        >
          <form onSubmit={handleAdd} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">নতুন কাস্টমার যোগ করুন</h2>
                <p className="dm-modal-sub">বাকি হিসাব ও লেজারে যুক্ত হবে</p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setAddOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-field">
                <label htmlFor="dm-cust-name">নাম *</label>
                <input
                  id="dm-cust-name"
                  required
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="কাস্টমারের নাম"
                  className="dm-input"
                />
              </div>
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-cust-mobile">মোবাইল</label>
                  <input
                    id="dm-cust-mobile"
                    value={cMobile}
                    onChange={(e) => setCMobile(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-cust-area">এলাকা</label>
                  <input
                    id="dm-cust-area"
                    value={cArea}
                    onChange={(e) => setCArea(e.target.value)}
                    placeholder="মিরপুর-১০"
                    className="dm-input"
                  />
                </div>
              </div>
              <div className="dm-field">
                <label htmlFor="dm-cust-due">প্রারম্ভিক বাকি (৳)</label>
                <input
                  id="dm-cust-due"
                  value={cDue}
                  onChange={(e) => setCDue(e.target.value)}
                  className="dm-input"
                />
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="dm-btn dm-btn-outline"
              >
                বাতিল
              </button>
              <button type="submit" className="dm-btn dm-btn-primary">
                সংরক্ষণ করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {viewCustomer && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="কাস্টমার বিবরণ"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewCustomer(null);
          }}
        >
          <div className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">{viewCustomer.name}</h2>
                <p className="dm-modal-sub">
                  {viewCustomer.mobile} · {viewCustomer.area}
                </p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setViewCustomer(null)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-feed-item">
                <span>বর্তমান পাওনা</span>
                <strong className={viewCustomer.due > 0 ? "dm-text-rose" : "dm-text-emerald"}>
                  {formatMoneyBn(viewCustomer.due)}
                </strong>
              </div>
            </div>
            <div className="dm-modal-foot">
              {viewCustomer.due > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    addLedger({
                      party: viewCustomer.name,
                      amount: viewCustomer.due,
                      direction: "in",
                      kind: "collection",
                      note: "পূর্ণ বাকি আদায়",
                    });
                    setViewCustomer(null);
                  }}
                  className="dm-btn dm-btn-soft-emerald"
                >
                  পূর্ণ বাকি আদায় করুন
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                className="dm-btn dm-btn-primary"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── 5. SuppliersScreen ─────────────────────────── */

export function SuppliersScreen() {
  const { state, capabilities, go, addSupplier, addLedger, toast } = useDemo();
  const [search, setSearch] = useState<string>("");
  const [tab, setTab] = useState<"all" | "due" | "paid">("all");
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [payOpen, setPayOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  const [sName, setSName] = useState<string>("");
  const [sMobile, setSMobile] = useState<string>("");
  const [sArea, setSArea] = useState<string>("");
  const [sDue, setSDue] = useState<string>("0");

  const [paySupplier, setPaySupplier] = useState<string>(
    () => state.suppliers[0]?.name ?? "",
  );
  const [payAmount, setPayAmount] = useState<string>("");

  const stats = useMemo(() => {
    const totalDue = state.suppliers.reduce((sum, s) => sum + s.due, 0);
    const dueCount = state.suppliers.filter((s) => s.due > 0).length;
    const paidCount = state.suppliers.filter((s) => s.due <= 0).length;
    return {
      totalCount: state.suppliers.length,
      totalDue,
      dueCount,
      paidCount,
    };
  }, [state.suppliers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.suppliers.filter((s) => {
      if (tab === "due" && s.due <= 0) return false;
      if (tab === "paid" && s.due > 0) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.mobile.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q)
      );
    });
  }, [state.suppliers, search, tab]);

  if (!capabilities.showSuppliers) {
    return (
      <div className="dm-card dm-empty-state">
        <Building2 size={32} aria-hidden="true" />
        <h2>সাপ্লায়ার মডিউল</h2>
        <p>এই মোডে সরাসরি সাপ্লায়ার লেজার সক্রিয় নয়।</p>
        <button type="button" onClick={() => go("/")} className="dm-btn dm-btn-primary">
          হোমে ফিরুন
        </button>
      </div>
    );
  }

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) {
      toast("সরবরাহকারীর নাম লিখুন");
      return;
    }
    addSupplier({
      name: sName,
      mobile: sMobile || "01700000000",
      area: sArea || "ঢাকা",
      due: Math.max(0, Math.round(parseAmountInput(sDue))),
    });
    setSName("");
    setSMobile("");
    setSArea("");
    setSDue("0");
    setAddOpen(false);
  };

  const handleSupplierPay = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Math.round(parseAmountInput(payAmount));
    if (!paySupplier || amount <= 0) {
      toast("সাপ্লায়ার এবং সঠিক টাকার পরিমাণ দিন");
      return;
    }
    addLedger({
      party: paySupplier,
      amount,
      direction: "out",
      kind: "payment",
      note: "সাপ্লায়ার বকেয়া পরিশোধ",
    });
    setPayAmount("");
    setPayOpen(false);
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
            <h1 className="dm-page-title">সাপ্লায়ার</h1>
            <p className="dm-page-sub">মোট {toBn(stats.totalCount)}টি সরবরাহকারী</p>
          </div>
        </div>
        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="dm-btn dm-btn-primary"
          >
            <Plus size={17} aria-hidden="true" />
            <span>নতুন সরবরাহকারী</span>
          </button>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="dm-btn dm-btn-soft-emerald dm-btn-sm"
            style={{ minHeight: 44 }}
          >
            <CircleHelp size={16} aria-hidden="true" />
            <span>সাপ্লায়ার যোগ করার নিয়ম</span>
          </button>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="dm-kpi-grid">
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-indigo" aria-hidden="true">
            <Building2 size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মোট সাপ্লায়ার</span>
            <span className="dm-kpi-value dm-text-blue">{toBn(stats.totalCount)}</span>
          </span>
        </div>
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-amber" aria-hidden="true">
            <Wallet size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মোট দেনা</span>
            <span className="dm-kpi-value dm-text-rose">
              {formatMoneyBn(stats.totalDue)}
            </span>
          </span>
        </div>
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-orange" aria-hidden="true">
            <Wallet size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">দেনা আছে</span>
            <span className="dm-kpi-value dm-text-amber">{toBn(stats.dueCount)}</span>
          </span>
        </div>
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
            <Wallet size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">পরিশোধিত</span>
            <span className="dm-kpi-value dm-text-emerald">{toBn(stats.paidCount)}</span>
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="dm-section-head" style={{ marginTop: 4 }}>
          <h2>দ্রুত কাজ করুন</h2>
        </div>
        <div className="dm-kpi-grid">
          <button
            type="button"
            onClick={() => go("/purchases/new")}
            className="dm-action-tile"
          >
            <span className="dm-action-icon dm-tone-purple" aria-hidden="true">
              <ShoppingBag size={20} />
            </span>
            <span className="dm-action-label">কেনাকাটা</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPaySupplier(state.suppliers[0]?.name ?? "");
              setPayOpen(true);
            }}
            className="dm-action-tile"
          >
            <span className="dm-action-icon dm-tone-orange" aria-hidden="true">
              <Wallet size={20} />
            </span>
            <span className="dm-action-label">টাকা দিলাম</span>
          </button>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="dm-search-row">
        <div className="dm-search-box">
          <Search size={17} className="dm-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="সাপ্লায়ার, মোবাইল বা এলাকা খুঁজুন…"
            className="dm-search-input"
          />
        </div>
      </div>

      <div className="dm-tabs" role="tablist" aria-label="সাপ্লায়ার ট্যাব">
        {[
          { id: "all" as const, label: "সব" },
          { id: "due" as const, label: "দেনা আছে" },
          { id: "paid" as const, label: "পরিশোধিত" },
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

      {/* 5-Col Table */}
      <div className="dm-table-wrap">
        <table className="dm-table">
          <thead>
            <tr>
              <th>সাপ্লায়ার</th>
              <th>মোবাইল</th>
              <th>এলাকা</th>
              <th>দেনা</th>
              <th>শেষ লেনদেন</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="dm-empty-inline">
                  কোনো সাপ্লায়ার পাওয়া যায়নি
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong className="dm-text-emerald">{s.name}</strong>
                  </td>
                  <td>{s.mobile}</td>
                  <td>{s.area}</td>
                  <td
                    className={s.due > 0 ? "dm-text-rose" : "dm-text-emerald"}
                    style={{ fontWeight: 700 }}
                  >
                    {formatMoneyBn(s.due)}
                  </td>
                  <td className="dm-text-muted">{s.lastTxn}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="নতুন সরবরাহকারী"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
        >
          <form onSubmit={handleAddSupplier} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">নতুন সরবরাহকারী যোগ করুন</h2>
                <p className="dm-modal-sub">সরবরাহকারীর হিসাব ও বাকি সংরক্ষণ</p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setAddOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-field">
                <label htmlFor="dm-sup-name">প্রতিষ্ঠানের নাম *</label>
                <input
                  id="dm-sup-name"
                  required
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="dm-input"
                />
              </div>
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-sup-mobile">মোবাইল</label>
                  <input
                    id="dm-sup-mobile"
                    value={sMobile}
                    onChange={(e) => setSMobile(e.target.value)}
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-sup-area">এলাকা</label>
                  <input
                    id="dm-sup-area"
                    value={sArea}
                    onChange={(e) => setSArea(e.target.value)}
                    className="dm-input"
                  />
                </div>
              </div>
              <div className="dm-field">
                <label htmlFor="dm-sup-due">পূর্বের দেনা (৳)</label>
                <input
                  id="dm-sup-due"
                  value={sDue}
                  onChange={(e) => setSDue(e.target.value)}
                  className="dm-input"
                />
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
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

      {payOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="সাপ্লায়ার পেমেন্ট"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayOpen(false);
          }}
        >
          <form onSubmit={handleSupplierPay} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">টাকা দিলাম (সাপ্লায়ার পেমেন্ট)</h2>
                <p className="dm-modal-sub">সরবরাহকারীর দেনা সমন্বয় করুন</p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setPayOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-field">
                <label htmlFor="dm-sp-party">সাপ্লায়ার</label>
                <select
                  id="dm-sp-party"
                  value={paySupplier}
                  onChange={(e) => setPaySupplier(e.target.value)}
                  className="dm-select"
                >
                  {state.suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} (দেনা: {formatMoneyBn(s.due)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="dm-field">
                <label htmlFor="dm-sp-amount">টাকার পরিমাণ (৳)</label>
                <input
                  id="dm-sp-amount"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="10000"
                  className="dm-input"
                />
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                className="dm-btn dm-btn-outline"
              >
                বাতিল
              </button>
              <button type="submit" className="dm-btn dm-btn-primary">
                পেমেন্ট সংরক্ষণ
              </button>
            </div>
          </form>
        </div>
      )}

      {helpOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="সাপ্লায়ার নিয়ম"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHelpOpen(false);
          }}
        >
          <div className="dm-modal">
            <div className="dm-modal-head">
              <h2 className="dm-modal-title">সাপ্লায়ার ব্যবস্থাপনা নিয়ম</h2>
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
              <p>১. নিয়মিত পাইকারি সরবরাহকারীদের নাম ও পূর্বের দেনা যোগ করে রাখুন।</p>
              <p>২. `টাকা দিলাম` থেকে পেমেন্ট করলে সাথে সাথে দেনা এবং অ্যাকাউন্ট ব্যালেন্স আপডেট হবে।</p>
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

/* ─────────────────────────── 6. SalesReturnsScreen ─────────────────────────── */

export function SalesReturnsScreen() {
  const { state, go, toast } = useDemo();
  const [search, setSearch] = useState<string>("");
  const [extraReturns, setExtraReturns] = useState(state.returns);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [retCustomer, setRetCustomer] = useState<string>(
    () => state.customers[0]?.name ?? "নগদ কাস্টমার",
  );
  const [retInvoice, setRetInvoice] = useState<string>(
    () => state.invoices[0]?.number ?? "INV-2611-0001",
  );
  const [retAmount, setRetAmount] = useState<string>("");

  const allReturns = useMemo(() => {
    const known = new Set(extraReturns.map((r) => r.id));
    const missing = state.returns.filter((r) => !known.has(r.id));
    return [...extraReturns, ...missing];
  }, [extraReturns, state.returns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allReturns;
    return allReturns.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.invoiceNo.toLowerCase().includes(q),
    );
  }, [allReturns, search]);

  const totalAmount = useMemo(
    () => allReturns.reduce((s, r) => s + r.amount, 0),
    [allReturns],
  );

  const handleAddReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.round(parseAmountInput(retAmount));
    if (!retCustomer || amt <= 0) {
      toast("কাস্টমার ও রিটার্ন মূল্য দিন");
      return;
    }
    const created = {
      id: `ret-${Date.now()}`,
      number: `RET-2611-00${toBn(allReturns.length + 10)}`,
      customerName: retCustomer,
      invoiceNo: retInvoice,
      amount: amt,
      date: new Date().toISOString(),
      status: "completed" as const,
    };
    setExtraReturns((prev) => [created, ...prev]);
    setRetAmount("");
    setModalOpen(false);
    toast(`সেলস রিটার্ন সম্পন্ন: ${created.number}`);
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
            <h1 className="dm-page-title">সেলস রিটার্ন</h1>
            <p className="dm-page-sub">ফেরত নেওয়া পণ্য ও ক্রেডিট সমন্বয়</p>
          </div>
        </div>
        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="dm-btn dm-btn-primary"
          >
            <RotateCcw size={16} aria-hidden="true" />
            <span>নতুন রিটার্ন</span>
          </button>
        </div>
      </div>

      <div className="dm-kpi-grid">
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-teal" aria-hidden="true">
            <RotateCcw size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মোট রিটার্ন</span>
            <span className="dm-kpi-value">{toBn(allReturns.length)}টি</span>
          </span>
        </div>
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-amber" aria-hidden="true">
            <Wallet size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">রিটার্ন মূল্য</span>
            <span className="dm-kpi-value dm-text-amber">
              {formatMoneyBn(totalAmount)}
            </span>
          </span>
        </div>
      </div>

      <div className="dm-search-row">
        <div className="dm-search-box">
          <Search size={17} className="dm-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="রিটার্ন নম্বর, কাস্টমার বা ইনভয়েস…"
            className="dm-search-input"
          />
        </div>
      </div>

      <div className="dm-table-wrap">
        <table className="dm-table">
          <thead>
            <tr>
              <th>রিটার্ন #</th>
              <th>কাস্টমার</th>
              <th>মূল ইনভয়েস</th>
              <th>তারিখ</th>
              <th>পরিমাণ</th>
              <th>অবস্থা</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong className="dm-text-emerald">{r.number}</strong>
                </td>
                <td>{r.customerName}</td>
                <td>{r.invoiceNo}</td>
                <td className="dm-text-muted">{formatDateBn(r.date)}</td>
                <td>
                  <strong>{formatMoneyBn(r.amount)}</strong>
                </td>
                <td>
                  <span className="dm-badge dm-badge-emerald">
                    {r.status === "completed" ? "সম্পন্ন" : "বাতিল"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="নতুন সেলস রিটার্ন"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <form onSubmit={handleAddReturn} className="dm-modal">
            <div className="dm-modal-head">
              <h2 className="dm-modal-title">নতুন সেলস রিটার্ন</h2>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setModalOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-field">
                <label htmlFor="dm-ret-cust">কাস্টমার</label>
                <select
                  id="dm-ret-cust"
                  value={retCustomer}
                  onChange={(e) => setRetCustomer(e.target.value)}
                  className="dm-select"
                >
                  {state.customers.length === 0 ? (
                    <option value="নগদ কাস্টমার">নগদ কাস্টমার</option>
                  ) : (
                    state.customers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="dm-field">
                <label htmlFor="dm-ret-inv">ইনভয়েস নম্বর</label>
                <input
                  id="dm-ret-inv"
                  value={retInvoice}
                  onChange={(e) => setRetInvoice(e.target.value)}
                  className="dm-input"
                />
              </div>
              <div className="dm-field">
                <label htmlFor="dm-ret-amt">ফেরত মূল্য (৳)</label>
                <input
                  id="dm-ret-amt"
                  required
                  value={retAmount}
                  onChange={(e) => setRetAmount(e.target.value)}
                  placeholder="500"
                  className="dm-input"
                />
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="dm-btn dm-btn-outline"
              >
                বাতিল
              </button>
              <button type="submit" className="dm-btn dm-btn-primary">
                রিটার্ন নিশ্চিত করুন
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── 7. CompaniesScreen ─────────────────────────── */

export function CompaniesScreen() {
  const { state, go, toast } = useDemo();
  const [search, setSearch] = useState<string>("");
  const [companies, setCompanies] = useState(state.companies);
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [cName, setCName] = useState<string>("");
  const [cCode, setCCode] = useState<string>("");
  const [cMobile, setCMobile] = useState<string>("");

  const mergedCompanies = useMemo(() => {
    const ids = new Set(companies.map((c) => c.id));
    return [...companies, ...state.companies.filter((c) => !ids.has(c.id))];
  }, [companies, state.companies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mergedCompanies;
    return mergedCompanies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q),
    );
  }, [mergedCompanies, search]);

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) {
      toast("কোম্পানির নাম দিন");
      return;
    }
    setCompanies((prev) => [
      {
        id: `comp-${Date.now()}`,
        name: cName.trim(),
        code: (cCode || cName.slice(0, 3)).toUpperCase(),
        mobile: cMobile.trim() || "01700000000",
      },
      ...prev,
    ]);
    toast(`নতুন কোম্পানি যোগ হয়েছে: ${cName.trim()}`);
    setCName("");
    setCCode("");
    setCMobile("");
    setAddOpen(false);
  };

  return (
    <div className="dm-stack-md">
      <div className="dm-page-head">
        <div className="dm-page-head-left">
          <button
            type="button"
            aria-label="আরও মেনুতে ফিরুন"
            onClick={() => go("/more")}
            className="dm-back-btn"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div>
            <h1 className="dm-page-title">কোম্পানি</h1>
            <p className="dm-page-sub">ব্র্যান্ড ও উৎপাদক কোম্পানির তালিকা</p>
          </div>
        </div>
        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="dm-btn dm-btn-primary"
          >
            <Plus size={17} aria-hidden="true" />
            <span>নতুন কোম্পানি</span>
          </button>
        </div>
      </div>

      <div className="dm-search-row">
        <div className="dm-search-box">
          <Search size={17} className="dm-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="কোম্পানি বা কোড খুঁজুন…"
            className="dm-search-input"
          />
        </div>
      </div>

      <div className="dm-table-wrap">
        <table className="dm-table">
          <thead>
            <tr>
              <th>কোম্পানি</th>
              <th>কোড</th>
              <th>মোবাইল</th>
              <th>পণ্য সংখ্যা</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((comp) => {
              const prdCount = state.products.filter(
                (p) => p.company.toLowerCase().includes(comp.name.split(" ")[0].toLowerCase()),
              ).length;
              return (
                <tr key={comp.id}>
                  <td>
                    <strong className="dm-text-emerald">{comp.name}</strong>
                  </td>
                  <td>
                    <span className="dm-badge dm-badge-slate">{comp.code}</span>
                  </td>
                  <td>{comp.mobile}</td>
                  <td>{toBn(prdCount)}টি</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="নতুন কোম্পানি"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
        >
          <form onSubmit={handleAddCompany} className="dm-modal">
            <div className="dm-modal-head">
              <h2 className="dm-modal-title">নতুন কোম্পানি যোগ</h2>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setAddOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-field">
                <label htmlFor="dm-comp-name">কোম্পানির নাম *</label>
                <input
                  id="dm-comp-name"
                  required
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="dm-input"
                />
              </div>
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-comp-code">কোড</label>
                  <input
                    id="dm-comp-code"
                    value={cCode}
                    onChange={(e) => setCCode(e.target.value)}
                    placeholder="BRAND"
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-comp-mob">মোবাইল</label>
                  <input
                    id="dm-comp-mob"
                    value={cMobile}
                    onChange={(e) => setCMobile(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="dm-input"
                  />
                </div>
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
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
