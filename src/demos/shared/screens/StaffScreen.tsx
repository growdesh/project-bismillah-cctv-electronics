import {
  ArrowLeft,
  Banknote,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { normalizePasswordInput, normalizePhoneInput, SERVICING_DEPT_PHONE } from "../../../lib/auth";
import {
  formatDateBn,
  formatMoneyBn,
  parseAmountInput,
  toBn,
} from "../../../lib/global";
import { useDemo } from "../demoStore";
import type { PosEmployee } from "../demoTypes";

const PAYMENT_METHODS = [
  { id: "cash", label: "নগদ" },
  { id: "bkash", label: "bKash" },
  { id: "nagad", label: "Nagad" },
  { id: "bank", label: "ব্যাংক" },
] as const;

function currentMonthLabelBn(): string {
  const months = [
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
  const now = new Date();
  return `${months[now.getMonth()]} ${toBn(now.getFullYear())}`;
}

export function StaffScreen() {
  const {
    state,
    currentUser,
    go,
    addEmployee,
    updateEmployeePassword,
    deleteEmployee,
    paySalary,
    toast,
  } = useDemo();
  const [tab, setTab] = useState<"staff" | "history">("staff");
  const [search, setSearch] = useState<string>("");

  // Add staff modal
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [monthlySalary, setMonthlySalary] = useState<string>("");
  const [roleType, setRoleType] = useState<"staff" | "servicing">("staff");

  // Direct Admin Password Assignment Modal (No reset/forgot-password flow)
  const [pwTarget, setPwTarget] = useState<PosEmployee | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>("");
  const [showStaffPw, setShowStaffPw] = useState<boolean>(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState<boolean>(false);

  // Pay salary modal
  const [payTarget, setPayTarget] = useState<PosEmployee | null>(null);
  const [payMonth, setPayMonth] = useState<string>(() => currentMonthLabelBn());
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [payAccountId, setPayAccountId] = useState<string>(
    () => state.accounts[0]?.id ?? "acc-cash",
  );
  const [payNote, setPayNote] = useState<string>("");

  const kpis = useMemo(() => {
    const monthlyCommitment = state.employees.reduce((sum, emp) => sum + emp.monthlySalary, 0);
    const totalPaid = state.salaryPayments.reduce((sum, p) => sum + p.amount, 0);
    return {
      staffCount: state.employees.length,
      monthlyCommitment,
      totalPaid,
    };
  }, [state.employees, state.salaryPayments]);

  const paidByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of state.salaryPayments) {
      map.set(payment.employeeId, (map.get(payment.employeeId) ?? 0) + payment.amount);
    }
    return map;
  }, [state.salaryPayments]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.employees;
    return state.employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.phone.toLowerCase().includes(q) ||
        emp.address.toLowerCase().includes(q),
    );
  }, [state.employees, search]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.salaryPayments;
    return state.salaryPayments.filter(
      (p) =>
        p.employeeName.toLowerCase().includes(q) ||
        p.month.toLowerCase().includes(q) ||
        (p.note ?? "").toLowerCase().includes(q),
    );
  }, [state.salaryPayments, search]);

  const normalizedNewPhone = useMemo(() => normalizePhoneInput(phone), [phone]);

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("কর্মীর নাম লিখুন");
      return;
    }
    if (!normalizedNewPhone) {
      toast("কর্মীর ফোন নম্বর লিখুন");
      return;
    }
    const salaryNum = Math.max(0, Math.round(parseAmountInput(monthlySalary)));
    if (salaryNum <= 0) {
      toast("মাসিক বেতনের সঠিক পরিমাণ লিখুন");
      return;
    }
    // Every staff member's mobile number and initial password are identical
    addEmployee({
      name,
      phone: normalizedNewPhone,
      address: address || "—",
      monthlySalary: salaryNum,
      password: normalizedNewPhone,
      roleType,
    });
    setName("");
    setPhone("");
    setAddress("");
    setMonthlySalary("");
    setRoleType("staff");
    setAddOpen(false);
  };

  const openPasswordModal = (emp: PosEmployee) => {
    setPwTarget(emp);
    setNewPasswordInput("");
    setShowStaffPw(false);
    setPwError(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwTarget || savingPw) return;
    const clean = normalizePasswordInput(newPasswordInput);
    if (clean.length < 4) {
      setPwError("নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে");
      return;
    }
    setPwError(null);
    setSavingPw(true);
    try {
      const ok = await updateEmployeePassword(pwTarget.id, clean);
      if (ok) {
        setPwTarget(null);
        setNewPasswordInput("");
        setPwError(null);
      } else {
        setPwError("পাসওয়ার্ড সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
      }
    } finally {
      setSavingPw(false);
    }
  };

  const openPayModal = (emp: PosEmployee) => {
    setPayTarget(emp);
    setPayMonth(currentMonthLabelBn());
    setPayAmount(String(emp.monthlySalary));
    setPayMethod("cash");
    setPayAccountId(state.accounts[0]?.id ?? "acc-cash");
    setPayNote("");
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    const amountNum = Math.max(0, Math.round(parseAmountInput(payAmount)));
    if (amountNum <= 0) {
      toast("বেতনের সঠিক পরিমাণ লিখুন");
      return;
    }
    paySalary({
      employeeId: payTarget.id,
      month: payMonth.trim() || currentMonthLabelBn(),
      amount: amountNum,
      accountId: payAccountId,
      method: payMethod,
      note: payNote,
    });
    setPayTarget(null);
  };

  if (currentUser.role !== "admin") {
    return (
      <div className="dm-card dm-empty-state">
        <Lock size={30} aria-hidden="true" />
        <strong>শুধুমাত্র অ্যাডমিন স্টাফ ও পাসওয়ার্ড ব্যবস্থাপনা দেখতে পারবেন</strong>
        <button type="button" onClick={() => go("/")} className="dm-btn dm-btn-primary">
          ড্যাশবোর্ডে ফিরুন
        </button>
      </div>
    );
  }

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
            <h1 className="dm-page-title">স্টাফ, লগইন অ্যাকাউন্ট ও বেতন</h1>
            <p className="dm-page-sub">
              কর্মী যোগ, লগইন পাসওয়ার্ড নির্ধারণ (নম্বর ও প্রাথমিক পাসওয়ার্ড একই) এবং বেতন পরিশোধ
            </p>
          </div>
        </div>
        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="dm-btn dm-btn-primary"
          >
            <Plus size={17} aria-hidden="true" />
            <span>নতুন স্টাফ</span>
          </button>
        </div>
      </div>

      {/* Dedicated Servicing Department Account Info Banner */}
      <div className="dm-service-banner" role="region" aria-label="সার্ভিসিং বিভাগের আলাদা অ্যাকাউন্ট">
        <div className="dm-service-banner-left">
          <Wrench size={18} aria-hidden="true" />
          <div>
            <strong>সার্ভিসিং বিভাগের আলাদা লগইন অ্যাকাউন্ট সক্রিয়</strong>
            <small>
              লগইন নম্বর ও পাসওয়ার্ড: <strong>{SERVICING_DEPT_PHONE}</strong> · সার্ভিসিং কাজ ও বিক্রয় করতে পারবে (রিপোর্ট, লাভ ও অর্থনৈতিক তথ্য গোপন থাকবে)। পাসওয়ার্ড রিসেট অপশন বন্ধ এবং পাসওয়ার্ড হ্যাশ (scrypt) সুরক্ষিত।
            </small>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="dm-kpi-grid-3">
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-blue" aria-hidden="true">
            <Users size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মোট স্টাফ ও অ্যাকাউন্ট</span>
            <span className="dm-kpi-value dm-text-blue">{toBn(kpis.staffCount)}জন</span>
          </span>
        </div>
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-amber" aria-hidden="true">
            <Wallet size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মাসিক মোট বেতন</span>
            <span className="dm-kpi-value dm-text-amber">
              {formatMoneyBn(kpis.monthlyCommitment)}
            </span>
          </span>
        </div>
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
            <Banknote size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মোট পরিশোধিত বেতন</span>
            <span className="dm-kpi-value dm-text-emerald">
              {formatMoneyBn(kpis.totalPaid)}
            </span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="dm-tabs" role="tablist" aria-label="স্টাফ সেকশন">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "staff"}
          onClick={() => setTab("staff")}
          className={`dm-tab${tab === "staff" ? " is-active" : ""}`}
        >
          স্টাফ ও লগইন অ্যাকাউন্ট ({toBn(state.employees.length)})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          onClick={() => setTab("history")}
          className={`dm-tab${tab === "history" ? " is-active" : ""}`}
        >
          বেতন পরিশোধ ({toBn(state.salaryPayments.length)})
        </button>
      </div>

      {/* Search */}
      <div className="dm-search-row">
        <div className="dm-search-box">
          <Search size={17} className="dm-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "staff"
                ? "কর্মীর নাম, ফোন বা ঠিকানা খুঁজুন…"
                : "কর্মীর নাম বা মাসের নাম খুঁজুন…"
            }
            className="dm-search-input"
          />
        </div>
      </div>

      {tab === "staff" ? (
        filteredEmployees.length === 0 ? (
          <div className="dm-card dm-empty-state">
            <Users size={30} aria-hidden="true" />
            <p>কোনো স্টাফ পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="dm-order-grid">
            {filteredEmployees.map((emp) => {
              const paidTotal = paidByEmployee.get(emp.id) ?? 0;
              const isServicingDept = emp.roleType === "servicing" || emp.id === "emp-servicing";
              return (
                <article key={emp.id} className="dm-order-card">
                  <div className="dm-order-head">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                        <span
                          className={`dm-badge ${
                            isServicingDept ? "dm-badge-blue" : "dm-badge-emerald"
                          }`}
                        >
                          {isServicingDept ? "সার্ভিসিং বিভাগ রোল" : "স্টাফ রোল"}
                        </span>
                        <span className="dm-badge dm-badge-slate">
                          <ShieldCheck size={12} aria-hidden="true" />
                          লগইন সক্রিয় (পাসওয়ার্ড হ্যাশড)
                        </span>
                      </div>
                      <strong style={{ display: "block", fontSize: 16 }}>{emp.name}</strong>
                      <div className="dm-meta-inline">
                        <span>
                          <Phone size={13} aria-hidden="true" />
                          লগইন নম্বর: <strong>{emp.phone}</strong>
                        </span>
                        <span>
                          <MapPin size={13} aria-hidden="true" />
                          {emp.address}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="dm-order-metrics">
                    <div>
                      <span>মাসিক বেতন</span>
                      <strong>{formatMoneyBn(emp.monthlySalary)}</strong>
                    </div>
                    <div>
                      <span>মোট পরিশোধ</span>
                      <strong className="dm-text-emerald">{formatMoneyBn(paidTotal)}</strong>
                    </div>
                    <div>
                      <span>প্রাথমিক পাসওয়ার্ড</span>
                      <strong className="dm-text-blue">নম্বরের সমান</strong>
                    </div>
                  </div>

                  <div className="dm-order-foot">
                    <button
                      type="button"
                      onClick={() => openPayModal(emp)}
                      className="dm-btn dm-btn-primary dm-btn-sm"
                      style={{ minHeight: 44 }}
                    >
                      <Banknote size={16} aria-hidden="true" />
                      <span>বেতন প্রদান</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openPasswordModal(emp)}
                      className="dm-btn dm-btn-soft-emerald dm-btn-sm"
                      style={{ minHeight: 44 }}
                    >
                      <KeyRound size={15} aria-hidden="true" />
                      <span>পাসওয়ার্ড প্রদান</span>
                    </button>
                    {emp.id !== "emp-servicing" && (
                      <button
                        type="button"
                        aria-label={`${emp.name} মুছে ফেলুন`}
                        onClick={() => deleteEmployee(emp.id)}
                        className="dm-icon-btn"
                        style={{ width: 44, height: 44, color: "var(--dm-rose)" }}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : (
        <div className="dm-table-wrap">
          <table className="dm-table">
            <thead>
              <tr>
                <th>কর্মী</th>
                <th>মাস</th>
                <th>মাধ্যম</th>
                <th>তারিখ</th>
                <th>পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="dm-empty-inline">
                    কোনো বেতন পরিশোধের এন্ট্রি পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong style={{ display: "block" }}>{payment.employeeName}</strong>
                      {payment.note && <small className="dm-text-muted">{payment.note}</small>}
                    </td>
                    <td>
                      <span className="dm-badge dm-badge-blue">{payment.month}</span>
                    </td>
                    <td>{payment.method}</td>
                    <td>{formatDateBn(payment.paidAt, true)}</td>
                    <td>
                      <strong className="dm-text-rose">{formatMoneyBn(payment.amount)}</strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      {addOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="নতুন স্টাফ যোগ করুন"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
        >
          <form onSubmit={handleAddStaff} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">নতুন স্টাফ ও লগইন অ্যাকাউন্ট</h2>
                <p className="dm-modal-sub">
                  কর্মীর মোবাইল নম্বর ও প্রাথমিক পাসওয়ার্ড একই হবে (নিরাপদভাবে হ্যাশ করা)
                </p>
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
                <label htmlFor="dm-staff-name">কর্মীর নাম *</label>
                <input
                  id="dm-staff-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: মো. হাসান আলী"
                  className="dm-input"
                />
              </div>

              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-staff-phone">ফোন নম্বর (লগইন আইডি) *</label>
                  <input
                    id="dm-staff-phone"
                    required
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-staff-pw">প্রাথমিক পাসওয়ার্ড (নম্বরের সমান) *</label>
                  <input
                    id="dm-staff-pw"
                    readOnly
                    value={normalizedNewPhone}
                    placeholder="ফোন নম্বর লিখলে স্বয়ংক্রিয়ভাবে বসবে"
                    className="dm-input"
                    style={{ background: "var(--dm-surface-tint)", fontWeight: 700 }}
                  />
                </div>
              </div>

              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-staff-salary">মাসিক বেতন (৳) *</label>
                  <input
                    id="dm-staff-salary"
                    required
                    inputMode="numeric"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                    placeholder="15000"
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-staff-role">অ্যাকাউন্ট রোল</label>
                  <select
                    id="dm-staff-role"
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value as "staff" | "servicing")}
                    className="dm-select"
                  >
                    <option value="staff">স্টাফ (অ্যাসাইন করা সার্ভিসিং ও বিক্রয়)</option>
                    <option value="servicing">সার্ভিসিং বিভাগ (সার্ভিসিং ও বিক্রয়)</option>
                  </select>
                </div>
              </div>

              <div className="dm-field">
                <label htmlFor="dm-staff-address">ঠিকানা</label>
                <input
                  id="dm-staff-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: জিন্দাবাজার, সিলেট"
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

      {/* Admin Direct Password Assignment Modal (No reset link) */}
      {pwTarget && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="পাসওয়ার্ড প্রদান"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPwTarget(null);
          }}
        >
          <form onSubmit={handlePasswordSubmit} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">লগইন পাসওয়ার্ড নির্ধারণ</h2>
                <p className="dm-modal-sub">
                  {pwTarget.name} ({pwTarget.phone}) · শুধুমাত্র অ্যাডমিন পাসওয়ার্ড নির্ধারণ করতে পারবেন (পাসওয়ার্ড রিসেট নিষ্ক্রিয়)
                </p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setPwTarget(null)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              {pwError && (
                <div
                  role="alert"
                  className="dm-card dm-card-pad-sm"
                  style={{
                    background: "#fef2f2",
                    borderColor: "#fecaca",
                    color: "#991b1b",
                    marginBottom: 12,
                    fontSize: 13.5,
                    fontWeight: 600,
                  }}
                >
                  {pwError}
                </div>
              )}
              <div className="dm-field">
                <label htmlFor="dm-set-staff-pw">নতুন পাসওয়ার্ড লিখুন *</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    id="dm-set-staff-pw"
                    type={showStaffPw ? "text" : "password"}
                    required
                    minLength={4}
                    value={newPasswordInput}
                    onChange={(e) => {
                      setNewPasswordInput(e.target.value);
                      if (pwError) setPwError(null);
                    }}
                    placeholder="কমপক্ষে ৪ অক্ষরের নতুন পাসওয়ার্ড"
                    className="dm-input"
                    style={{ flex: 1, minHeight: 44 }}
                  />
                  <button
                    type="button"
                    aria-label={showStaffPw ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                    onClick={() => setShowStaffPw((prev) => !prev)}
                    className="dm-icon-btn"
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    {showStaffPw ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  <small className="dm-text-muted">
                    নতুন পাসওয়ার্ড সেট করলে পূর্বের পাসওয়ার্ড বাতিল হয়ে যাবে।
                  </small>
                  <button
                    type="button"
                    onClick={() => {
                      setNewPasswordInput(normalizePhoneInput(pwTarget.phone));
                      setPwError(null);
                    }}
                    className="dm-inline-link-btn"
                    style={{ minHeight: 44 }}
                  >
                    ডিফল্ট নম্বর ({pwTarget.phone}) বসান
                  </button>
                </div>
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setPwTarget(null)}
                className="dm-btn dm-btn-outline"
                style={{ minHeight: 44 }}
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={savingPw}
                className="dm-btn dm-btn-primary"
                style={{ minHeight: 44 }}
              >
                {savingPw ? "সংরক্ষণ হচ্ছে…" : "পাসওয়ার্ড সংরক্ষণ করুন"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pay Salary Modal */}
      {payTarget && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="বেতন প্রদান"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayTarget(null);
          }}
        >
          <form onSubmit={handlePaySubmit} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">বেতন প্রদান করুন</h2>
                <p className="dm-modal-sub">
                  {payTarget.name} · নির্ধারিত মাসিক বেতন {formatMoneyBn(payTarget.monthlySalary)}
                </p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setPayTarget(null)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-sal-month">মাস *</label>
                  <input
                    id="dm-sal-month"
                    required
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                    placeholder="যেমন: নভেম্বর ২০২৬"
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-sal-amount">বেতনের পরিমাণ (৳) *</label>
                  <input
                    id="dm-sal-amount"
                    required
                    inputMode="numeric"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="dm-input"
                  />
                </div>
              </div>

              <div className="dm-field">
                <label>পেমেন্ট মাধ্যম</label>
                <div className="dm-pills">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      aria-pressed={payMethod === pm.id}
                      onClick={() => setPayMethod(pm.id)}
                      className={`dm-pill${payMethod === pm.id ? " is-active" : ""}`}
                      style={{ minHeight: 44 }}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dm-field">
                <label htmlFor="dm-sal-account">খরচের অ্যাকাউন্ট</label>
                <select
                  id="dm-sal-account"
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="dm-select"
                >
                  {state.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatMoneyBn(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="dm-field">
                <label htmlFor="dm-sal-note">নোট (ঐচ্ছিক)</label>
                <input
                  id="dm-sal-note"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="যেমন: অগ্রিম / সম্পূর্ণ বেতন"
                  className="dm-input"
                />
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setPayTarget(null)}
                className="dm-btn dm-btn-outline"
              >
                বাতিল
              </button>
              <button type="submit" className="dm-btn dm-btn-primary">
                বেতন নিশ্চিত করুন
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
