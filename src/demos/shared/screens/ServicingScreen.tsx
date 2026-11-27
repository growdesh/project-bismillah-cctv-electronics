import {
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  MapPin,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  UserPlus,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatDateBn,
  formatMoneyBn,
  parseAmountInput,
  toBn,
} from "../../../lib/global";
import { useRouter } from "../../../lib/router";
import { useDemo } from "../demoStore";
import type { DemoInvoice, PosServiceJob, ServiceJobStatus } from "../demoTypes";

const PAYMENT_METHODS = [
  { id: "cash", label: "নগদ" },
  { id: "bkash", label: "bKash" },
  { id: "nagad", label: "Nagad" },
  { id: "bank", label: "ব্যাংক" },
] as const;

const STATUS_META: Record<
  ServiceJobStatus,
  { label: string; badgeCls: string }
> = {
  pending: { label: "পেন্ডিং", badgeCls: "dm-badge dm-badge-amber" },
  ongoing: { label: "চলমান", badgeCls: "dm-badge dm-badge-blue" },
  completed: { label: "সম্পন্ন", badgeCls: "dm-badge dm-badge-emerald" },
  delivered: { label: "ডেলিভার্ড", badgeCls: "dm-badge dm-badge-emerald" },
};

const PAY_STATUS_META: Record<
  PosServiceJob["paymentStatus"],
  { label: string; badgeCls: string }
> = {
  paid: { label: "পরিশোধিত", badgeCls: "dm-badge dm-badge-emerald" },
  partial: { label: "আংশিক", badgeCls: "dm-badge dm-badge-amber" },
  due: { label: "বাকি", badgeCls: "dm-badge dm-badge-rose" },
};

function defaultDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ServicingScreen() {
  const {
    state,
    currentUser,
    visibleServiceJobs,
    unreadNotificationsCount,
    activeOrg,
    go,
    addServiceJob,
    updateServiceJobStaff,
    updateServiceJobStatus,
    completeServiceJob,
    toast,
  } = useDemo();

  const { search: urlSearch } = useRouter();
  const queryJobId = useMemo(
    () => new URLSearchParams(urlSearch).get("jobId")?.trim() || null,
    [urlSearch],
  );

  // Check if user requested a specific jobId via URL that they are NOT authorized to view
  const unauthorizedDirectAccess = useMemo(() => {
    if (!queryJobId || currentUser.role === "admin") return false;
    const existsInVisible = visibleServiceJobs.some((j) => j.id === queryJobId);
    return !existsInVisible;
  }, [queryJobId, currentUser.role, visibleServiceJobs]);

  const [statusFilter, setStatusFilter] = useState<"all" | ServiceJobStatus>("all");
  const [search, setSearch] = useState<string>("");

  // New Service Job Modal (with ALL mandatory fields)
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [customerMode, setCustomerMode] = useState<"existing" | "custom">(() =>
    state.customers.length > 0 ? "existing" : "custom",
  );
  const [selectedCustomer, setSelectedCustomer] = useState<string>(
    () => state.customers[0]?.name ?? "",
  );
  const [customCustomerName, setCustomCustomerName] = useState<string>("");
  const [customCustomerMobile, setCustomCustomerMobile] = useState<string>("");
  const [deviceName, setDeviceName] = useState<string>("");
  const [problemDescription, setProblemDescription] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] = useState<string>("সিলেট");
  const [entryDate, setEntryDate] = useState<string>(() => defaultDateStr());
  const [entryTime, setEntryTime] = useState<string>(() => defaultTimeStr());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>("");
  const [initialChargeInput, setInitialChargeInput] = useState<string>("0");
  const [initialPaidInput, setInitialPaidInput] = useState<string>("0");
  const [initialPayStatus, setInitialPayStatus] = useState<"paid" | "partial" | "due">("due");
  const [initialJobStatus, setInitialJobStatus] = useState<ServiceJobStatus>("pending");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(() =>
    currentUser.staffId ? [currentUser.staffId] : [],
  );

  // Charge / Complete Modal
  const [chargeJob, setChargeJob] = useState<PosServiceJob | null>(null);
  const [chargeInput, setChargeInput] = useState<string>("");
  const [payMode, setPayMode] = useState<"full" | "partial" | "due">("full");
  const [partialPaidInput, setPartialPaidInput] = useState<string>("0");
  const [method, setMethod] = useState<string>("cash");
  const [accountId, setAccountId] = useState<string>(
    () => state.accounts[0]?.id ?? "acc-cash",
  );
  const [completeStatus, setCompleteStatus] = useState<ServiceJobStatus>("completed");

  // Edit Staff Modal
  const [editStaffJob, setEditStaffJob] = useState<PosServiceJob | null>(null);
  const [editStaffIds, setEditStaffIds] = useState<string[]>([]);

  // Linked Invoice Receipt Preview Modal
  const [previewInvoice, setPreviewInvoice] = useState<DemoInvoice | null>(null);

  const kpis = useMemo(() => {
    const ongoing = visibleServiceJobs.filter(
      (j) => j.status === "ongoing" || j.status === "pending",
    ).length;
    const completed = visibleServiceJobs.filter(
      (j) => j.status === "completed" || j.status === "delivered",
    ).length;
    const totalCharge = visibleServiceJobs.reduce((sum, j) => sum + j.serviceCharge, 0);
    return { ongoing, completed, totalCharge };
  }, [visibleServiceJobs]);

  const invoiceMap = useMemo(() => {
    const map = new Map<string, (typeof state.invoices)[number]>();
    for (const inv of state.invoices) {
      map.set(inv.id, inv);
    }
    return map;
  }, [state.invoices]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleServiceJobs.filter((job) => {
      if (queryJobId && job.id !== queryJobId) return false;
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      if (!q) return true;
      return (
        job.jobNo.toLowerCase().includes(q) ||
        job.title.toLowerCase().includes(q) ||
        job.deviceName.toLowerCase().includes(q) ||
        job.problemDescription.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.customerName.toLowerCase().includes(q) ||
        job.customerMobile.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.staffNames.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [visibleServiceJobs, queryJobId, statusFilter, search]);

  const toggleStaffInList = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    const custObj = state.customers.find((c) => c.name === selectedCustomer);
    const customerName =
      customerMode === "custom" ? customCustomerName.trim() : (custObj?.name ?? selectedCustomer);
    const customerMobile =
      customerMode === "custom" ? customCustomerMobile.trim() : (custObj?.mobile || "01700000000");

    if (!customerName) {
      toast("কাস্টমারের নাম লিখুন");
      return;
    }
    if (!customerMobile) {
      toast("কাস্টমারের মোবাইল নম্বর লিখুন");
      return;
    }
    if (!deviceName.trim()) {
      toast("পণ্য বা ডিভাইসের নাম লিখুন");
      return;
    }
    if (!problemDescription.trim()) {
      toast("সমস্যার বিবরণ লিখুন");
      return;
    }
    if (!entryDate.trim() || !entryTime.trim()) {
      toast("এন্ট্রির তারিখ এবং সময় নির্বাচন করা আবশ্যক");
      return;
    }
    if (!location.trim()) {
      toast("কাস্টমারের অবস্থান (যেমন: সিলেট) লিখুন");
      return;
    }
    if (selectedStaffIds.length === 0) {
      toast("অন্তত একজন নিয়োজিত স্টাফ নির্বাচন করুন");
      return;
    }

    const chargeNum = Math.max(0, Math.round(parseAmountInput(initialChargeInput)));
    const paidNum =
      initialPayStatus === "paid"
        ? chargeNum
        : initialPayStatus === "due"
          ? 0
          : Math.max(0, Math.min(chargeNum, Math.round(parseAmountInput(initialPaidInput))));

    addServiceJob({
      title: `${deviceName.trim()} — ${problemDescription.trim().slice(0, 36)}`,
      deviceName: deviceName.trim(),
      problemDescription: problemDescription.trim(),
      description: description.trim(),
      customerName,
      customerMobile,
      location: location.trim(),
      entryDate: entryDate.trim(),
      entryTime: entryTime.trim(),
      expectedDeliveryDate: expectedDeliveryDate.trim() || undefined,
      staffIds: selectedStaffIds,
      serviceCharge: chargeNum,
      paidCharge: paidNum,
      paymentStatus: initialPayStatus,
      status: initialJobStatus,
    });

    setDeviceName("");
    setProblemDescription("");
    setDescription("");
    setCustomCustomerName("");
    setCustomCustomerMobile("");
    setLocation("সিলেট");
    setEntryDate(defaultDateStr());
    setEntryTime(defaultTimeStr());
    setExpectedDeliveryDate("");
    setInitialChargeInput("0");
    setInitialPaidInput("0");
    setInitialPayStatus("due");
    setInitialJobStatus("pending");
    setCreateOpen(false);
  };

  const openChargeModal = (job: PosServiceJob) => {
    setChargeJob(job);
    setChargeInput(job.serviceCharge > 0 ? String(job.serviceCharge) : "");
    setPayMode("full");
    setPartialPaidInput(job.paidCharge > 0 ? String(job.paidCharge) : "0");
    setMethod(job.paymentMethod || "cash");
    setAccountId(job.accountId || state.accounts[0]?.id || "acc-cash");
    setCompleteStatus(job.status === "delivered" ? "delivered" : "completed");
  };

  const parsedCharge = Math.max(0, Math.round(parseAmountInput(chargeInput)));
  const computedPaid =
    payMode === "full"
      ? parsedCharge
      : payMode === "due"
        ? 0
        : Math.max(0, Math.min(parsedCharge, Math.round(parseAmountInput(partialPaidInput))));
  const computedDue = Math.max(0, parsedCharge - computedPaid);

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeJob) return;
    if (parsedCharge <= 0) {
      toast("সার্ভিসিং চার্জের পরিমাণ লিখুন");
      return;
    }
    completeServiceJob({
      jobId: chargeJob.id,
      serviceCharge: parsedCharge,
      paidAmount: computedPaid,
      method,
      accountId,
      status: completeStatus,
    });
    setChargeJob(null);
  };

  const openEditStaffModal = (job: PosServiceJob) => {
    setEditStaffJob(job);
    setEditStaffIds(job.staffIds);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaffJob) return;
    updateServiceJobStaff(editStaffJob.id, editStaffIds);
    setEditStaffJob(null);
  };

  const handleSellForService = (job: PosServiceJob) => {
    const params = new URLSearchParams();
    params.set("serviceJobId", job.id);
    if (job.customerName) params.set("customer", job.customerName);
    go(`/sales/new?${params.toString()}`);
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
            <h1 className="dm-page-title">সার্ভিসিং মডিউল</h1>
            <p className="dm-page-sub">
              {currentUser.role === "admin"
                ? "সকল সার্ভিসিং এন্ট্রি, তারিখ ও সময়, নিয়োজিত স্টাফ, চার্জ এবং বিক্রয়"
                : `${currentUser.name} — শুধুমাত্র আপনার অ্যাসাইন করা সার্ভিসিং কাজ ও বিক্রয়`}
            </p>
          </div>
        </div>
        <div className="dm-page-actions">
          <button
            type="button"
            onClick={() => go("/notifications")}
            className="dm-btn dm-btn-outline"
          >
            <Bell size={17} aria-hidden="true" />
            <span>
              নোটিফিকেশন{unreadNotificationsCount > 0 ? ` (${toBn(unreadNotificationsCount)})` : ""}
            </span>
          </button>
          <button
            type="button"
            onClick={() => go("/sales/new")}
            className="dm-btn dm-btn-soft-emerald"
          >
            <ShoppingCart size={17} aria-hidden="true" />
            <span>বিক্রয় করুন</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="dm-btn dm-btn-primary"
          >
            <Plus size={17} aria-hidden="true" />
            <span>নতুন সার্ভিসিং</span>
          </button>
        </div>
      </div>

      {unauthorizedDirectAccess && (
        <div
          className="dm-card"
          role="alert"
          style={{
            borderColor: "var(--dm-rose-200)",
            background: "var(--dm-rose-50)",
            color: "var(--dm-rose)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Lock size={20} aria-hidden="true" />
            <div>
              <strong style={{ display: "block" }}>অনুমতি নেই (গোপনীয়তা সুরক্ষা)</strong>
              <span style={{ fontSize: 13 }}>
                এই সার্ভিসিং রেকর্ডটি অন্য স্টাফের জন্য অ্যাসাইন করা হয়েছে। শুধুমাত্র অ্যাডমিন এবং অ্যাসাইন করা স্টাফ এটি দেখতে পারবেন।
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="dm-kpi-grid-3">
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-amber" aria-hidden="true">
            <Clock size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">পেন্ডিং ও চলমান</span>
            <span className="dm-kpi-value dm-text-amber">{toBn(kpis.ongoing)}টি</span>
          </span>
        </div>
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
            <CheckCircle2 size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">সম্পন্ন ও ডেলিভার্ড</span>
            <span className="dm-kpi-value dm-text-emerald">{toBn(kpis.completed)}টি</span>
          </span>
        </div>
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-blue" aria-hidden="true">
            <Wallet size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">
              {currentUser.role === "admin" ? "মোট সার্ভিসিং চার্জ" : "অ্যাসাইনকৃত সার্ভিস চার্জ"}
            </span>
            <span className="dm-kpi-value dm-text-blue">
              {formatMoneyBn(kpis.totalCharge)}
            </span>
          </span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="dm-search-row">
        <div className="dm-search-box">
          <Search size={17} className="dm-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="কাজের নং, ডিভাইস, কাস্টমার, অবস্থান বা কর্মী খুঁজুন…"
            className="dm-search-input"
          />
        </div>
        <div className="dm-pills">
          {[
            { id: "all" as const, label: "সব" },
            { id: "pending" as const, label: "পেন্ডিং" },
            { id: "ongoing" as const, label: "চলমান" },
            { id: "completed" as const, label: "সম্পন্ন" },
            { id: "delivered" as const, label: "ডেলিভার্ড" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={statusFilter === f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`dm-pill${statusFilter === f.id ? " is-active" : ""}`}
              style={{ minHeight: 44 }}
            >
              {f.label}
            </button>
          ))}
          {queryJobId && (
            <button
              type="button"
              onClick={() => go("/servicing")}
              className="dm-pill is-dark"
              style={{ minHeight: 44 }}
            >
              সব রেকর্ড দেখুন
            </button>
          )}
        </div>
      </div>

      {/* Service Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="dm-card dm-empty-state">
          <Wrench size={30} aria-hidden="true" />
          <p>কোনো সার্ভিসিং কাজ পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="dm-order-grid">
          {filteredJobs.map((job) => {
            const linkedInvoices = job.linkedInvoiceIds
              .map((id) => invoiceMap.get(id))
              .filter((inv): inv is NonNullable<typeof inv> => Boolean(inv));
            const linkedSalesTotal = linkedInvoices.reduce((s, inv) => s + inv.total, 0);
            const stMeta = STATUS_META[job.status] || STATUS_META.pending;
            const payMeta = PAY_STATUS_META[job.paymentStatus] || PAY_STATUS_META.due;

            return (
              <article key={job.id} className="dm-order-card">
                <div className="dm-order-head">
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 6,
                      }}
                    >
                      <span className="dm-badge dm-badge-slate">{job.jobNo}</span>
                      <span className="dm-badge dm-badge-blue">
                        <MapPin size={12} aria-hidden="true" />
                        {job.location}
                      </span>
                      <span className={payMeta.badgeCls}>পেমেন্ট: {payMeta.label}</span>
                    </div>
                    <strong style={{ display: "block", fontSize: 15.5, lineHeight: 1.35 }}>
                      ডিভাইস: {job.deviceName || job.title}
                    </strong>
                    <p
                      style={{
                        marginTop: 4,
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "var(--dm-ink-700)",
                      }}
                    >
                      সমস্যা: {job.problemDescription || job.title}
                    </p>
                    {job.description && (
                      <p className="dm-page-sub" style={{ marginTop: 3 }}>
                        বিবরণ: {job.description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span className={stMeta.badgeCls}>{stMeta.label}</span>
                    <select
                      aria-label={`${job.jobNo} স্ট্যাটাস পরিবর্তন`}
                      value={job.status}
                      onChange={(e) =>
                        updateServiceJobStatus(job.id, e.target.value as ServiceJobStatus)
                      }
                      className="dm-select"
                      style={{
                        minHeight: 34,
                        padding: "3px 26px 3px 8px",
                        fontSize: 12,
                        width: "auto",
                      }}
                    >
                      <option value="pending">পেন্ডিং</option>
                      <option value="ongoing">চলমান</option>
                      <option value="completed">সম্পন্ন</option>
                      <option value="delivered">ডেলিভার্ড</option>
                    </select>
                  </div>
                </div>

                {/* Customer + Mandatory Entry Date & Time + Expected Delivery */}
                <div className="dm-meta-inline">
                  <span>
                    <Users size={13} aria-hidden="true" />
                    <strong>{job.customerName}</strong>
                  </span>
                  {job.customerMobile && job.customerMobile !== "—" && (
                    <span>
                      <Phone size={13} aria-hidden="true" />
                      {job.customerMobile}
                    </span>
                  )}
                  <span>
                    <Calendar size={13} aria-hidden="true" />
                    এন্ট্রি: <strong>{job.entryDate}</strong> ({job.entryTime})
                  </span>
                  {job.expectedDeliveryDate && (
                    <span className="dm-text-amber">
                      <Clock size={13} aria-hidden="true" />
                      সম্ভাব্য ডেলিভারি: <strong>{job.expectedDeliveryDate}</strong>
                    </span>
                  )}
                </div>

                {/* Assigned Staff Chips */}
                <div className="dm-service-staff-box">
                  <div className="dm-service-staff-head">
                    <span>নিয়োজিত কর্মী ({toBn(job.staffNames.length)}জন)</span>
                    {currentUser.role === "admin" && (
                      <button
                        type="button"
                        onClick={() => openEditStaffModal(job)}
                        className="dm-inline-link-btn"
                      >
                        <UserPlus size={14} aria-hidden="true" />
                        <span>কর্মী পরিবর্তন</span>
                      </button>
                    )}
                  </div>
                  <div className="dm-chip-list">
                    {job.staffNames.length === 0 ? (
                      <span className="dm-text-muted" style={{ fontSize: 12.5 }}>
                        এখনও কোনো কর্মী নির্ধারণ করা হয়নি
                      </span>
                    ) : (
                      job.staffNames.map((staffName) => (
                        <span key={staffName} className="dm-badge dm-badge-slate">
                          {staffName}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Charge & Linked Sales Metrics */}
                <div className="dm-order-metrics">
                  <div>
                    <span>সার্ভিস চার্জ</span>
                    <strong>
                      {job.serviceCharge > 0 ? formatMoneyBn(job.serviceCharge) : "এন্ট্রি বাকি"}
                    </strong>
                  </div>
                  <div>
                    <span>পরিশোধিত (বাকি: {formatMoneyBn(job.dueCharge)})</span>
                    <strong className="dm-text-emerald">
                      {formatMoneyBn(job.paidCharge)}
                    </strong>
                  </div>
                  <div>
                    <span>সার্ভিসিং বিক্রয়</span>
                    <strong className="dm-text-blue">
                      {linkedInvoices.length > 0
                        ? `${formatMoneyBn(linkedSalesTotal)} (${toBn(linkedInvoices.length)}টি)`
                        : "৳ ০"}
                    </strong>
                  </div>
                </div>

                {linkedInvoices.length > 0 && (
                  <div className="dm-chip-list">
                    {linkedInvoices.map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => setPreviewInvoice(inv)}
                        className="dm-inline-link-btn"
                      >
                        <FileText size={13} aria-hidden="true" />
                        <span>
                          রসিদ {inv.number} ({formatMoneyBn(inv.total)})
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="dm-order-foot">
                  <button
                    type="button"
                    onClick={() => handleSellForService(job)}
                    className="dm-btn dm-btn-soft-emerald dm-btn-sm"
                    style={{ minHeight: 44 }}
                  >
                    <ShoppingCart size={15} aria-hidden="true" />
                    <span>বিক্রয় করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openChargeModal(job)}
                    className="dm-btn dm-btn-primary dm-btn-sm"
                    style={{ minHeight: 44 }}
                  >
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>
                      {job.status === "completed" || job.status === "delivered"
                        ? "চার্জ ও পেমেন্ট আপডেট"
                        : "চার্জ এন্ট্রি ও সম্পন্ন"}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create Service Job Modal (Mandatory Date & Time + All Required Fields) */}
      {createOpen && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="নতুন সার্ভিসিং কাজ"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false);
          }}
        >
          <form onSubmit={handleCreateJob} className="dm-modal dm-modal-lg">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">নতুন সার্ভিসিং এন্ট্রি যোগ করুন</h2>
                <p className="dm-modal-sub">
                  তারিখ ও সময় নির্বাচন আবশ্যক · শুধুমাত্র অ্যাডমিন ও অ্যাসাইন করা স্টাফ এই রেকর্ড দেখতে পারবেন
                </p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setCreateOpen(false)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="dm-modal-body">
              {/* Customer Name & Mobile */}
              <div className="dm-field">
                <label>কাস্টমারের নাম ও মোবাইল নম্বর *</label>
                <div className="dm-pills" style={{ marginBottom: 6 }}>
                  <button
                    type="button"
                    aria-pressed={customerMode === "existing"}
                    onClick={() => setCustomerMode("existing")}
                    className={`dm-pill${customerMode === "existing" ? " is-active" : ""}`}
                    style={{ minHeight: 40 }}
                  >
                    তালিকা থেকে
                  </button>
                  <button
                    type="button"
                    aria-pressed={customerMode === "custom"}
                    onClick={() => setCustomerMode("custom")}
                    className={`dm-pill${customerMode === "custom" ? " is-active" : ""}`}
                    style={{ minHeight: 40 }}
                  >
                    নতুন কাস্টমার লিখুন
                  </button>
                </div>

                {customerMode === "existing" ? (
                  state.customers.length === 0 ? (
                    <p className="dm-text-muted" style={{ fontSize: 13 }}>
                      তালিকায় এখনও কোনো কাস্টমার নেই — উপরের "নতুন কাস্টমার লিখুন" অপশনটি ব্যবহার করুন।
                    </p>
                  ) : (
                    <select
                      aria-label="কাস্টমার"
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="dm-select"
                    >
                      {state.customers.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.mobile ? `${c.name} (${c.mobile})` : c.name}
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  <div className="dm-form-row-2">
                    <input
                      aria-label="কাস্টমারের নাম"
                      required
                      value={customCustomerName}
                      onChange={(e) => setCustomCustomerName(e.target.value)}
                      placeholder="কাস্টমারের নাম *"
                      className="dm-input"
                    />
                    <input
                      aria-label="কাস্টমারের মোবাইল"
                      required
                      value={customCustomerMobile}
                      onChange={(e) => setCustomCustomerMobile(e.target.value)}
                      placeholder="মোবাইল নম্বর (017XXXXXXXX) *"
                      className="dm-input"
                    />
                  </div>
                )}
              </div>

              {/* Device Name & Customer Location */}
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-srv-device">পণ্য / ডিভাইসের নাম *</label>
                  <input
                    id="dm-srv-device"
                    required
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="যেমন: Hikvision 8CH DVR / ColorVu Camera"
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-srv-location">কাস্টমারের অবস্থান / এলাকা *</label>
                  <input
                    id="dm-srv-location"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="যেমন: সিলেট"
                    className="dm-input"
                  />
                </div>
              </div>

              {/* Problem Description & Servicing Details */}
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-srv-problem">সমস্যার বিবরণ (Problem Description) *</label>
                  <input
                    id="dm-srv-problem"
                    required
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    placeholder="যেমন: পাওয়ার আসছে না / হার্ডডিস্ক রেকর্ড হচ্ছে না"
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-srv-desc">সার্ভিসিং কাজের বিবরণ *</label>
                  <input
                    id="dm-srv-desc"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="যেমন: অ্যাডাপ্টার ও বোর্ড চেকআপ এবং ক্যাবলিং"
                    className="dm-input"
                  />
                </div>
              </div>

              {/* Mandatory Entry Date, Mandatory Entry Time, Expected Delivery Date */}
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-srv-date">এন্ট্রির তারিখ (আবশ্যক) *</label>
                  <input
                    id="dm-srv-date"
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-srv-time">এন্ট্রির সময় (আবশ্যক) *</label>
                  <input
                    id="dm-srv-time"
                    type="time"
                    required
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="dm-input"
                  />
                </div>
              </div>

              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-srv-delivery-date">সম্ভাব্য ডেলিভারি তারিখ (যদি থাকে)</label>
                  <input
                    id="dm-srv-delivery-date"
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-srv-init-status">সার্ভিসিং স্ট্যাটাস *</label>
                  <select
                    id="dm-srv-init-status"
                    value={initialJobStatus}
                    onChange={(e) => setInitialJobStatus(e.target.value as ServiceJobStatus)}
                    className="dm-select"
                  >
                    <option value="pending">পেন্ডিং (Pending)</option>
                    <option value="ongoing">চলমান (Ongoing)</option>
                    <option value="completed">সম্পন্ন (Completed)</option>
                    <option value="delivered">ডেলিভার্ড (Delivered)</option>
                  </select>
                </div>
              </div>

              {/* Servicing Charge & Payment Status */}
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-srv-init-charge">সার্ভিসিং চার্জ (৳)</label>
                  <input
                    id="dm-srv-init-charge"
                    inputMode="numeric"
                    value={initialChargeInput}
                    onChange={(e) => setInitialChargeInput(e.target.value)}
                    placeholder="0"
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-srv-init-paystatus">পেমেন্ট স্ট্যাটাস *</label>
                  <select
                    id="dm-srv-init-paystatus"
                    value={initialPayStatus}
                    onChange={(e) =>
                      setInitialPayStatus(e.target.value as "paid" | "partial" | "due")
                    }
                    className="dm-select"
                  >
                    <option value="due">বাকি (Due)</option>
                    <option value="partial">আংশিক পরিশোধ (Partial)</option>
                    <option value="paid">সম্পূর্ণ পরিশোধিত (Paid)</option>
                  </select>
                </div>
              </div>

              {initialPayStatus === "partial" && (
                <div className="dm-field">
                  <label htmlFor="dm-srv-init-paid">জমা টাকা (৳)</label>
                  <input
                    id="dm-srv-init-paid"
                    inputMode="numeric"
                    value={initialPaidInput}
                    onChange={(e) => setInitialPaidInput(e.target.value)}
                    className="dm-input"
                  />
                </div>
              )}

              {/* Assigned Staff Member(s) */}
              <div className="dm-field">
                <label>
                  অ্যাসাইন করা স্টাফ নির্বাচন * ({toBn(selectedStaffIds.length)}জন নির্বাচিত · কোনো সীমা নেই)
                </label>
                {state.employees.length === 0 ? (
                  <p className="dm-page-sub">প্রথমে স্টাফ পেজ থেকে কর্মী যোগ করুন।</p>
                ) : (
                  <div className="dm-staff-picker-grid">
                    {state.employees.map((emp) => {
                      const checked = selectedStaffIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={`dm-staff-check-chip${checked ? " is-selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStaffInList(emp.id, setSelectedStaffIds)}
                          />
                          <span>
                            <strong>{emp.name}</strong>
                            <small>{emp.phone}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="dm-btn dm-btn-outline"
              >
                বাতিল
              </button>
              <button type="submit" className="dm-btn dm-btn-primary">
                সার্ভিসিং এন্ট্রি সংরক্ষণ করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complete & Charge Entry Modal */}
      {chargeJob && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="সার্ভিসিং চার্জ এন্ট্রি"
          onClick={(e) => {
            if (e.target === e.currentTarget) setChargeJob(null);
          }}
        >
          <form onSubmit={handleCompleteSubmit} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">সার্ভিসিং চার্জ ও পেমেন্ট এন্ট্রি</h2>
                <p className="dm-modal-sub">
                  {chargeJob.jobNo} · {chargeJob.customerName} ({chargeJob.location})
                </p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setChargeJob(null)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="dm-modal-body">
              <div className="dm-form-row-2">
                <div className="dm-field">
                  <label htmlFor="dm-srv-charge">সার্ভিসিং চার্জ (৳) *</label>
                  <input
                    id="dm-srv-charge"
                    required
                    inputMode="numeric"
                    value={chargeInput}
                    onChange={(e) => setChargeInput(e.target.value)}
                    placeholder="যেমন: 1500"
                    className="dm-input"
                  />
                </div>
                <div className="dm-field">
                  <label htmlFor="dm-srv-comp-status">সার্ভিসিং স্ট্যাটাস</label>
                  <select
                    id="dm-srv-comp-status"
                    value={completeStatus}
                    onChange={(e) => setCompleteStatus(e.target.value as ServiceJobStatus)}
                    className="dm-select"
                  >
                    <option value="ongoing">চলমান</option>
                    <option value="completed">সম্পন্ন</option>
                    <option value="delivered">ডেলিভার্ড</option>
                  </select>
                </div>
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
                  onClick={() => setPayMode("partial")}
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

              {payMode === "partial" && (
                <div className="dm-field">
                  <label htmlFor="dm-srv-paid">পরিশোধিত টাকা (৳)</label>
                  <input
                    id="dm-srv-paid"
                    inputMode="numeric"
                    value={partialPaidInput}
                    onChange={(e) => setPartialPaidInput(e.target.value)}
                    className="dm-input"
                  />
                </div>
              )}

              <div
                className="dm-order-metrics"
                style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
              >
                <div>
                  <span>পরিশোধিত</span>
                  <strong className="dm-text-emerald">{formatMoneyBn(computedPaid)}</strong>
                </div>
                <div>
                  <span>বাকি</span>
                  <strong className={computedDue > 0 ? "dm-text-rose" : "dm-text-emerald"}>
                    {formatMoneyBn(computedDue)}
                  </strong>
                </div>
              </div>

              <div className="dm-field">
                <label>পেমেন্ট মাধ্যম</label>
                <div className="dm-pills">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      aria-pressed={method === pm.id}
                      onClick={() => setMethod(pm.id)}
                      className={`dm-pill${method === pm.id ? " is-active" : ""}`}
                      style={{ minHeight: 44 }}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dm-field">
                <label htmlFor="dm-srv-account">জমা অ্যাকাউন্ট</label>
                <select
                  id="dm-srv-account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="dm-select"
                >
                  {state.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {currentUser.role === "admin"
                        ? `${acc.name} (${formatMoneyBn(acc.balance)})`
                        : acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setChargeJob(null)}
                className="dm-btn dm-btn-outline"
              >
                বাতিল
              </button>
              <button type="submit" className="dm-btn dm-btn-primary">
                চার্জ সংরক্ষণ ও সম্পন্ন করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editStaffJob && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="কর্মী পরিবর্তন"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditStaffJob(null);
          }}
        >
          <form onSubmit={handleSaveStaff} className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">কর্মী নির্বাচন করুন</h2>
                <p className="dm-modal-sub">
                  {editStaffJob.jobNo} · {toBn(editStaffIds.length)}জন নির্বাচিত (কোনো সীমা নেই)
                </p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setEditStaffJob(null)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="dm-modal-body">
              <div className="dm-staff-picker-grid">
                {state.employees.map((emp) => {
                  const checked = editStaffIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={`dm-staff-check-chip${checked ? " is-selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStaffInList(emp.id, setEditStaffIds)}
                      />
                      <span>
                        <strong>{emp.name}</strong>
                        <small>{emp.phone}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => setEditStaffJob(null)}
                className="dm-btn dm-btn-outline"
              >
                বাতিল
              </button>
              <button type="submit" className="dm-btn dm-btn-primary">
                আপডেট করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Servicing Sale Receipt Preview Modal */}
      {previewInvoice && (
        <div
          className="dm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="সার্ভিসিং বিক্রয় রসিদ"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewInvoice(null);
          }}
        >
          <div className="dm-modal">
            <div className="dm-modal-head">
              <div>
                <h2 className="dm-modal-title">সার্ভিসিং বিক্রয় রসিদ ({previewInvoice.number})</h2>
                <p className="dm-modal-sub">
                  {activeOrg.name} · {formatDateBn(previewInvoice.date, true)}
                </p>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setPreviewInvoice(null)}
                className="dm-modal-close"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="dm-modal-body">
              <div className="dm-card dm-card-pad-sm" style={{ background: "var(--dm-surface-tint)" }}>
                <strong>কাস্টমার: {previewInvoice.partyName}</strong>
                <small style={{ display: "block", color: "var(--dm-muted)" }}>
                  মোবাইল: {previewInvoice.partyMobile} · মাধ্যম: {previewInvoice.method}
                </small>
              </div>
              {previewInvoice.items && previewInvoice.items.length > 0 && (
                <div className="dm-table-wrap">
                  <table className="dm-table">
                    <thead>
                      <tr>
                        <th>পণ্য / পার্টস</th>
                        <th>পরিমাণ</th>
                        <th>মোট</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewInvoice.items.map((item, i) => (
                        <tr key={`${item.productId}-${i}`}>
                          <td>{item.name}</td>
                          <td>{toBn(item.qty)} {item.unit}</td>
                          <td>{formatMoneyBn(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="dm-cart-summary">
                {previewInvoice.serviceCharge !== undefined && previewInvoice.serviceCharge > 0 && (
                  <div className="dm-summary-row">
                    <span>সার্ভিসিং চার্জ</span>
                    <strong>{formatMoneyBn(previewInvoice.serviceCharge)}</strong>
                  </div>
                )}
                {previewInvoice.discount !== undefined && previewInvoice.discount > 0 && (
                  <div className="dm-summary-row">
                    <span>ছাড়</span>
                    <strong className="dm-text-emerald">−{formatMoneyBn(previewInvoice.discount)}</strong>
                  </div>
                )}
                <div className="dm-summary-row is-total">
                  <span>সর্বমোট বিল</span>
                  <strong>{formatMoneyBn(previewInvoice.total)}</strong>
                </div>
                <div className="dm-summary-row">
                  <span>পরিশোধিত</span>
                  <strong className="dm-text-emerald">{formatMoneyBn(previewInvoice.paid)}</strong>
                </div>
                <div className="dm-summary-row">
                  <span>বাকি</span>
                  <strong className={previewInvoice.due > 0 ? "dm-text-rose" : "dm-text-emerald"}>
                    {formatMoneyBn(previewInvoice.due)}
                  </strong>
                </div>
              </div>
            </div>
            <div className="dm-modal-foot">
              <button
                type="button"
                onClick={() => window.print()}
                className="dm-btn dm-btn-outline"
              >
                প্রিন্ট রসিদ
              </button>
              <button
                type="button"
                onClick={() => setPreviewInvoice(null)}
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
