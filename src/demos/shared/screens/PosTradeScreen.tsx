import {
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  Plus,
  Printer,
  ScanBarcode,
  Search,
  ShoppingCart,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatDateBn,
  formatMoneyBn,
  parseAmountInput,
  toBn,
} from "../../../lib/global";
import {
  calculateCartPricing,
  filterCartLines,
  type GlobalDiscountMode,
} from "../../../lib/posPricing";
import { useRouter } from "../../../lib/router";
import { useDemo } from "../demoStore";
import type { DemoInvoice, DemoProduct } from "../demoTypes";

interface CartLine {
  productId: string;
  name: string;
  unit: string;
  rate: number;
  qty: number;
  maxStock: number;
  unitDiscountInput: string;
}

const PAYMENT_METHODS = [
  { id: "cash", label: "নগদ" },
  { id: "bkash", label: "bKash" },
  { id: "nagad", label: "Nagad" },
  { id: "rocket", label: "Rocket" },
  { id: "bank", label: "ব্যাংক" },
] as const;

const WALK_IN_CUSTOMER = "নগদ কাস্টমার";

export function PosTradeScreen({ kind }: { kind: "sale" | "purchase" }) {
  const isSale = kind === "sale";
  const {
    mode,
    state,
    activeOrg,
    currentUser,
    visibleServiceJobs,
    capabilities,
    go,
    addSale,
    addPurchase,
    addCustomer,
    addSupplier,
    addProduct,
    linkServiceSale,
    toast,
  } = useDemo();
  const isAdmin = currentUser.role === "admin";
  const { search: urlSearch } = useRouter();
  const isRetailSale = mode === "retail-pos" && isSale;
  const isWholesale = false;

  const urlParams = useMemo(() => new URLSearchParams(urlSearch), [urlSearch]);
  const urlServiceJobId = isSale ? urlParams.get("serviceJobId") : null;
  const urlCustomerParam = isSale ? urlParams.get("customer") : null;
  const [selectedServiceJobId, setSelectedServiceJobId] = useState<string>(
    () => urlServiceJobId ?? "",
  );

  useEffect(() => {
    if (urlServiceJobId) {
      setSelectedServiceJobId(urlServiceJobId);
    }
  }, [urlServiceJobId]);

  const activeServiceJob = useMemo(
    () =>
      selectedServiceJobId
        ? visibleServiceJobs.find((j) => j.id === selectedServiceJobId) ?? null
        : null,
    [selectedServiceJobId, visibleServiceJobs],
  );

  const searchRef = useRef<HTMLInputElement>(null);

  const [selectedPartyName, setSelectedPartyName] = useState<string>(() => {
    if (urlCustomerParam?.trim()) return urlCustomerParam.trim();
    if (isRetailSale) return WALK_IN_CUSTOMER;
    if (isSale) return state.customers[0]?.name ?? WALK_IN_CUSTOMER;
    return capabilities.showSuppliers
      ? (state.suppliers[0]?.name ?? "সাধারণ সাপ্লায়ার")
      : (state.companies[0]?.name ?? "সাধারণ সাপ্লায়ার");
  });

  const [serviceChargeInput, setServiceChargeInput] = useState<string>("0");
  const [completedInvoice, setCompletedInvoice] = useState<DemoInvoice | null>(null);

  useEffect(() => {
    if (activeServiceJob?.customerName) {
      setSelectedPartyName(activeServiceJob.customerName);
    } else if (urlCustomerParam?.trim()) {
      setSelectedPartyName(urlCustomerParam.trim());
    }
    if (activeServiceJob) {
      setServiceChargeInput(String(activeServiceJob.serviceCharge || 0));
    }
  }, [activeServiceJob, urlCustomerParam]);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cartSearchQuery, setCartSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("সব");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountInput, setDiscountInput] = useState<string>("0");
  const [globalDiscountMode, setGlobalDiscountMode] = useState<GlobalDiscountMode>("per_unit");
  const [payMode, setPayMode] = useState<"full" | "partial" | "due">("full");
  const [partialPaidInput, setPartialPaidInput] = useState<string>("0");
  const [method, setMethod] = useState<string>("cash");
  const [accountId, setAccountId] = useState<string>(
    () => state.accounts[0]?.id ?? "acc-cash",
  );

  // Modals
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);
  const [quickPartyOpen, setQuickPartyOpen] = useState<boolean>(false);
  const [quickProductOpen, setQuickProductOpen] = useState<boolean>(false);

  // Quick party form
  const [partyNameInput, setPartyNameInput] = useState<string>("");
  const [partyMobileInput, setPartyMobileInput] = useState<string>("");
  const [partyAreaInput, setPartyAreaInput] = useState<string>("");

  // Quick product form
  const [prdName, setPrdName] = useState<string>("");
  const [prdCategory, setPrdCategory] = useState<string>(
    () => state.categories[0] ?? "সাধারণ",
  );
  const [prdUnit, setPrdUnit] = useState<string>("পিস");
  const [prdPurchaseRate, setPrdPurchaseRate] = useState<string>("");
  const [prdSaleRate, setPrdSaleRate] = useState<string>("");
  const [prdStock, setPrdStock] = useState<string>("20");

  const managedCategories = useMemo(() => {
    const set = new Set<string>(state.categories);
    for (const p of state.products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set);
  }, [state.categories, state.products]);

  const categories = useMemo(() => ["সব", ...managedCategories], [managedCategories]);

  const partyOptions = useMemo(() => {
    if (isSale) {
      const list = state.customers.map((c) => ({
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        label: c.mobile ? `${c.name} (${c.mobile})` : c.name,
      }));
      if (!list.some((item) => item.name === WALK_IN_CUSTOMER)) {
        list.unshift({
          id: "walk-in",
          name: WALK_IN_CUSTOMER,
          mobile: "—",
          label: "নগদ কাস্টমার (ওয়াক-ইন)",
        });
      }
      return list;
    }

    const baseSuppliers = capabilities.showSuppliers
      ? state.suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          mobile: s.mobile,
          label: `${s.name} (${s.mobile})`,
        }))
      : state.companies.map((c) => ({
          id: c.id,
          name: c.name,
          mobile: c.mobile,
          label: `${c.name} (${c.mobile})`,
        }));

    if (baseSuppliers.length === 0) {
      return [
        {
          id: "sup-walk",
          name: "সাধারণ সাপ্লায়ার",
          mobile: "—",
          label: "সাধারণ সাপ্লায়ার",
        },
      ];
    }
    return baseSuppliers;
  }, [isSale, state.customers, state.suppliers, state.companies, capabilities.showSuppliers]);

  const activePartyMobile = useMemo(() => {
    if (activeServiceJob?.customerMobile) return activeServiceJob.customerMobile;
    const found = partyOptions.find((p) => p.name === selectedPartyName);
    return found?.mobile ?? "—";
  }, [activeServiceJob?.customerMobile, partyOptions, selectedPartyName]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.products.filter((p) => {
      if (selectedCategory !== "সব" && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [state.products, selectedCategory, searchQuery]);

  const addToCart = (product: DemoProduct) => {
    const totalStock = product.paidStock + product.freeStock;
    if (isSale && !state.settings.allowNegativeStock && totalStock <= 0) {
      toast(`${product.name} স্টকে নেই`);
      return;
    }
    const unitRate = isSale ? product.saleRate : product.purchaseRate;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (
          isSale &&
          !state.settings.allowNegativeStock &&
          existing.qty + 1 > totalStock
        ) {
          toast(`সর্বোচ্চ স্টক ${toBn(totalStock)} ${product.unit}`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          rate: unitRate,
          qty: 1,
          maxStock: totalStock,
          unitDiscountInput: "0",
        },
      ];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const nextQty = item.qty + delta;
          if (nextQty <= 0) return null;
          if (
            isSale &&
            !state.settings.allowNegativeStock &&
            nextQty > item.maxStock
          ) {
            toast(`সর্বোচ্চ স্টক ${toBn(item.maxStock)} ${item.unit}`);
            return item;
          }
          return { ...item, qty: nextQty };
        })
        .filter((x): x is CartLine => x !== null),
    );
  };

  const updateLineUnitDiscount = (productId: string, value: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, unitDiscountInput: value } : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const pricing = useMemo(
    () =>
      calculateCartPricing(
        cart.map((line) => ({
          productId: line.productId,
          name: line.name,
          unit: line.unit,
          rate: line.rate,
          qty: line.qty,
          unitDiscount: Math.max(0, parseAmountInput(line.unitDiscountInput)),
        })),
        Math.max(0, parseAmountInput(discountInput)),
        globalDiscountMode,
      ),
    [cart, discountInput, globalDiscountMode],
  );

  const visiblePricedLines = useMemo(
    () => filterCartLines(pricing.lines, cartSearchQuery),
    [pricing.lines, cartSearchQuery],
  );

  const serviceChargeVal = isSale ? Math.max(0, Math.round(parseAmountInput(serviceChargeInput))) : 0;
  const totalQty = pricing.totalQty;
  const subTotal = pricing.grossSubtotal;
  const discountVal = pricing.totalDiscount;
  const grandTotal = Math.max(0, pricing.grandTotal + serviceChargeVal);

  const paidAmount = useMemo(() => {
    if (payMode === "full") return grandTotal;
    if (payMode === "due") return 0;
    return Math.max(
      0,
      Math.min(grandTotal, Math.round(parseAmountInput(partialPaidInput))),
    );
  }, [payMode, grandTotal, partialPaidInput]);

  const dueAmount = Math.max(0, grandTotal - paidAmount);
  const selectedSupplier = isWholesale && !isSale
    ? state.suppliers.find((supplier) => supplier.name === selectedPartyName)
    : undefined;

  const handleBarcodeAction = () => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const exact = state.products.find(
        (p) => p.barcode.toLowerCase() === q || p.sku.toLowerCase() === q,
      );
      if (exact) {
        addToCart(exact);
        setSearchQuery("");
      } else {
        toast("এই বারকোড বা SKU-তে কোনো পণ্য পাওয়া যায়নি");
      }
      return;
    }
    const sample = state.products.find((p) => p.paidStock + p.freeStock > 0) ?? state.products[0];
    if (sample) {
      addToCart(sample);
      toast(`বারকোড স্ক্যান (${sample.barcode}): ${sample.name}`);
    }
    searchRef.current?.focus();
  };

  const handleSubmitTrade = () => {
    if (cart.length === 0 && serviceChargeVal <= 0) {
      toast("কার্টে অন্তত একটি পণ্য বা সার্ভিসিং চার্জ যোগ করুন");
      return;
    }
    if (isRetailSale && selectedPartyName === WALK_IN_CUSTOMER && dueAmount > 0) {
      toast("বাকি রাখতে তালিকা থেকে একজন গ্রাহক বেছে নিন");
      return;
    }

    const payload = {
      partyName: selectedPartyName,
      partyMobile: activePartyMobile,
      items: cart.map((line) => ({
        productId: line.productId,
        name: line.name,
        unit: line.unit,
        qty: line.qty,
        rate: line.rate,
      })),
      discount: discountVal,
      paid: paidAmount,
      method,
      accountId,
      serviceJobId: activeServiceJob?.id,
      serviceJobNo: activeServiceJob?.jobNo,
      serviceCharge: serviceChargeVal > 0 ? serviceChargeVal : undefined,
    };

    if (isSale) {
      const invoice = addSale(payload);
      if (activeServiceJob) {
        linkServiceSale(activeServiceJob.id, invoice.id);
      }
      setCompletedInvoice(invoice);
    } else {
      addPurchase(payload);
      go("/purchases");
    }
  };

  const handleCloseReceipt = () => {
    setCompletedInvoice(null);
    if (activeServiceJob || !isAdmin) {
      go("/servicing");
    } else {
      go("/sales");
    }
  };

  const handleQuickPartySave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyNameInput.trim()) {
      toast("নাম লিখুন");
      return;
    }
    if (isSale) {
      const created = addCustomer({
        name: partyNameInput,
        mobile: partyMobileInput || "01700000000",
        area: partyAreaInput || "ঢাকা",
      });
      setSelectedPartyName(created.name);
    } else if (capabilities.showSuppliers) {
      const created = addSupplier({
        name: partyNameInput,
        mobile: partyMobileInput || "01700000000",
        area: partyAreaInput || "ঢাকা",
      });
      setSelectedPartyName(created.name);
    } else {
      setSelectedPartyName(partyNameInput.trim());
      toast(`সাপ্লায়ার নির্বাচিত: ${partyNameInput.trim()}`);
    }
    setPartyNameInput("");
    setPartyMobileInput("");
    setPartyAreaInput("");
    setQuickPartyOpen(false);
  };

  const handleQuickProductSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prdName.trim()) {
      toast("পণ্যের নাম লিখুন");
      return;
    }
    const pRate = Math.max(0, parseAmountInput(prdPurchaseRate));
    const sRate = Math.max(0, parseAmountInput(prdSaleRate));
    const stockNum = Math.max(0, Math.round(parseAmountInput(prdStock)));

    const created = addProduct({
      name: prdName,
      category: prdCategory || "সাধারণ",
      unit: prdUnit || "পিস",
      purchaseRate: isAdmin ? (pRate || 100) : Math.max(0, Math.round((sRate || 120) * 0.8)),
      saleRate: sRate || 120,
      paidStock: stockNum,
    });
    addToCart(created);
    setPrdName("");
    setPrdPurchaseRate("");
    setPrdSaleRate("");
    setPrdStock("20");
    setQuickProductOpen(false);
  };

  const todayLabel = useMemo(() => formatDateBn(new Date().toISOString()), []);

  return (
    <div className="dm-stack-md">
      {/* Page Header */}
      <div className="dm-page-head">
        <div className="dm-page-head-left">
          <button
            type="button"
            aria-label="পেছনে যান"
            onClick={() => go(isSale ? "/sales" : "/purchases")}
            className="dm-back-btn"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div>
            <h1 className="dm-page-title">
              {isRetailSale ? "কাউন্টার বিলিং" : isWholesale ? (isSale ? "পাইকারি বিক্রয়" : "পাইকারি ক্রয়") : (isSale ? "বিক্রয় করুন" : "ক্রয় করুন")}
            </h1>
            <p className="dm-page-sub">
              {isSale
                ? "কাস্টমারের কাছে পণ্য বিক্রি করুন ও ইনভয়েস তৈরি করুন"
                : isWholesale
                  ? "এই ক্রয় সাপ্লায়ারের খাতা ও গোডাউনের মজুতে যোগ হবে"
                  : "সাপ্লায়ার থেকে পণ্য ক্রয় করুন ও স্টক আপডেট করুন"}
            </p>
          </div>
        </div>

        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="dm-btn dm-btn-soft-emerald dm-btn-sm"
            style={{ minHeight: 44 }}
          >
            <CircleHelp size={16} aria-hidden="true" />
            <span>নিয়ম</span>
          </button>
        </div>
      </div>

      {activeServiceJob && (
        <div className="dm-service-banner" role="status">
          <div className="dm-service-banner-left">
            <Wrench size={18} aria-hidden="true" />
            <div>
              <strong>
                সার্ভিসিং বিক্রয়: {activeServiceJob.jobNo} — {activeServiceJob.title}
              </strong>
              <small>
                কাস্টমার: {activeServiceJob.customerName} · অবস্থান: {activeServiceJob.location}
              </small>
            </div>
          </div>
          <button
            type="button"
            onClick={() => go("/servicing")}
            className="dm-btn dm-btn-outline dm-btn-sm"
            style={{ minHeight: 40 }}
          >
            সার্ভিসিংয়ে ফিরুন
          </button>
        </div>
      )}

      {/* 2-Column POS Layout */}
      <div className="dm-pos-layout">
        {/* Left Catalog Column */}
        <div className="dm-pos-left dm-stack-sm">
          {/* Party Selection */}
          <div className="dm-card dm-card-pad-sm">
            <div className="dm-field">
              <label htmlFor="dm-pos-party">
                {isSale ? "কাস্টমার নির্বাচন" : "সাপ্লায়ার নির্বাচন"}
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  id="dm-pos-party"
                  value={selectedPartyName}
                  onChange={(e) => setSelectedPartyName(e.target.value)}
                  className="dm-select"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  {partyOptions.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.label}
                    </option>
                  ))}
                  {!partyOptions.some((p) => p.name === selectedPartyName) && (
                    <option value={selectedPartyName}>{selectedPartyName}</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => setQuickPartyOpen(true)}
                  className="dm-btn dm-btn-soft-emerald dm-btn-sm"
                  style={{ minHeight: 44, flexShrink: 0 }}
                >
                  <Plus size={16} aria-hidden="true" />
                  <span>নতুন</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search & Barcode + Category Pills */}
          <div className="dm-search-row" style={{ marginBottom: 4 }}>
            <div className="dm-search-box">
              <Search size={17} className="dm-search-icon" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredProducts.length === 1) {
                    e.preventDefault();
                    addToCart(filteredProducts[0]);
                  }
                }}
                placeholder="পণ্যের নাম / Barcode দিয়ে খুঁজুন…"
                className="dm-search-input"
              />
            </div>
            <button
              type="button"
              onClick={handleBarcodeAction}
              aria-label="বারকোড স্ক্যান করুন"
              title="বারকোড স্ক্যান করুন"
              className="dm-icon-btn"
              style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
            >
              <ScanBarcode size={19} aria-hidden="true" />
            </button>
          </div>

          <div className="dm-pills dm-pills-scroll" role="tablist" aria-label="পণ্য ক্যাটাগরি">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(cat)}
                  className={`dm-pill${active ? " is-active" : ""}`}
                  style={{ minHeight: 44 }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Product List */}
          <div className="dm-pos-products">
            {filteredProducts.length === 0 ? (
              <div className="dm-card dm-empty-state">
                <p>এই নামে কোনো পণ্য পাওয়া যায়নি</p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const totalStock = product.paidStock + product.freeStock;
                const outOfStock = totalStock <= 0;
                const lowStock = totalStock > 0 && totalStock <= product.minStock;
                const rate = isSale ? product.saleRate : product.purchaseRate;

                return (
                  <div key={product.id} className="dm-pos-item">
                    <div className="dm-pos-item-info">
                      <strong>{product.name}</strong>
                      <div className="dm-pos-item-meta">
                        <span
                          className={`dm-badge ${
                            outOfStock
                              ? "dm-badge-rose"
                              : lowStock
                                ? "dm-badge-amber"
                                : "dm-badge-emerald"
                          }`}
                        >
                          {outOfStock
                            ? "স্টক নেই"
                            : lowStock
                              ? `কম স্টক: ${toBn(totalStock)}`
                              : `স্টক: ${toBn(totalStock)}`}
                        </span>
                        <span style={{ fontWeight: 800, color: "var(--dm-ink)" }}>
                          {formatMoneyBn(rate)}
                        </span>
                        <span className="dm-text-muted">/ {product.unit}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSale && !state.settings.allowNegativeStock && outOfStock}
                      onClick={() => addToCart(product)}
                      className="dm-btn dm-btn-soft-emerald dm-btn-sm"
                      style={{ minHeight: 44, flexShrink: 0 }}
                    >
                      <Plus size={15} aria-hidden="true" />
                      <span>যোগ করুন</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => setQuickProductOpen(true)}
            className="dm-btn dm-btn-outline dm-btn-full"
            style={{ marginTop: 4 }}
          >
            <Plus size={17} aria-hidden="true" />
            <span>নতুন পণ্য</span>
          </button>
        </div>

        {/* Right Sticky Cart Column */}
        <aside className="dm-pos-cart dm-card" aria-label="শপিং কার্ট ও বিলিং">
          <div className="dm-card-head">
            <h2 className="dm-card-title">কার্ট ({toBn(totalQty)}টি পণ্য)</h2>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="dm-section-link"
                style={{ minHeight: 44, color: "var(--dm-rose)" }}
              >
                খালি করুন
              </button>
            )}
          </div>

          {cart.length > 0 && (
            <div className="dm-cart-search-wrap">
              <Search size={15} className="dm-search-icon" aria-hidden="true" />
              <input
                type="search"
                aria-label="কার্টের পণ্য খুঁজুন"
                value={cartSearchQuery}
                onChange={(e) => setCartSearchQuery(e.target.value)}
                placeholder="কার্টের পণ্য আলাদাভাবে খুঁজুন…"
                className="dm-search-input dm-cart-search-input"
              />
            </div>
          )}

          {cart.length === 0 ? (
            <div className="dm-empty-state" style={{ paddingBlock: 22 }}>
              <ShoppingCart size={30} aria-hidden="true" />
              <strong>কার্ট খালি</strong>
              <span>পণ্য খুঁজে যোগ করুন</span>
            </div>
          ) : visiblePricedLines.length === 0 ? (
            <div className="dm-empty-inline">
              কার্টে এই নামে কোনো পণ্য পাওয়া যায়নি
            </div>
          ) : (
            <div className="dm-cart-lines">
              {visiblePricedLines.map((line) => {
                const rawLine = cart.find((c) => c.productId === line.productId);
                return (
                  <div key={line.productId} className="dm-cart-line dm-cart-line-enhanced">
                    <div className="dm-cart-line-top">
                      <div style={{ minWidth: 110, flex: 1 }}>
                        <div className="dm-cart-line-title">{line.name}</div>
                        <div className="dm-text-muted" style={{ fontSize: 12 }}>
                          {line.appliedUnitDiscount > 0 ? (
                            <>
                              <span style={{ textDecoration: "line-through", marginRight: 4 }}>
                                {formatMoneyBn(line.rate)}
                              </span>
                              <strong style={{ color: "var(--dm-brand-700)" }}>
                                {formatMoneyBn(line.effectiveUnitRate)}
                              </strong>{" "}
                              × {toBn(line.qty)} ={" "}
                              <strong style={{ color: "var(--dm-ink)" }}>
                                {formatMoneyBn(line.netTotal)}
                              </strong>
                            </>
                          ) : (
                            <>
                              {formatMoneyBn(line.rate)} × {toBn(line.qty)} ={" "}
                              <strong style={{ color: "var(--dm-ink)" }}>
                                {formatMoneyBn(line.netTotal)}
                              </strong>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="dm-qty-ctrl">
                        <button
                          type="button"
                          aria-label={`${line.name} পরিমাণ কমান`}
                          onClick={() => updateCartQty(line.productId, -1)}
                          className="dm-qty-btn"
                          style={{ minWidth: 40, minHeight: 40 }}
                        >
                          −
                        </button>
                        <span
                          style={{
                            minWidth: 22,
                            textAlign: "center",
                            fontWeight: 800,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {toBn(line.qty)}
                        </span>
                        <button
                          type="button"
                          aria-label={`${line.name} পরিমাণ বাড়ান`}
                          onClick={() => updateCartQty(line.productId, 1)}
                          className="dm-qty-btn"
                          style={{ minWidth: 40, minHeight: 40 }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          aria-label={`${line.name} সরান`}
                          onClick={() => removeFromCart(line.productId)}
                          className="dm-icon-btn"
                          style={{
                            width: 40,
                            height: 40,
                            minWidth: 40,
                            minHeight: 40,
                            color: "var(--dm-rose)",
                          }}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="dm-cart-line-discount-row">
                      <label htmlFor={`dm-item-disc-${line.productId}`}>
                        প্রতি পিস ছাড় (৳)
                      </label>
                      <div className="dm-cart-line-discount-right">
                        {line.lineDiscountTotal > 0 && (
                          <span className="dm-badge dm-badge-emerald">
                            −{formatMoneyBn(line.lineDiscountTotal)}
                          </span>
                        )}
                        <input
                          id={`dm-item-disc-${line.productId}`}
                          data-unit-discount-id={line.productId}
                          type="text"
                          inputMode="numeric"
                          value={rawLine?.unitDiscountInput ?? "0"}
                          onChange={(e) => updateLineUnitDiscount(line.productId, e.target.value)}
                          className="dm-input dm-item-discount-input"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Totals & Payment Controls */}
          <div className="dm-cart-summary">
            {isSale && (activeServiceJob || visibleServiceJobs.length > 0) && (
              <div
                className="dm-discount-box"
                style={{
                  borderColor: "var(--dm-brand-200)",
                  background: "var(--dm-brand-50)",
                }}
              >
                <div className="dm-field" style={{ marginBottom: 8 }}>
                  <label htmlFor="dm-pos-srv-job" style={{ fontWeight: 700, fontSize: 12.5 }}>
                    সার্ভিসিং কাজের সাথে সংযুক্ত করুন (ঐচ্ছিক)
                  </label>
                  <select
                    id="dm-pos-srv-job"
                    value={selectedServiceJobId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedServiceJobId(nextId);
                      if (!nextId) {
                        setServiceChargeInput("0");
                      }
                    }}
                    className="dm-select"
                    style={{ minHeight: 38, fontSize: 13 }}
                  >
                    <option value="">সাধারণ বিক্রয় (সার্ভিসিং ছাড়া)</option>
                    {visibleServiceJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.jobNo} — {job.customerName} ({job.deviceName || job.title})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="dm-summary-row">
                  <label htmlFor="dm-pos-service-charge" style={{ fontWeight: 700 }}>
                    সার্ভিসিং চার্জ (৳)
                  </label>
                  <input
                    id="dm-pos-service-charge"
                    type="text"
                    inputMode="numeric"
                    value={serviceChargeInput}
                    onChange={(e) => setServiceChargeInput(e.target.value)}
                    className="dm-input"
                    style={{ width: 112, minHeight: 38, textAlign: "right" }}
                  />
                </div>
              </div>
            )}

            <div className="dm-summary-row">
              <span>পণ্যের মোট</span>
              <strong>{formatMoneyBn(subTotal)}</strong>
            </div>

            {serviceChargeVal > 0 && (
              <div className="dm-summary-row">
                <span>সার্ভিসিং চার্জ</span>
                <strong className="dm-text-emerald">+ {formatMoneyBn(serviceChargeVal)}</strong>
              </div>
            )}

            <div className="dm-discount-box">
              <div className="dm-summary-row">
                <label htmlFor="dm-pos-discount" style={{ fontWeight: 700 }}>
                  সকল পণ্যে ছাড় (৳)
                </label>
                <div className="dm-discount-mode-pills" role="group" aria-label="ছাড়ের ধরন">
                  <button
                    type="button"
                    aria-pressed={globalDiscountMode === "per_unit"}
                    onClick={() => setGlobalDiscountMode("per_unit")}
                    className={`dm-mini-seg${globalDiscountMode === "per_unit" ? " is-active" : ""}`}
                  >
                    প্রতি পিস
                  </button>
                  <button
                    type="button"
                    aria-pressed={globalDiscountMode === "flat"}
                    onClick={() => setGlobalDiscountMode("flat")}
                    className={`dm-mini-seg${globalDiscountMode === "flat" ? " is-active" : ""}`}
                  >
                    মোট ছাড়
                  </button>
                </div>
              </div>
              <div className="dm-summary-row" style={{ marginTop: 6 }}>
                <small className="dm-text-muted">
                  {globalDiscountMode === "per_unit"
                    ? "প্রতি ইউনিট থেকে বিয়োগ হবে"
                    : "মোট বিল থেকে একবার বিয়োগ হবে"}
                </small>
                <input
                  id="dm-pos-discount"
                  type="text"
                  inputMode="numeric"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="dm-input"
                  style={{ width: 112, minHeight: 38, textAlign: "right" }}
                />
              </div>
            </div>

            {discountVal > 0 && (
              <div className="dm-summary-row">
                <span>মোট ছাড়</span>
                <strong className="dm-text-emerald">− {formatMoneyBn(discountVal)}</strong>
              </div>
            )}

            <div className="dm-summary-row is-total">
              <span>সর্বমোট</span>
              <span data-pos-grand-total="true">{formatMoneyBn(grandTotal)}</span>
            </div>

            <div className="dm-seg-group" role="group" aria-label="পরিশোধের ধরন">
              <button
                type="button"
                onClick={() => setPayMode("full")}
                className={`dm-seg-btn${payMode === "full" ? " is-active" : ""}`}
                style={{ minHeight: 44 }}
              >
                সম্পূর্ণ
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayMode("partial");
                  if (parseAmountInput(partialPaidInput) <= 0 && grandTotal > 0) {
                    setPartialPaidInput(String(Math.round(grandTotal / 2)));
                  }
                }}
                className={`dm-seg-btn${payMode === "partial" ? " is-active" : ""}`}
                style={{ minHeight: 44 }}
              >
                আংশিক
              </button>
              <button
                type="button"
                onClick={() => setPayMode("due")}
                className={`dm-seg-btn${payMode === "due" ? " is-active" : ""}`}
                style={{ minHeight: 44 }}
              >
                বাকি
              </button>
            </div>

            <div className="dm-summary-row">
              <label htmlFor="dm-pos-paid">পরিশোধিত টাকা</label>
              {payMode === "partial" ? (
                <input
                  id="dm-pos-paid"
                  type="text"
                  inputMode="numeric"
                  value={partialPaidInput}
                  onChange={(e) => setPartialPaidInput(e.target.value)}
                  className="dm-input"
                  style={{ width: 120, minHeight: 38, textAlign: "right" }}
                />
              ) : (
                <strong className="dm-text-emerald">
                  {formatMoneyBn(paidAmount)}
                </strong>
              )}
            </div>

            <div className="dm-summary-row">
              <span>বাকি</span>
              <strong className={dueAmount > 0 ? "dm-text-rose" : "dm-text-emerald"}>
                {formatMoneyBn(dueAmount)}
              </strong>
            </div>

            {selectedSupplier && (
              <div className="dm-summary-row">
                <span>ক্রয়ের পর সাপ্লায়ারকে মোট দেনা</span>
                <strong>{formatMoneyBn(selectedSupplier.due + dueAmount)}</strong>
              </div>
            )}

            <div>
              <p
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--dm-ink-700)",
                  marginBottom: 6,
                }}
              >
                পেমেন্ট মাধ্যম
              </p>
              <div className="dm-pills">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    aria-pressed={method === pm.id}
                    onClick={() => setMethod(pm.id)}
                    className={`dm-pill${method === pm.id ? " is-active" : ""}`}
                    style={{ minHeight: 44, padding: "4px 12px" }}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="dm-field">
              <label htmlFor="dm-pos-account">
                {isSale ? "জমা অ্যাকাউন্ট" : "খরচের অ্যাকাউন্ট"}
              </label>
              <select
                id="dm-pos-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="dm-select"
              >
                {state.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {isAdmin ? `${acc.name} (${formatMoneyBn(acc.balance)})` : acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12.5,
                color: "var(--dm-muted)",
              }}
            >
              <span>তারিখ</span>
              <span className="dm-badge dm-badge-slate">{todayLabel}</span>
            </div>

            <button
              type="button"
              onClick={handleSubmitTrade}
              className="dm-btn dm-btn-primary dm-btn-full"
            >
              {isSale ? "বিক্রয় সম্পন্ন করুন" : "ক্রয় সম্পন্ন করুন"}
            </button>

            <button
              type="button"
              onClick={() => toast("খসড়া সংরক্ষণ করা হয়েছে")}
              className="dm-btn dm-btn-outline dm-btn-full"
            >
              খসড়া সংরক্ষণ
            </button>
          </div>
        </aside>
      </div>

      {/* Rules Modal */}
      {rulesOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={isSale ? "বিক্রয়ের নিয়ম" : "ক্রয়ের নিয়ম"}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRulesOpen(false);
          }}
        >
          <div className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">
                  {isSale ? "বিক্রয় করার নিয়ম" : "ক্রয় করার নিয়ম"}
                </h2>
                <p className="dm-modal-sub">দ্রুত বিলিং নির্দেশিকা</p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setRulesOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <p>১. প্রথমে তালিকা থেকে {isSale ? "কাস্টমার" : "সাপ্লায়ার"} নির্বাচন করুন বা `+ নতুন` দিয়ে যোগ করুন।</p>
              <p>২. পণ্যের নাম বা বারকোড দিয়ে খুঁজে `+ যোগ করুন` বাটনে চাপ দিন।</p>
              <p>৩. কার্টে পরিমাণ (+/-), সার্ভিসিং চার্জ (প্রযোজ্য হলে), ছাড় ও পরিশোধের মাধ্যম (নগদ / bKash / Nagad / ব্যাংক) ঠিক করে নিশ্চিত করুন।</p>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setRulesOpen(false)}
                className="dm-btn dm-btn-primary"
              >
                বুঝেছি
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Party Modal */}
      {quickPartyOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={isSale ? "নতুন কাস্টমার যোগ" : "নতুন সাপ্লায়ার যোগ"}
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickPartyOpen(false);
          }}
        >
          <form onSubmit={handleQuickPartySave} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">
                  {isSale ? "নতুন কাস্টমার" : "নতুন সাপ্লায়ার"}
                </h2>
                <p className="dm-modal-sub">দ্রুত নতুন তালিকা যুক্ত করুন</p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setQuickPartyOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-field">
                <label htmlFor="dm-qp-name">নাম *</label>
                <input
                  id="dm-qp-name"
                  required
                  value={partyNameInput}
                  onChange={(e) => setPartyNameInput(e.target.value)}
                  placeholder={isSale ? "যেমন: আল-আমিন স্টোর" : "যেমন: মেঘনা ডিপো"}
                  className="dm-input"
                />
              </div>
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-qp-mobile">মোবাইল</label>
                  <input
                    id="dm-qp-mobile"
                    value={partyMobileInput}
                    onChange={(e) => setPartyMobileInput(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-qp-area">এলাকা</label>
                  <input
                    id="dm-qp-area"
                    value={partyAreaInput}
                    onChange={(e) => setPartyAreaInput(e.target.value)}
                    placeholder="মিরপুর-১০"
                    className="dm-input"
                  />
                </div>
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setQuickPartyOpen(false)}
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

      {/* Quick Product Modal */}
      {quickProductOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="নতুন পণ্য যোগ"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickProductOpen(false);
          }}
        >
          <form onSubmit={handleQuickProductSave} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">নতুন পণ্য যোগ করুন</h2>
                <p className="dm-modal-sub">স্টকে যোগ হয়ে সরাসরি কার্টে যুক্ত হবে</p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setQuickProductOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-field">
                <label htmlFor="dm-qprd-name">পণ্যের নাম *</label>
                <input
                  id="dm-qprd-name"
                  required
                  value={prdName}
                  onChange={(e) => setPrdName(e.target.value)}
                  placeholder="যেমন: Hikvision 2MP Camera"
                  className="dm-input"
                />
              </div>
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-qprd-cat">ক্যাটাগরি</label>
                  <select
                    id="dm-qprd-cat"
                    value={prdCategory}
                    onChange={(e) => setPrdCategory(e.target.value)}
                    className="dm-select"
                  >
                    {managedCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-qprd-unit">ইউনিট</label>
                  <input
                    id="dm-qprd-unit"
                    value={prdUnit}
                    onChange={(e) => setPrdUnit(e.target.value)}
                    placeholder="পিস / মিটার / সেট"
                    className="dm-input"
                  />
                </div>
              </div>
              <div className={isAdmin ? "dm-form-row-2" : "dm-field"}>
                {isAdmin && (
                  <div className="dm-field">
                    <label htmlFor="dm-qprd-buy">ক্রয় দর (৳)</label>
                    <input
                      id="dm-qprd-buy"
                      value={prdPurchaseRate}
                      onChange={(e) => setPrdPurchaseRate(e.target.value)}
                      placeholder="250"
                      className="dm-input"
                    />
                  </div>
                )}
                <div className="dm-field">
                  <label htmlFor="dm-qprd-sell">বিক্রয় দর (৳)</label>
                  <input
                    id="dm-qprd-sell"
                    value={prdSaleRate}
                    onChange={(e) => setPrdSaleRate(e.target.value)}
                    placeholder="290"
                    className="dm-input"
                  />
                </div>
              </div>
              <div className="dm-field">
                <label htmlFor="dm-qprd-stock">প্রাথমিক স্টক</label>
                <input
                  id="dm-qprd-stock"
                  value={prdStock}
                  onChange={(e) => setPrdStock(e.target.value)}
                  className="dm-input"
                />
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setQuickProductOpen(false)}
                className="dm-btn dm-btn-outline"
              >
                বাতিল
              </button>
              <button type="submit" className="dm-btn dm-btn-primary">
                পণ্য সংরক্ষণ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Completed Sale Receipt / Invoice Modal */}
      {completedInvoice && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="বিক্রয় রসিদ ও ইনভয়েস"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseReceipt();
          }}
        >
          <div className="dm-modal dm-modal-lg">
            <div className="dm-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
                  <CheckCircle2 size={20} />
                </span>
                <div>
                  <h2 className="dm-modal-title">
                    রসিদ / ইনভয়েস: {completedInvoice.number}
                  </h2>
                  <p className="dm-modal-sub">
                    {activeOrg.name} · {completedInvoice.timeLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={handleCloseReceipt}
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div>
                    <strong style={{ display: "block" }}>
                      কাস্টমার: {completedInvoice.partyName}
                    </strong>
                    <span className="dm-text-muted">
                      মোবাইল: {completedInvoice.partyMobile}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {completedInvoice.serviceJobNo && (
                      <span className="dm-badge dm-badge-blue" style={{ marginRight: 6 }}>
                        সার্ভিসিং: {completedInvoice.serviceJobNo}
                      </span>
                    )}
                    <span
                      className={
                        completedInvoice.status === "paid"
                          ? "dm-badge dm-badge-emerald"
                          : completedInvoice.status === "partial"
                            ? "dm-badge dm-badge-amber"
                            : "dm-badge dm-badge-rose"
                      }
                    >
                      {completedInvoice.status === "paid"
                        ? "পরিশোধিত"
                        : completedInvoice.status === "partial"
                          ? "আংশিক পরিশোধ"
                          : "বাকি"}
                    </span>
                  </div>
                </div>
              </div>

              {completedInvoice.items && completedInvoice.items.length > 0 && (
                <div className="dm-table-wrap">
                  <table className="dm-table">
                    <thead>
                      <tr>
                        <th>পণ্য / যন্ত্রাংশ</th>
                        <th>পরিমাণ</th>
                        <th>দর</th>
                        <th>মোট</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedInvoice.items.map((item, idx) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="dm-cart-summary">
                {(completedInvoice.serviceCharge ?? 0) > 0 && (
                  <div className="dm-summary-row">
                    <span>সার্ভিসিং চার্জ</span>
                    <strong>{formatMoneyBn(completedInvoice.serviceCharge ?? 0)}</strong>
                  </div>
                )}
                {(completedInvoice.discount ?? 0) > 0 && (
                  <div className="dm-summary-row">
                    <span>ছাড়</span>
                    <strong className="dm-text-emerald">
                      − {formatMoneyBn(completedInvoice.discount ?? 0)}
                    </strong>
                  </div>
                )}
                <div className="dm-summary-row is-total">
                  <span>সর্বমোট বিল</span>
                  <span>{formatMoneyBn(completedInvoice.total)}</span>
                </div>
                <div className="dm-summary-row">
                  <span>জমা ({completedInvoice.method || "নগদ"})</span>
                  <strong className="dm-text-emerald">
                    {formatMoneyBn(completedInvoice.paid)}
                  </strong>
                </div>
                <div className="dm-summary-row">
                  <span>বাকি</span>
                  <strong
                    className={
                      completedInvoice.due > 0 ? "dm-text-rose" : "dm-text-emerald"
                    }
                  >
                    {formatMoneyBn(completedInvoice.due)}
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
                  toast(`${completedInvoice.number} রসিদ প্রিন্ট / PDF প্রস্তুত`);
                  if (typeof window !== "undefined") window.print();
                }}
                className="dm-btn dm-btn-outline"
              >
                <Printer size={16} aria-hidden="true" />
                <span>রসিদ প্রিন্ট / PDF</span>
              </button>
              <button
                type="button"
                onClick={handleCloseReceipt}
                className="dm-btn dm-btn-primary"
              >
                সম্পন্ন ও বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
