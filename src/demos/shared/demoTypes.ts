import type { DemoMode } from "../../lib/global";

export type PosUserRole = "admin" | "staff" | "servicing";

export interface PosAuthUser {
  id: string;
  name: string;
  phone: string;
  role: PosUserRole;
  staffId?: string;
}

export interface DemoOrg {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  ownerName: string;
  initials: string;
  dealerCode: string;
  tradeLicense: string;
  bin: string;
  hideFieldModules?: boolean;
}

export interface DemoProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  company: string;
  unit: string;
  purchaseRate: number;
  saleRate: number;
  paidStock: number;
  freeStock: number;
  minStock: number;
}

export interface DemoCustomer {
  id: string;
  name: string;
  mobile: string;
  area: string;
  due: number;
}

export interface DemoSupplier {
  id: string;
  name: string;
  mobile: string;
  area: string;
  lastTxn: string;
  due: number;
}

export interface DemoInvoiceItem {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  rate: number;
  total: number;
}

export interface DemoInvoice {
  id: string;
  number: string;
  date: string;
  timeLabel: string;
  partyName: string;
  partyMobile: string;
  itemsCount: number;
  total: number;
  paid: number;
  due: number;
  method: string;
  status: "paid" | "partial" | "due";
  items?: DemoInvoiceItem[];
  serviceJobId?: string;
  serviceJobNo?: string;
  serviceCharge?: number;
  partsSubtotal?: number;
  discount?: number;
}

export interface DemoLedgerEntry {
  id: string;
  party: string;
  date: string;
  amount: number;
  direction: "in" | "out";
  kind: "collection" | "payment" | "expense" | "sale";
  note?: string;
}

export interface DemoAccount {
  id: string;
  name: string;
  type: "cash" | "bank" | "bkash" | "nagad";
  balance: number;
}

export type DemoOrderStatus =
  | "submitted"
  | "unassigned"
  | "ready"
  | "in_transit"
  | "delivered"
  | "collection_due"
  | "completed";

export interface DemoOrder {
  id: string;
  number: string;
  challanNo: string;
  customerName: string;
  area: string;
  total: number;
  itemsCount: number;
  due: number;
  srName: string;
  dsrName: string;
  status: DemoOrderStatus;
  source: "sr" | "office";
  date: string;
}

export interface DemoStaff {
  id: string;
  name: string;
  handle: string;
  role: "SR" | "DSR";
  phone: string;
  routeName: string;
  active: boolean;
  orders: number;
  value: number;
  pending: number;
}

export interface DemoRoute {
  id: string;
  name: string;
  code: string;
  area: string;
  customers: number;
  staffName: string;
}

export interface DemoReturn {
  id: string;
  number: string;
  customerName: string;
  invoiceNo: string;
  amount: number;
  date: string;
  status: "completed" | "cancelled";
}

export interface DemoCompany {
  id: string;
  name: string;
  code: string;
  mobile: string;
}

export type DemoRole = "admin" | "sr" | "dsr";

export interface DemoHandover {
  id: string;
  dsrName: string;
  amount: number;
  count: number;
  date: string;
  status: "submitted" | "received";
}

export interface DemoSettings {
  invoicePrefix: string;
  invoiceFooter: string;
  invoiceTemplate: "classic" | "compact";
  allowNegativeStock: boolean;
  vatEnabled: boolean;
}

export interface PosEmployee {
  id: string;
  name: string;
  phone: string;
  address: string;
  monthlySalary: number;
  joinedAt: string;
  active: boolean;
  roleType?: "staff" | "servicing";
  passwordUpdatedAt?: string;
}

export interface PosSalaryPayment {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  amount: number;
  paidAt: string;
  accountId: string;
  method: string;
  note?: string;
}

export type ServiceJobStatus = "pending" | "ongoing" | "completed" | "delivered";

export interface PosServiceJob {
  id: string;
  jobNo: string;
  title: string;
  deviceName: string;
  problemDescription: string;
  description: string;
  customerName: string;
  customerMobile: string;
  location: string;
  entryDate: string;
  entryTime: string;
  expectedDeliveryDate?: string;
  staffIds: string[];
  staffNames: string[];
  status: ServiceJobStatus;
  paymentStatus: "paid" | "partial" | "due";
  serviceCharge: number;
  paidCharge: number;
  dueCharge: number;
  paymentMethod?: string;
  accountId?: string;
  createdAt: string;
  completedAt?: string;
  linkedInvoiceIds: string[];
}

export type PosNotificationType =
  | "assignment"
  | "new_entry"
  | "status_update"
  | "pending_task"
  | "deadline"
  | "completed";

export interface PosNotification {
  id: string;
  type: PosNotificationType;
  title: string;
  message: string;
  serviceJobId?: string;
  jobNo?: string;
  assignedStaffIds: string[];
  createdAt: string;
  readByUserIds: string[];
}

export interface DemoState {
  mode: DemoMode;
  activeOrgId: string;
  orgs: DemoOrg[];
  categories: string[];
  products: DemoProduct[];
  customers: DemoCustomer[];
  suppliers: DemoSupplier[];
  invoices: DemoInvoice[];
  purchases: DemoInvoice[];
  ledger: DemoLedgerEntry[];
  accounts: DemoAccount[];
  orders: DemoOrder[];
  staff: DemoStaff[];
  employees: PosEmployee[];
  salaryPayments: PosSalaryPayment[];
  serviceJobs: PosServiceJob[];
  notifications: PosNotification[];
  routes: DemoRoute[];
  returns: DemoReturn[];
  companies: DemoCompany[];
  settings: DemoSettings;
  visitedCustomerIds?: string[];
  handovers?: DemoHandover[];
}

export interface DemoCapabilities {
  showSuppliers: boolean;
  showDeliveries: boolean;
  showFieldTeam: boolean;
  showPaidFreeStock: boolean;
}

export interface DemoTradeLineInput {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  rate: number;
}

export interface DemoTradeInput {
  partyName: string;
  partyMobile?: string;
  items: DemoTradeLineInput[];
  discount?: number;
  paid: number;
  method: string;
  accountId?: string;
  serviceJobId?: string;
  serviceJobNo?: string;
  serviceCharge?: number;
}

export interface DemoStoreValue {
  mode: DemoMode;
  role: DemoRole;
  currentUser: PosAuthUser;
  activeStaff: DemoStaff | null;
  basePath: string;
  subPath: string;
  go: (subRoute: string) => void;
  openRoleModal: () => void;
  state: DemoState;
  visibleServiceJobs: PosServiceJob[];
  visibleNotifications: PosNotification[];
  unreadNotificationsCount: number;
  activeOrg: DemoOrg;
  capabilities: DemoCapabilities;
  setOrgId: (orgId: string) => void;
  addSale: (input: DemoTradeInput) => DemoInvoice;
  addPurchase: (input: DemoTradeInput) => DemoInvoice;
  addCustomer: (input: { name: string; mobile: string; area?: string; due?: number }) => DemoCustomer;
  deleteCustomer: (id: string) => void;
  addProduct: (input: {
    name: string;
    sku?: string;
    barcode?: string;
    category: string;
    company?: string;
    unit: string;
    purchaseRate: number;
    saleRate: number;
    paidStock: number;
    freeStock?: number;
    minStock?: number;
  }) => DemoProduct;
  addCategory: (name: string) => string | null;
  renameCategory: (oldName: string, newName: string) => void;
  deleteCategory: (name: string) => void;
  updateProductCategory: (productId: string, category: string) => void;
  addEmployee: (input: {
    name: string;
    phone: string;
    address: string;
    monthlySalary: number;
    password?: string;
    roleType?: "staff" | "servicing";
  }) => PosEmployee;
  updateEmployeePassword: (employeeId: string, newPassword: string) => Promise<boolean>;
  updateAdminPassword: (newPassword: string) => Promise<boolean>;
  deleteEmployee: (id: string) => void;
  paySalary: (input: {
    employeeId: string;
    month: string;
    amount: number;
    accountId?: string;
    method: string;
    note?: string;
  }) => PosSalaryPayment | null;
  addServiceJob: (input: {
    title?: string;
    deviceName: string;
    problemDescription: string;
    description?: string;
    customerName: string;
    customerMobile: string;
    location: string;
    entryDate: string;
    entryTime: string;
    expectedDeliveryDate?: string;
    staffIds: string[];
    serviceCharge?: number;
    paidCharge?: number;
    paymentStatus?: "paid" | "partial" | "due";
    status?: ServiceJobStatus;
    paymentMethod?: string;
    accountId?: string;
  }) => PosServiceJob;
  updateServiceJobStaff: (jobId: string, staffIds: string[]) => void;
  updateServiceJobStatus: (jobId: string, status: ServiceJobStatus) => void;
  completeServiceJob: (input: {
    jobId: string;
    serviceCharge: number;
    paidAmount: number;
    method: string;
    accountId?: string;
    status?: ServiceJobStatus;
  }) => void;
  linkServiceSale: (jobId: string, invoiceId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  addSupplier: (input: { name: string; mobile: string; area?: string; due?: number }) => DemoSupplier;
  addLedger: (input: {
    party: string;
    amount: number;
    direction: "in" | "out";
    kind: "collection" | "payment" | "expense" | "sale";
    accountId?: string;
    note?: string;
  }) => DemoLedgerEntry;
  advanceOrder: (id: string, dsrId?: string) => void;
  addOrder: (input: {
    customerName: string;
    area: string;
    itemsCount: number;
    total: number;
    srName?: string;
  }) => DemoOrder;
  toggleVisit: (customerId: string) => void;
  submitHandover: (input: {
    amount: number;
    count: number;
    dsrName: string;
  }) => DemoHandover;
  addStaff: (input: {
    name: string;
    role: "SR" | "DSR";
    phone: string;
    routeName: string;
    handle?: string;
  }) => DemoStaff;
  addRoute: (input: { name: string; code?: string; area: string; staffName?: string }) => DemoRoute;
  updateBusiness: (patch: Partial<DemoOrg>) => void;
  updateSettings: (patch: Partial<DemoSettings>) => void;
  resetDemo: () => void;
  logout: () => void;
  toast: (message: string) => void;
  toastMessage: string | null;
}
