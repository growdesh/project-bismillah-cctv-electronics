import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pos-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalizePhone(raw: unknown): string {
  const bn = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  let s = String(raw ?? "");
  for (let i = 0; i < 10; i += 1) {
    s = s.replaceAll(bn[i], String(i));
  }
  s = s.replace(/[\s\-()]+/g, "").trim();
  if (s.startsWith("+880")) return `0${s.slice(4)}`;
  if (s.startsWith("880") && s.length === 13) return `0${s.slice(3)}`;
  return s;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: "Server configuration missing" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const action = String(body.action ?? "").trim();
  const headerToken = req.headers.get("x-pos-token")?.trim() || "";
  const token = String(body.token ?? headerToken ?? "").trim();

  if (action === "login") {
    const { data, error } = await adminClient.rpc("login", {
      p_phone: String(body.phone ?? ""),
      p_password: String(body.password ?? ""),
    });
    if (error) return json({ ok: false, field: "form", error: error.message }, 500);
    return json(data);
  }

  if (action === "logout") {
    const { data, error } = await adminClient.rpc("logout", { p_token: token });
    if (error) return json({ ok: false, error: error.message }, 500);
    return json(data);
  }

  if (action === "me") {
    const { data, error } = await adminClient.rpc("get_me", { p_token: token });
    if (error) return json({ ok: false, error: error.message }, 500);
    return json(data);
  }

  if (action === "get-state") {
    const { data, error } = await adminClient.rpc("get_pos_state", { p_token: token });
    if (error) return json({ ok: false, error: error.message }, 500);
    return json(data);
  }

  if (action === "change-password") {
    const { data, error } = await adminClient.rpc("admin_change_user_password", {
      p_token: token,
      p_target_user_id: String(body.targetUserId ?? ""),
      p_new_password: String(body.newPassword ?? ""),
    });
    if (error) return json({ ok: false, error: error.message }, 500);
    return json(data);
  }

  if (action === "upsert-staff") {
    const { data, error } = await adminClient.rpc("admin_upsert_staff", {
      p_token: token,
      p_id: body.id ? String(body.id) : null,
      p_name: String(body.name ?? ""),
      p_phone: String(body.phone ?? ""),
      p_address: String(body.address ?? "—"),
      p_monthly_salary: Number(body.monthlySalary ?? 0),
      p_role_type: String(body.roleType ?? "staff"),
      p_password: body.password ? String(body.password) : null,
      p_active: body.active !== false,
    });
    if (error) return json({ ok: false, error: error.message }, 500);
    return json(data);
  }

  if (action === "delete-staff") {
    const { data, error } = await adminClient.rpc("admin_delete_staff", {
      p_token: token,
      p_user_id: String(body.userId ?? ""),
    });
    if (error) return json({ ok: false, error: error.message }, 500);
    return json(data);
  }

  // Remaining mutations require verified session
  const { data: meRes, error: meErr } = await adminClient.rpc("get_me", { p_token: token });
  if (meErr || !meRes?.ok || !meRes?.user) {
    return json({ ok: false, error: "সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।" }, 401);
  }
  const caller = meRes.user as { id: string; role: string; staffId?: string };

  if (action === "reset-state") {
    if (caller.role !== "admin") {
      return json({ ok: false, error: "শুধুমাত্র অ্যাডমিন ডাটা রিসেট করতে পারবেন" }, 403);
    }

    const tablesToClear = [
      "pos_invoice_items",
      "pos_invoices",
      "pos_purchases",
      "pos_ledger_entries",
      "pos_customers",
      "pos_suppliers",
      "pos_salary_payments",
      "pos_service_jobs",
      "pos_notifications",
      "pos_returns",
    ];
    for (const tbl of tablesToClear) {
      await adminClient.from(tbl).delete().neq("id", "__never__");
    }
    await adminClient
      .from("pos_accounts")
      .update({ balance: 0, updated_at: new Date().toISOString() })
      .neq("id", "__never__");

    const { data: freshState } = await adminClient.rpc("get_pos_state", { p_token: token });
    return json(freshState ?? { ok: true });
  }

  if (action === "sync-state") {
    const incoming = body.state as Record<string, unknown> | undefined;
    if (!incoming || typeof incoming !== "object") {
      return json({ ok: false, error: "Invalid state payload" }, 400);
    }
    const nowIso = new Date().toISOString();

    if (caller.role === "admin") {
      const settings = incoming.settings as Record<string, unknown> | undefined;
      const orgs = Array.isArray(incoming.orgs) ? (incoming.orgs as Record<string, unknown>[]) : [];
      const org = orgs[0];
      if (settings || org) {
        await adminClient
          .from("pos_settings")
          .update({
            ...(org ? {
              org_id: String(org.id ?? "org-bismillah-cctv"),
              org_name: String(org.name ?? ""),
              org_address: String(org.address ?? ""),
              org_phone: String(org.phone ?? ""),
              org_email: String(org.email ?? ""),
              owner_name: String(org.ownerName ?? ""),
              initials: String(org.initials ?? "BC"),
              dealer_code: String(org.dealerCode ?? "BCE-01"),
              trade_license: String(org.tradeLicense ?? ""),
              bin: String(org.bin ?? ""),
            } : {}),
            ...(settings ? {
              invoice_prefix: String(settings.invoicePrefix ?? "BCE"),
              invoice_footer: String(settings.invoiceFooter ?? ""),
              invoice_template: settings.invoiceTemplate === "classic" ? "classic" : "compact",
              allow_negative_stock: Boolean(settings.allowNegativeStock),
              vat_enabled: Boolean(settings.vatEnabled),
            } : {}),
            updated_at: nowIso,
          })
          .eq("id", "default");
      }

      if (Array.isArray(incoming.categories)) {
        const names = incoming.categories.map((c) => String(c).trim()).filter(Boolean);
        await adminClient.from("pos_categories").delete().neq("id", -1);
        if (names.length > 0) {
          await adminClient.from("pos_categories").insert(
            names.map((name, idx) => ({ name, sort_order: idx + 1 })),
          );
        }
      }

      if (Array.isArray(incoming.products)) {
        const rows = (incoming.products as Record<string, unknown>[]).map((p) => ({
          id: String(p.id),
          name: String(p.name ?? ""),
          sku: String(p.sku ?? ""),
          barcode: String(p.barcode ?? ""),
          category: String(p.category ?? "সাধারণ"),
          company: String(p.company ?? ""),
          unit: String(p.unit ?? "পিস"),
          purchase_rate: Number(p.purchaseRate ?? 0),
          sale_rate: Number(p.saleRate ?? 0),
          paid_stock: Number(p.paidStock ?? 0),
          free_stock: Number(p.freeStock ?? 0),
          min_stock: Number(p.minStock ?? 0),
          updated_at: nowIso,
        }));
        if (rows.length > 0) await adminClient.from("pos_products").upsert(rows);
      }

      if (Array.isArray(incoming.customers)) {
        const rows = (incoming.customers as Record<string, unknown>[]).map((c) => ({
          id: String(c.id),
          name: String(c.name ?? ""),
          mobile: String(c.mobile ?? ""),
          area: String(c.area ?? "ঢাকা"),
          due: Number(c.due ?? 0),
          updated_at: nowIso,
        }));
        await adminClient.from("pos_customers").delete().neq("id", "__never__");
        if (rows.length > 0) await adminClient.from("pos_customers").insert(rows);
      }

      if (Array.isArray(incoming.suppliers)) {
        const rows = (incoming.suppliers as Record<string, unknown>[]).map((s) => ({
          id: String(s.id),
          name: String(s.name ?? ""),
          mobile: String(s.mobile ?? ""),
          area: String(s.area ?? "ঢাকা"),
          last_txn: String(s.lastTxn ?? ""),
          due: Number(s.due ?? 0),
          updated_at: nowIso,
        }));
        await adminClient.from("pos_suppliers").delete().neq("id", "__never__");
        if (rows.length > 0) await adminClient.from("pos_suppliers").insert(rows);
      }

      if (Array.isArray(incoming.accounts)) {
        const rows = (incoming.accounts as Record<string, unknown>[]).map((a, idx) => ({
          id: String(a.id),
          name: String(a.name ?? ""),
          type: String(a.type ?? "cash"),
          balance: Number(a.balance ?? 0),
          sort_order: idx + 1,
          updated_at: nowIso,
        }));
        if (rows.length > 0) await adminClient.from("pos_accounts").upsert(rows);
      }

      if (Array.isArray(incoming.employees)) {
        for (const e of incoming.employees as Record<string, unknown>[]) {
          const cleanPhone = normalizePhone(e.phone);
          if (/^01[0-9]{9}$/.test(cleanPhone)) {
            await adminClient.rpc("admin_upsert_staff", {
              p_token: token,
              p_id: String(e.id),
              p_name: String(e.name ?? ""),
              p_phone: cleanPhone,
              p_address: String(e.address ?? "—"),
              p_monthly_salary: Number(e.monthlySalary ?? 0),
              p_role_type: e.roleType === "servicing" ? "servicing" : "staff",
              p_password: null,
              p_active: e.active !== false,
            });
          }
        }
      }

      if (Array.isArray(incoming.invoices)) {
        await adminClient.from("pos_invoice_items").delete().neq("id", -1);
        await adminClient.from("pos_invoices").delete().neq("id", "__never__");
        const invRows = (incoming.invoices as Record<string, unknown>[]).map((i) => ({
          id: String(i.id),
          number: String(i.number ?? ""),
          date: String(i.date ?? nowIso),
          time_label: String(i.timeLabel ?? ""),
          party_name: String(i.partyName ?? ""),
          party_mobile: String(i.partyMobile ?? "—"),
          items_count: Number(i.itemsCount ?? 0),
          total: Number(i.total ?? 0),
          paid: Number(i.paid ?? 0),
          due: Number(i.due ?? 0),
          method: String(i.method ?? "cash"),
          status: String(i.status ?? "due"),
          service_job_id: i.serviceJobId ? String(i.serviceJobId) : null,
          service_job_no: i.serviceJobNo ? String(i.serviceJobNo) : null,
          service_charge: i.serviceCharge != null ? Number(i.serviceCharge) : null,
          parts_subtotal: i.partsSubtotal != null ? Number(i.partsSubtotal) : null,
          discount: i.discount != null ? Number(i.discount) : null,
          created_by: caller.id,
        }));
        if (invRows.length > 0) {
          await adminClient.from("pos_invoices").insert(invRows);
          const itemRows: Record<string, unknown>[] = [];
          for (const i of incoming.invoices as Record<string, unknown>[]) {
            if (Array.isArray(i.items)) {
              for (const it of i.items as Record<string, unknown>[]) {
                itemRows.push({
                  invoice_id: String(i.id),
                  product_id: String(it.productId ?? ""),
                  name: String(it.name ?? ""),
                  unit: String(it.unit ?? "পিস"),
                  qty: Number(it.qty ?? 1),
                  rate: Number(it.rate ?? 0),
                  total: Number(it.total ?? 0),
                });
              }
            }
          }
          if (itemRows.length > 0) await adminClient.from("pos_invoice_items").insert(itemRows);
        }
      }

      if (Array.isArray(incoming.purchases)) {
        await adminClient.from("pos_purchases").delete().neq("id", "__never__");
        const rows = (incoming.purchases as Record<string, unknown>[]).map((p) => ({
          id: String(p.id),
          number: String(p.number ?? ""),
          date: String(p.date ?? nowIso),
          time_label: String(p.timeLabel ?? ""),
          party_name: String(p.partyName ?? ""),
          party_mobile: String(p.partyMobile ?? "—"),
          items_count: Number(p.itemsCount ?? 0),
          total: Number(p.total ?? 0),
          paid: Number(p.paid ?? 0),
          due: Number(p.due ?? 0),
          method: String(p.method ?? "cash"),
          status: String(p.status ?? "due"),
          items: Array.isArray(p.items) ? p.items : [],
          discount: p.discount != null ? Number(p.discount) : null,
          created_by: caller.id,
        }));
        if (rows.length > 0) await adminClient.from("pos_purchases").insert(rows);
      }

      if (Array.isArray(incoming.ledger)) {
        await adminClient.from("pos_ledger_entries").delete().neq("id", "__never__");
        const rows = (incoming.ledger as Record<string, unknown>[]).map((l) => ({
          id: String(l.id),
          party: String(l.party ?? ""),
          date: String(l.date ?? nowIso),
          amount: Number(l.amount ?? 0),
          direction: l.direction === "out" ? "out" : "in",
          kind: String(l.kind ?? "sale"),
          note: l.note ? String(l.note) : null,
        }));
        if (rows.length > 0) await adminClient.from("pos_ledger_entries").insert(rows);
      }

      if (Array.isArray(incoming.salaryPayments)) {
        await adminClient.from("pos_salary_payments").delete().neq("id", "__never__");
        const rows = (incoming.salaryPayments as Record<string, unknown>[]).map((s) => ({
          id: String(s.id),
          employee_id: String(s.employeeId ?? ""),
          employee_name: String(s.employeeName ?? ""),
          month: String(s.month ?? ""),
          amount: Number(s.amount ?? 0),
          paid_at: String(s.paidAt ?? nowIso),
          account_id: String(s.accountId ?? "acc-cash"),
          method: String(s.method ?? "cash"),
          note: s.note ? String(s.note) : null,
        }));
        if (rows.length > 0) await adminClient.from("pos_salary_payments").insert(rows);
      }

      if (Array.isArray(incoming.serviceJobs)) {
        await adminClient.from("pos_service_jobs").delete().neq("id", "__never__");
        const rows = (incoming.serviceJobs as Record<string, unknown>[]).map((j) => ({
          id: String(j.id),
          job_no: String(j.jobNo ?? ""),
          title: String(j.title ?? ""),
          device_name: String(j.deviceName ?? ""),
          problem_description: String(j.problemDescription ?? ""),
          description: String(j.description ?? ""),
          customer_name: String(j.customerName ?? ""),
          customer_mobile: String(j.customerMobile ?? "—"),
          location: String(j.location ?? "সিলেট"),
          entry_date: String(j.entryDate ?? ""),
          entry_time: String(j.entryTime ?? ""),
          expected_delivery_date: j.expectedDeliveryDate ? String(j.expectedDeliveryDate) : null,
          staff_ids: Array.isArray(j.staffIds) ? j.staffIds.map(String) : [],
          staff_names: Array.isArray(j.staffNames) ? j.staffNames.map(String) : [],
          status: String(j.status ?? "pending"),
          payment_status: String(j.paymentStatus ?? "due"),
          service_charge: Number(j.serviceCharge ?? 0),
          paid_charge: Number(j.paidCharge ?? 0),
          due_charge: Number(j.dueCharge ?? 0),
          payment_method: j.paymentMethod ? String(j.paymentMethod) : null,
          account_id: j.accountId ? String(j.accountId) : null,
          created_at: String(j.createdAt ?? nowIso),
          completed_at: j.completedAt ? String(j.completedAt) : null,
          linked_invoice_ids: Array.isArray(j.linkedInvoiceIds) ? j.linkedInvoiceIds.map(String) : [],
        }));
        if (rows.length > 0) await adminClient.from("pos_service_jobs").insert(rows);
      }

      if (Array.isArray(incoming.notifications)) {
        await adminClient.from("pos_notifications").delete().neq("id", "__never__");
        const rows = (incoming.notifications as Record<string, unknown>[]).map((n) => ({
          id: String(n.id),
          type: String(n.type ?? "status_update"),
          title: String(n.title ?? ""),
          message: String(n.message ?? ""),
          service_job_id: n.serviceJobId ? String(n.serviceJobId) : null,
          job_no: n.jobNo ? String(n.jobNo) : null,
          assigned_staff_ids: Array.isArray(n.assignedStaffIds) ? n.assignedStaffIds.map(String) : [],
          created_at: String(n.createdAt ?? nowIso),
          read_by_user_ids: Array.isArray(n.readByUserIds) ? n.readByUserIds.map(String) : [],
        }));
        if (rows.length > 0) await adminClient.from("pos_notifications").insert(rows);
      }

      if (Array.isArray(incoming.returns)) {
        await adminClient.from("pos_returns").delete().neq("id", "__never__");
        const rows = (incoming.returns as Record<string, unknown>[]).map((r) => ({
          id: String(r.id),
          number: String(r.number ?? ""),
          customer_name: String(r.customerName ?? ""),
          invoice_no: String(r.invoiceNo ?? ""),
          amount: Number(r.amount ?? 0),
          date: String(r.date ?? nowIso),
          status: r.status === "cancelled" ? "cancelled" : "completed",
        }));
        if (rows.length > 0) await adminClient.from("pos_returns").insert(rows);
      }
    } else {
      const staffId = caller.staffId || caller.id;
      if (Array.isArray(incoming.products)) {
        for (const p of incoming.products as Record<string, unknown>[]) {
          await adminClient
            .from("pos_products")
            .update({
              paid_stock: Number(p.paidStock ?? 0),
              free_stock: Number(p.freeStock ?? 0),
              updated_at: nowIso,
            })
            .eq("id", String(p.id));
        }
      }
      if (Array.isArray(incoming.customers)) {
        const rows = (incoming.customers as Record<string, unknown>[]).map((c) => ({
          id: String(c.id),
          name: String(c.name ?? ""),
          mobile: String(c.mobile ?? ""),
          area: String(c.area ?? "ঢাকা"),
          due: Number(c.due ?? 0),
          updated_at: nowIso,
        }));
        if (rows.length > 0) await adminClient.from("pos_customers").upsert(rows);
      }
      if (Array.isArray(incoming.serviceJobs)) {
        for (const j of incoming.serviceJobs as Record<string, unknown>[]) {
          const staffIds = Array.isArray(j.staffIds) ? j.staffIds.map(String) : [];
          if (!staffIds.includes(staffId)) staffIds.push(staffId);
          await adminClient.from("pos_service_jobs").upsert({
            id: String(j.id),
            job_no: String(j.jobNo ?? ""),
            title: String(j.title ?? ""),
            device_name: String(j.deviceName ?? ""),
            problem_description: String(j.problemDescription ?? ""),
            description: String(j.description ?? ""),
            customer_name: String(j.customerName ?? ""),
            customer_mobile: String(j.customerMobile ?? "—"),
            location: String(j.location ?? "সিলেট"),
            entry_date: String(j.entryDate ?? ""),
            entry_time: String(j.entryTime ?? ""),
            expected_delivery_date: j.expectedDeliveryDate ? String(j.expectedDeliveryDate) : null,
            staff_ids: staffIds,
            staff_names: Array.isArray(j.staffNames) ? j.staffNames.map(String) : [],
            status: String(j.status ?? "pending"),
            payment_status: String(j.paymentStatus ?? "due"),
            service_charge: Number(j.serviceCharge ?? 0),
            paid_charge: Number(j.paidCharge ?? 0),
            due_charge: Number(j.dueCharge ?? 0),
            payment_method: j.paymentMethod ? String(j.paymentMethod) : null,
            account_id: j.accountId ? String(j.accountId) : null,
            created_at: String(j.createdAt ?? nowIso),
            completed_at: j.completedAt ? String(j.completedAt) : null,
            linked_invoice_ids: Array.isArray(j.linkedInvoiceIds) ? j.linkedInvoiceIds.map(String) : [],
          });
        }
      }
      if (Array.isArray(incoming.notifications)) {
        for (const n of incoming.notifications as Record<string, unknown>[]) {
          const assigned = Array.isArray(n.assignedStaffIds) ? n.assignedStaffIds.map(String) : [];
          if (assigned.includes(staffId)) {
            await adminClient.from("pos_notifications").upsert({
              id: String(n.id),
              type: String(n.type ?? "status_update"),
              title: String(n.title ?? ""),
              message: String(n.message ?? ""),
              service_job_id: n.serviceJobId ? String(n.serviceJobId) : null,
              job_no: n.jobNo ? String(n.jobNo) : null,
              assigned_staff_ids: assigned,
              created_at: String(n.createdAt ?? nowIso),
              read_by_user_ids: Array.isArray(n.readByUserIds) ? n.readByUserIds.map(String) : [],
            });
          }
        }
      }
    }

    return json({ ok: true });
  }

  return json({ ok: false, error: `Unknown action: ${action}` }, 400);
});
