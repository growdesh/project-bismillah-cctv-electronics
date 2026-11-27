import {
  ArrowLeft,
  ArrowRightLeft,
  Banknote,
  Boxes,
  Building2,
  CircleHelp,
  CreditCard,
  Landmark,
  Receipt,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
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
import type { DemoLedgerEntry } from "../demoTypes";

type LedgerModalKind = "collection" | "payment" | "expense" | "cash";

/* ─────────────────────────── 1. MoneyScreen ─────────────────────────── */

export function MoneyScreen() {
  const { state, capabilities, go, addLedger, toast } = useDemo();
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [entryModal, setEntryModal] = useState<LedgerModalKind | null>(null);

  const [party, setParty] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [accountId, setAccountId] = useState<string>(
    () => state.accounts[0]?.id ?? "acc-cash",
  );
  const [cashDirection, setCashDirection] = useState<"in" | "out">("in");
  const [note, setNote] = useState<string>("");

  const totalDue = useMemo(
    () => state.customers.reduce((sum, c) => sum + c.due, 0),
    [state.customers],
  );
  const totalSupplierDue = useMemo(
    () => state.suppliers.reduce((sum, s) => sum + s.due, 0),
    [state.suppliers],
  );
  const totalWalletBalance = useMemo(
    () => state.accounts.reduce((sum, a) => sum + a.balance, 0),
    [state.accounts],
  );

  const openEntryModal = (kind: LedgerModalKind) => {
    setEntryModal(kind);
    setAmountInput("");
    setNote("");
    setCashDirection("in");
    if (kind === "collection") {
      setParty(state.customers.find((c) => c.due > 0)?.name ?? state.customers[0]?.name ?? "");
    } else if (kind === "payment") {
      setParty(state.suppliers.find((s) => s.due > 0)?.name ?? state.suppliers[0]?.name ?? "");
    } else if (kind === "expense") {
      setParty("দোকান ও পরিবহন খরচ");
    } else {
      setParty("ক্যাশ / ব্যাংক সমন্বয়");
    }
  };

  const handleSaveLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryModal) return;
    const amt = Math.round(parseAmountInput(amountInput));
    if (!party.trim() || amt <= 0) {
      toast("বিবরণ ও সঠিক টাকার পরিমাণ লিখুন");
      return;
    }

    const direction: DemoLedgerEntry["direction"] =
      entryModal === "collection"
        ? "in"
        : entryModal === "payment" || entryModal === "expense"
          ? "out"
          : cashDirection;

    const kind: DemoLedgerEntry["kind"] =
      entryModal === "cash" ? (cashDirection === "in" ? "sale" : "expense") : entryModal;

    addLedger({
      party,
      amount: amt,
      direction,
      kind,
      accountId,
      note: note.trim() || undefined,
    });
    setEntryModal(null);
  };

  const modalMeta = useMemo(() => {
    if (entryModal === "collection") {
      return { title: "কালেকশন (টাকা জমা)", sub: "কাস্টমারের বকেয়া আদায় করুন" };
    }
    if (entryModal === "payment") {
      return { title: "পেমেন্ট (সাপ্লায়ার)", sub: "সরবরাহকারীর দেনা পরিশোধ করুন" };
    }
    if (entryModal === "expense") {
      return { title: "খরচ লিখুন", sub: "দৈনন্দিন পরিচালনা খরচ রেকর্ড করুন" };
    }
    return { title: "ক্যাশ / ব্যাংক এন্ট্রি", sub: "অ্যাকাউন্টে জমা বা উত্তোলন লিখুন" };
  }, [entryModal]);

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
            <h1 className="dm-page-title">হিসাব</h1>
            <p className="dm-page-sub">কালেকশন, পেমেন্ট, খরচ ও লেনদেন খাতা</p>
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
            <span>হিসাব মেনু পরিচিতি</span>
          </button>
        </div>
      </div>

      {/* 4 Pastel Quick-Action Tiles */}
      <div className="dm-actions-grid">
        <button
          type="button"
          onClick={() => openEntryModal("collection")}
          className="dm-action-tile"
        >
          <span className="dm-action-icon dm-tone-emerald" aria-hidden="true">
            <Wallet size={20} />
          </span>
          <span className="dm-action-label">কালেকশন</span>
        </button>

        {capabilities.showSuppliers ? (
          <button
            type="button"
            onClick={() => openEntryModal("payment")}
            className="dm-action-tile"
          >
            <span className="dm-action-icon dm-tone-amber" aria-hidden="true">
              <CreditCard size={20} />
            </span>
            <span className="dm-action-label">পেমেন্ট</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => go("/accounts")}
            className="dm-action-tile"
          >
            <span className="dm-action-icon dm-tone-blue" aria-hidden="true">
              <Landmark size={20} />
            </span>
            <span className="dm-action-label">অ্যাকাউন্টস</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => openEntryModal("expense")}
          className="dm-action-tile"
        >
          <span className="dm-action-icon dm-tone-rose" aria-hidden="true">
            <Receipt size={20} />
          </span>
          <span className="dm-action-label">খরচ লিখুন</span>
        </button>

        <button
          type="button"
          onClick={() => openEntryModal("cash")}
          className="dm-action-tile"
        >
          <span className="dm-action-icon dm-tone-orange" aria-hidden="true">
            <ArrowRightLeft size={20} />
          </span>
          <span className="dm-action-label">ক্যাশ / ব্যাংক</span>
        </button>
      </div>

      {/* 2 Balance KPI Cards */}
      <div className="dm-kpi-grid">
        <button
          type="button"
          onClick={() => go("/customers")}
          className="dm-kpi-card"
        >
          <span className="dm-kpi-icon dm-tone-blue" aria-hidden="true">
            <Users size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মোট পাওনা</span>
            <span className="dm-kpi-value dm-text-blue">
              {formatMoneyBn(totalDue)}
            </span>
          </span>
        </button>

        {capabilities.showSuppliers ? (
          <button
            type="button"
            onClick={() => go("/suppliers")}
            className="dm-kpi-card"
          >
            <span className="dm-kpi-icon dm-tone-purple" aria-hidden="true">
              <Building2 size={19} />
            </span>
            <span className="dm-kpi-meta">
              <span className="dm-kpi-label">মোট দেনা</span>
              <span className="dm-kpi-value dm-text-amber">
                {formatMoneyBn(totalSupplierDue)}
              </span>
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => go("/accounts")}
            className="dm-kpi-card"
          >
            <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
              <Wallet size={19} />
            </span>
            <span className="dm-kpi-meta">
              <span className="dm-kpi-label">মোট ক্যাশ ও ব্যাংক</span>
              <span className="dm-kpi-value dm-text-emerald">
                {formatMoneyBn(totalWalletBalance)}
              </span>
            </span>
          </button>
        )}
      </div>

      {/* Recent Transactions Feed */}
      <div>
        <div className="dm-section-head">
          <h2>সাম্প্রতিক লেনদেন</h2>
          <button
            type="button"
            onClick={() => go("/accounts")}
            className="dm-section-link"
            style={{ minHeight: 44 }}
          >
            অ্যাকাউন্টস দেখুন →
          </button>
        </div>

        <div className="dm-feed-list">
          {state.ledger.map((entry) => {
            const isIn = entry.direction === "in";
            return (
              <div key={entry.id} className="dm-feed-item">
                <div className="dm-feed-meta">
                  <strong>{entry.party}</strong>
                  <small>
                    {formatDateBn(entry.date)}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </small>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <strong
                    className={isIn ? "dm-text-emerald" : "dm-text-rose"}
                    style={{ fontSize: 15, fontVariantNumeric: "tabular-nums" }}
                  >
                    {isIn ? "+" : "−"} {formatMoneyBn(entry.amount)}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ledger Entry Modal */}
      {entryModal && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={modalMeta.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEntryModal(null);
          }}
        >
          <form onSubmit={handleSaveLedger} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">{modalMeta.title}</h2>
                <p className="dm-modal-sub">{modalMeta.sub}</p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setEntryModal(null)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              {entryModal === "cash" && (
                <div className="dm-seg-group" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                  <button
                    type="button"
                    onClick={() => setCashDirection("in")}
                    className={`dm-seg-btn${cashDirection === "in" ? " is-active" : ""}`}
                    style={{ minHeight: 44 }}
                  >
                    জমা (Cash In)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashDirection("out")}
                    className={`dm-seg-btn${cashDirection === "out" ? " is-active" : ""}`}
                    style={{ minHeight: 44 }}
                  >
                    উত্তোলন (Cash Out)
                  </button>
                </div>
              )}

              <div className="dm-field">
                <label htmlFor="dm-ldg-party">
                  {entryModal === "collection"
                    ? "কাস্টমার"
                    : entryModal === "payment"
                      ? "সাপ্লায়ার"
                      : "বিবরণ / খাত *"}
                </label>
                {entryModal === "collection" ? (
                  <select
                    id="dm-ldg-party"
                    value={party}
                    onChange={(e) => setParty(e.target.value)}
                    className="dm-select"
                  >
                    {state.customers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} (বাকি: {formatMoneyBn(c.due)})
                      </option>
                    ))}
                  </select>
                ) : entryModal === "payment" ? (
                  <select
                    id="dm-ldg-party"
                    value={party}
                    onChange={(e) => setParty(e.target.value)}
                    className="dm-select"
                  >
                    {state.suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} (দেনা: {formatMoneyBn(s.due)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="dm-ldg-party"
                    required
                    value={party}
                    onChange={(e) => setParty(e.target.value)}
                    className="dm-input"
                  />
                )}
              </div>

              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-ldg-amt">টাকার পরিমাণ (৳) *</label>
                  <input
                    id="dm-ldg-amt"
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="2500"
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-ldg-acc">অ্যাকাউন্ট</label>
                  <select
                    id="dm-ldg-acc"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="dm-select"
                  >
                    {state.accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="dm-field">
                <label htmlFor="dm-ldg-note">নোট (ঐচ্ছিক)</label>
                <input
                  id="dm-ldg-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="লেনদেনের সংক্ষিপ্ত নোট"
                  className="dm-input"
                />
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setEntryModal(null)}
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

      {/* Help Modal */}
      {helpOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="হিসাব মেনু পরিচিতি"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHelpOpen(false);
          }}
        >
          <div className="dm-modal">
            <div className="dm-modal-head">
              <h2 className="dm-modal-title">হিসাব মেনু পরিচিতি</h2>
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
              <p>১. <strong>কালেকশন:</strong> কাস্টমারের বকেয়া আদায় করলে পাওনা কমে এবং অ্যাকাউন্টে টাকা যোগ হয়।</p>
              <p>২. <strong>খরচ লিখুন:</strong> বিদ্যুৎ, ভাড়া, পরিবহন বা স্টাফ খরচ আলাদা করে হিসাব রাখুন।</p>
              <p>৩. <strong>ক্যাশ / ব্যাংক:</strong> হাতে নগদ, ব্যাংক, bKash ও Nagad-এর ব্যালেন্স একসাথে আপডেট হয়।</p>
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

/* ─────────────────────────── 2. AccountsScreen ─────────────────────────── */

export function AccountsScreen() {
  const { state, go, addLedger, toast } = useDemo();
  const [modalDir, setModalDir] = useState<"in" | "out" | null>(null);
  const [accId, setAccId] = useState<string>(() => state.accounts[0]?.id ?? "acc-cash");
  const [amtInput, setAmtInput] = useState<string>("");
  const [partyInput, setPartyInput] = useState<string>("");

  const totalBalance = useMemo(
    () => state.accounts.reduce((s, a) => s + a.balance, 0),
    [state.accounts],
  );

  const accountVisual = (type: string) => {
    if (type === "bank") return { icon: Landmark, tone: "dm-tone-blue", text: "dm-text-blue" };
    if (type === "bkash") return { icon: Smartphone, tone: "dm-tone-rose", text: "dm-text-rose" };
    if (type === "nagad") return { icon: Smartphone, tone: "dm-tone-orange", text: "dm-text-amber" };
    return { icon: Banknote, tone: "dm-tone-emerald", text: "dm-text-emerald" };
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDir) return;
    const amt = Math.round(parseAmountInput(amtInput));
    if (amt <= 0) {
      toast("সঠিক টাকার পরিমাণ লিখুন");
      return;
    }
    addLedger({
      party: partyInput.trim() || (modalDir === "in" ? "অ্যাকাউন্ট জমা" : "অ্যাকাউন্ট উত্তোলন"),
      amount: amt,
      direction: modalDir,
      kind: modalDir === "in" ? "sale" : "expense",
      accountId: accId,
      note: modalDir === "in" ? "সরাসরি জমা" : "সরাসরি উত্তোলন",
    });
    setAmtInput("");
    setPartyInput("");
    setModalDir(null);
  };

  return (
    <div className="dm-stack-md">
      <div className="dm-page-head">
        <div className="dm-page-head-left">
          <button
            type="button"
            aria-label="হিসাব মেনুতে ফিরুন"
            onClick={() => go("/money")}
            className="dm-back-btn"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div>
            <h1 className="dm-page-title">অ্যাকাউন্টস</h1>
            <p className="dm-page-sub">
              সর্বমোট ব্যালেন্স: <strong className="dm-text-emerald">{formatMoneyBn(totalBalance)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 4 Wallet KPIs */}
      <div className="dm-kpi-grid">
        {state.accounts.map((acc) => {
          const vis = accountVisual(acc.type);
          const Icon = vis.icon;
          return (
            <div key={acc.id} className="dm-kpi-card" style={{ cursor: "default" }}>
              <span className={`dm-kpi-icon ${vis.tone}`} aria-hidden="true">
                <Icon size={19} />
              </span>
              <span className="dm-kpi-meta">
                <span className="dm-kpi-label">{acc.name}</span>
                <span className={`dm-kpi-value ${vis.text}`}>
                  {formatMoneyBn(acc.balance)}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Tiles */}
      <div className="dm-tiles-grid">
        <button
          type="button"
          onClick={() => setModalDir("in")}
          className="dm-module-tile"
        >
          <span className="dm-action-icon dm-tone-emerald" aria-hidden="true">
            <Wallet size={20} />
          </span>
          <strong>নগদ / ব্যাংক জমা</strong>
          <small className="dm-text-muted">যেকোনো অ্যাকাউন্টে টাকা যোগ</small>
        </button>

        <button
          type="button"
          onClick={() => setModalDir("out")}
          className="dm-module-tile"
        >
          <span className="dm-action-icon dm-tone-rose" aria-hidden="true">
            <CreditCard size={20} />
          </span>
          <strong>খরচ / উত্তোলন</strong>
          <small className="dm-text-muted">অ্যাকাউন্ট থেকে টাকা বিয়োগ</small>
        </button>

        <button
          type="button"
          onClick={() => go("/money")}
          className="dm-module-tile"
        >
          <span className="dm-action-icon dm-tone-blue" aria-hidden="true">
            <Receipt size={20} />
          </span>
          <strong>লেনদেন খাতা</strong>
          <small className="dm-text-muted">সাম্প্রতিক হিসাব দেখুন</small>
        </button>
      </div>

      {modalDir && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="অ্যাকাউন্ট এন্ট্রি"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalDir(null);
          }}
        >
          <form onSubmit={handleSave} className="dm-modal">
            <div className="dm-modal-head">
              <h2 className="dm-modal-title">
                {modalDir === "in" ? "অ্যাকাউন্টে জমা" : "অ্যাকাউন্ট থেকে উত্তোলন"}
              </h2>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setModalDir(null)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-field">
                <label htmlFor="dm-acc-sel">অ্যাকাউন্ট নির্বাচন</label>
                <select
                  id="dm-acc-sel"
                  value={accId}
                  onChange={(e) => setAccId(e.target.value)}
                  className="dm-select"
                >
                  {state.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatMoneyBn(a.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="dm-field">
                <label htmlFor="dm-acc-party">বিবরণ</label>
                <input
                  id="dm-acc-party"
                  value={partyInput}
                  onChange={(e) => setPartyInput(e.target.value)}
                  placeholder="যেমন: মালিক মূলধন জমা / অফিস খরচ"
                  className="dm-input"
                />
              </div>
              <div className="dm-field">
                <label htmlFor="dm-acc-amt">পরিমাণ (৳) *</label>
                <input
                  id="dm-acc-amt"
                  required
                  value={amtInput}
                  onChange={(e) => setAmtInput(e.target.value)}
                  placeholder="5000"
                  className="dm-input"
                />
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setModalDir(null)}
                className="dm-btn dm-btn-outline"
              >
                বাতিল
              </button>
              <button type="submit" className="dm-btn dm-btn-primary">
                নিশ্চিত করুন
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── 3. ReportsScreen ─────────────────────────── */

type ReportKey =
  | "sales"
  | "purchases"
  | "stock"
  | "pnl"
  | "receivables"
  | "payables"
  | "expenses"
  | "cashbank"
  | "returns";

export function ReportsScreen() {
  const { state, capabilities, go } = useDemo();
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);

  const periodDays = period === "today" ? 1 : period === "week" ? 7 : 30;

  const isInRange = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return true;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const days = diffMs / (1000 * 60 * 60 * 24);
    if (period === "today") {
      return d.toDateString() === now.toDateString();
    }
    return days <= periodDays;
  };

  const metrics = useMemo(() => {
    const salesList = state.invoices.filter((i) => isInRange(i.date));
    const purchaseList = state.purchases.filter((p) => isInRange(p.date));
    const expenseList = state.ledger.filter(
      (l) => l.kind === "expense" && isInRange(l.date),
    );

    const totalSales = salesList.reduce((s, i) => s + i.total, 0);
    const totalPurchases = purchaseList.reduce((s, p) => s + p.total, 0);
    const totalExpenses = expenseList.reduce((s, l) => s + l.amount, 0);
    const totalCustomerDue = state.customers.reduce((s, c) => s + c.due, 0);
    const totalSupplierDue = state.suppliers.reduce((s, sp) => s + sp.due, 0);
    const stockCostValue = state.products.reduce(
      (s, p) => s + (p.paidStock + p.freeStock) * p.purchaseRate,
      0,
    );
    const stockSaleValue = state.products.reduce(
      (s, p) => s + (p.paidStock + p.freeStock) * p.saleRate,
      0,
    );
    const totalBalance = state.accounts.reduce((s, a) => s + a.balance, 0);
    const estGrossMargin = Math.round(totalSales * 0.14);
    const netEstimate = estGrossMargin - totalExpenses;

    return {
      salesList,
      purchaseList,
      expenseList,
      totalSales,
      totalPurchases,
      totalExpenses,
      totalCustomerDue,
      totalSupplierDue,
      stockCostValue,
      stockSaleValue,
      totalBalance,
      estGrossMargin,
      netEstimate,
    };
  }, [state, period]);

  const reportTiles: {
    key: ReportKey;
    label: string;
    tone: string;
    icon: typeof ShoppingCart;
  }[] = [
    { key: "sales", label: "বিক্রয় রিপোর্ট", tone: "dm-tone-emerald", icon: ShoppingCart },
    { key: "purchases", label: "ক্রয় রিপোর্ট", tone: "dm-tone-purple", icon: ShoppingBag },
    { key: "stock", label: "স্টক রিপোর্ট", tone: "dm-tone-amber", icon: Boxes },
    { key: "pnl", label: "লাভ-ক্ষতি (P&L)", tone: "dm-tone-emerald", icon: TrendingUp },
    { key: "receivables", label: "বাকি ও পাওনা", tone: "dm-tone-rose", icon: Users },
    {
      key: "payables",
      label: capabilities.showSuppliers ? "দেনা ও সাপ্লায়ার" : "কোম্পানি ও ব্র্যান্ড",
      tone: "dm-tone-blue",
      icon: Building2,
    },
    { key: "expenses", label: "খরচের রিপোর্ট", tone: "dm-tone-orange", icon: Receipt },
    { key: "cashbank", label: "ক্যাশ ও ব্যাংক", tone: "dm-tone-teal", icon: Wallet },
    { key: "returns", label: "সেলস রিটার্ন", tone: "dm-tone-indigo", icon: RotateCcw },
  ];

  const activeTitle =
    reportTiles.find((t) => t.key === activeReport)?.label ?? "রিপোর্ট বিস্তারিত";

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
            <h1 className="dm-page-title">রিপোর্ট</h1>
            <p className="dm-page-sub">এক নজরে ব্যবসার পূর্ণাঙ্গ বিশ্লেষণ</p>
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
            <span>রিপোর্ট পড়ার নিয়ম</span>
          </button>
        </div>
      </div>

      {/* Period Filter Pills */}
      <div className="dm-pills" role="group" aria-label="সময়কাল">
        {[
          { id: "today" as const, label: "আজ" },
          { id: "week" as const, label: "সপ্তাহ" },
          { id: "month" as const, label: "মাস" },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={`dm-pill${period === p.id ? " is-active" : ""}`}
            style={{ minHeight: 44 }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 4 Summary KPIs */}
      <div className="dm-kpi-grid">
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
            <ShoppingCart size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মোট বিক্রি</span>
            <span className="dm-kpi-value dm-text-emerald">
              {formatMoneyBn(metrics.totalSales)}
            </span>
          </span>
        </div>

        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-purple" aria-hidden="true">
            <ShoppingBag size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মোট ক্রয়</span>
            <span className="dm-kpi-value dm-text-blue">
              {formatMoneyBn(metrics.totalPurchases)}
            </span>
          </span>
        </div>

        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-blue" aria-hidden="true">
            <Users size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মোট পাওনা</span>
            <span className="dm-kpi-value dm-text-rose">
              {formatMoneyBn(metrics.totalCustomerDue)}
            </span>
          </span>
        </div>

        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-indigo" aria-hidden="true">
            <Building2 size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">
              {capabilities.showSuppliers ? "মোট দেনা" : "মোট খরচ"}
            </span>
            <span className="dm-kpi-value dm-text-rose">
              {formatMoneyBn(
                capabilities.showSuppliers
                  ? metrics.totalSupplierDue
                  : metrics.totalExpenses,
              )}
            </span>
          </span>
        </div>
      </div>

      {/* 3x3 Grid of 9 Report Tiles */}
      <div className="dm-tiles-grid">
        {reportTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => setActiveReport(tile.key)}
              className="dm-module-tile"
            >
              <span className={`dm-action-icon ${tile.tone}`} aria-hidden="true">
                <Icon size={21} />
              </span>
              <strong>{tile.label}</strong>
            </button>
          );
        })}
      </div>

      {/* Interactive Report Modal */}
      {activeReport && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={activeTitle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveReport(null);
          }}
        >
          <div className="dm-modal dm-modal-lg">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">{activeTitle}</h2>
                <p className="dm-modal-sub">
                  সময়কাল: {period === "today" ? "আজ" : period === "week" ? "সপ্তাহ" : "মাস"}
                </p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setActiveReport(null)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="dm-modal-body">
              {activeReport === "sales" && (
                <>
                  <div className="dm-feed-item">
                    <span>মোট ইনভয়েস ({toBn(metrics.salesList.length)}টি)</span>
                    <strong className="dm-text-emerald">
                      {formatMoneyBn(metrics.totalSales)}
                    </strong>
                  </div>
                  <div className="dm-table-wrap">
                    <table className="dm-table">
                      <thead>
                        <tr>
                          <th>ইনভয়েস</th>
                          <th>কাস্টমার</th>
                          <th>মোট</th>
                          <th>জমা</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.salesList.map((inv) => (
                          <tr key={inv.id}>
                            <td>{inv.number}</td>
                            <td>{inv.partyName}</td>
                            <td>{formatMoneyBn(inv.total)}</td>
                            <td className="dm-text-emerald">{formatMoneyBn(inv.paid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {activeReport === "purchases" && (
                <div className="dm-feed-list">
                  <div className="dm-feed-item">
                    <span>মোট ক্রয় ({toBn(metrics.purchaseList.length)}টি)</span>
                    <strong>{formatMoneyBn(metrics.totalPurchases)}</strong>
                  </div>
                  {metrics.purchaseList.map((pur) => (
                    <div key={pur.id} className="dm-feed-item">
                      <div className="dm-feed-meta">
                        <strong>{pur.number}</strong>
                        <small>{pur.partyName}</small>
                      </div>
                      <strong>{formatMoneyBn(pur.total)}</strong>
                    </div>
                  ))}
                </div>
              )}

              {activeReport === "stock" && (
                <div className="dm-feed-list">
                  <div className="dm-feed-item">
                    <span>ক্রয় মূল্য অনুযায়ী স্টক</span>
                    <strong>{formatMoneyBn(metrics.stockCostValue)}</strong>
                  </div>
                  <div className="dm-feed-item">
                    <span>বিক্রয় মূল্য অনুযায়ী সম্ভাব্য আয়</span>
                    <strong className="dm-text-emerald">
                      {formatMoneyBn(metrics.stockSaleValue)}
                    </strong>
                  </div>
                  <div className="dm-feed-item">
                    <span>মোট পণ্য সংখ্যা</span>
                    <strong>{formatNumberBn(state.products.length)}টি</strong>
                  </div>
                </div>
              )}

              {activeReport === "pnl" && (
                <div className="dm-feed-list">
                  <div className="dm-feed-item">
                    <span>নির্বাচিত সময়ে বিক্রি</span>
                    <strong>{formatMoneyBn(metrics.totalSales)}</strong>
                  </div>
                  <div className="dm-feed-item">
                    <span>আনুমানিক গ্রস লাভ</span>
                    <strong className="dm-text-emerald">
                      {formatMoneyBn(metrics.estGrossMargin)}
                    </strong>
                  </div>
                  <div className="dm-feed-item">
                    <span>মোট খরচ</span>
                    <strong className="dm-text-rose">
                      − {formatMoneyBn(metrics.totalExpenses)}
                    </strong>
                  </div>
                  <div className="dm-feed-item">
                    <strong>নিট আনুমানিক লাভ</strong>
                    <strong
                      className={
                        metrics.netEstimate >= 0 ? "dm-text-emerald" : "dm-text-rose"
                      }
                    >
                      {formatMoneyBn(metrics.netEstimate)}
                    </strong>
                  </div>
                </div>
              )}

              {activeReport === "receivables" && (
                <div className="dm-feed-list">
                  {state.customers
                    .filter((c) => c.due > 0)
                    .map((c) => (
                      <div key={c.id} className="dm-feed-item">
                        <div className="dm-feed-meta">
                          <strong>{c.name}</strong>
                          <small>
                            {c.mobile} · {c.area}
                          </small>
                        </div>
                        <strong className="dm-text-rose">{formatMoneyBn(c.due)}</strong>
                      </div>
                    ))}
                </div>
              )}

              {activeReport === "payables" && (
                <div className="dm-feed-list">
                  {capabilities.showSuppliers
                    ? state.suppliers.map((s) => (
                        <div key={s.id} className="dm-feed-item">
                          <div className="dm-feed-meta">
                            <strong>{s.name}</strong>
                            <small>{s.area}</small>
                          </div>
                          <strong className={s.due > 0 ? "dm-text-rose" : "dm-text-emerald"}>
                            {formatMoneyBn(s.due)}
                          </strong>
                        </div>
                      ))
                    : state.companies.map((c) => (
                        <div key={c.id} className="dm-feed-item">
                          <div className="dm-feed-meta">
                            <strong>{c.name}</strong>
                            <small>কোড: {c.code}</small>
                          </div>
                          <span>{c.mobile}</span>
                        </div>
                      ))}
                </div>
              )}

              {activeReport === "expenses" && (
                <div className="dm-feed-list">
                  {metrics.expenseList.length === 0 ? (
                    <p className="dm-empty-inline">এই সময়ে কোনো খরচ এন্ট্রি নেই</p>
                  ) : (
                    metrics.expenseList.map((e) => (
                      <div key={e.id} className="dm-feed-item">
                        <div className="dm-feed-meta">
                          <strong>{e.party}</strong>
                          <small>{formatDateBn(e.date)}</small>
                        </div>
                        <strong className="dm-text-rose">
                          − {formatMoneyBn(e.amount)}
                        </strong>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeReport === "cashbank" && (
                <div className="dm-feed-list">
                  <div className="dm-feed-item">
                    <strong>সর্বমোট ক্যাশ ও ব্যাংক</strong>
                    <strong className="dm-text-emerald">
                      {formatMoneyBn(metrics.totalBalance)}
                    </strong>
                  </div>
                  {state.accounts.map((acc) => (
                    <div key={acc.id} className="dm-feed-item">
                      <span>{acc.name}</span>
                      <strong>{formatMoneyBn(acc.balance)}</strong>
                    </div>
                  ))}
                </div>
              )}

              {activeReport === "returns" && (
                <div className="dm-feed-list">
                  {state.returns.map((r) => (
                    <div key={r.id} className="dm-feed-item">
                      <div className="dm-feed-meta">
                        <strong>{r.number}</strong>
                        <small>
                          {r.customerName} · {r.invoiceNo}
                        </small>
                      </div>
                      <strong>{formatMoneyBn(r.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="dm-btn dm-btn-primary"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {rulesOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="রিপোর্ট পড়ার নিয়ম"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRulesOpen(false);
          }}
        >
          <div className="dm-modal">
            <div className="dm-modal-head">
              <h2 className="dm-modal-title">রিপোর্ট পড়ার নিয়ম</h2>
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
              <p>১. উপরে `আজ` / `সপ্তাহ` / `মাস` বাটন চাপলে রিপোর্টের সময়কাল সাথে সাথে বদলাবে।</p>
              <p>২. নিচের যেকোনো রিপোর্ট কার্ডে ক্লিক করলে বিস্তারিত হিসাব মডালে দেখা যাবে।</p>
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
    </div>
  );
}
