-- Auth, Staff & Role-Filtered State Read RPCs (restricted to service_role; soft-revocation)

create or replace function public.login(p_phone text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := private.normalize_bd_phone(p_phone);
  v_password text := private.normalize_pos_password(p_password);
  v_user public.pos_users;
  v_hash text;
  v_raw_token text;
  v_token_hash text;
begin
  if v_phone = '' then
    return jsonb_build_object('ok', false, 'field', 'phone', 'error', 'মোবাইল নম্বর লিখুন');
  end if;
  if v_password = '' then
    return jsonb_build_object('ok', false, 'field', 'password', 'error', 'পাসওয়ার্ড লিখুন');
  end if;

  select u.id, u.name, u.phone, u.role, u.staff_id,
         u.address, u.monthly_salary, u.joined_at, u.active,
         u.password_updated_at, u.created_at, u.updated_at, c.password_hash
    into v_user.id, v_user.name, v_user.phone, v_user.role, v_user.staff_id,
         v_user.address, v_user.monthly_salary, v_user.joined_at, v_user.active,
         v_user.password_updated_at, v_user.created_at, v_user.updated_at, v_hash
    from public.pos_users u
    join private.pos_user_credentials c on c.user_id = u.id
   where u.phone = v_phone
     and u.active = true
   limit 1;

  if v_user.id is null or v_hash is null or extensions.crypt(v_password, v_hash) <> v_hash then
    return jsonb_build_object(
      'ok', false,
      'field', 'form',
      'error', 'মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।'
    );
  end if;

  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := private.hash_session_token(v_raw_token);

  insert into public.pos_sessions (token_hash, user_id, expires_at)
  values (v_token_hash, v_user.id, now() + interval '12 hours');

  return jsonb_build_object(
    'ok', true,
    'token', v_raw_token,
    'user', jsonb_strip_nulls(jsonb_build_object(
      'id', v_user.id,
      'name', v_user.name,
      'phone', v_user.phone,
      'role', v_user.role,
      'staffId', v_user.staff_id
    ))
  );
end;
$$;

create or replace function public.logout(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean text := btrim(coalesce(p_token, ''));
begin
  if v_clean <> '' then
    update public.pos_sessions
       set expires_at = now() - interval '1 second'
     where token_hash = private.hash_session_token(v_clean);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_me(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.pos_users;
begin
  v_user := private.resolve_session_user(p_token);
  if v_user.id is null then
    return jsonb_build_object('ok', false, 'error', 'সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।');
  end if;

  return jsonb_build_object(
    'ok', true,
    'user', jsonb_strip_nulls(jsonb_build_object(
      'id', v_user.id,
      'name', v_user.name,
      'phone', v_user.phone,
      'role', v_user.role,
      'staffId', v_user.staff_id
    ))
  );
end;
$$;

create or replace function public.admin_change_user_password(
  p_token text,
  p_target_user_id text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller public.pos_users;
  v_clean_pw text := private.normalize_pos_password(p_new_password);
  v_target_id text := btrim(coalesce(p_target_user_id, ''));
  v_caller_hash text;
  v_now timestamptz := now();
begin
  v_caller := private.resolve_session_user(p_token);
  if v_caller.id is null then
    return jsonb_build_object('ok', false, 'error', 'অনুমোদিত নয়। অনুগ্রহ করে লগইন করুন।');
  end if;
  if v_caller.role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'শুধুমাত্র অ্যাডমিন পাসওয়ার্ড পরিবর্তন করতে পারবেন');
  end if;
  if length(v_clean_pw) < 4 then
    return jsonb_build_object('ok', false, 'error', 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে');
  end if;
  if not exists (select 1 from public.pos_users where id = v_target_id) then
    return jsonb_build_object('ok', false, 'error', 'ব্যবহারকারী খুঁজে পাওয়া যায়নি');
  end if;

  insert into private.pos_user_credentials (user_id, password_hash, updated_at)
  values (v_target_id, extensions.crypt(v_clean_pw, extensions.gen_salt('bf', 10)), v_now)
  on conflict (user_id) do update
    set password_hash = excluded.password_hash,
        updated_at = excluded.updated_at;

  update public.pos_users
     set password_updated_at = v_now,
         updated_at = v_now
   where id = v_target_id;

  v_caller_hash := private.hash_session_token(btrim(p_token));
  update public.pos_sessions
     set expires_at = v_now - interval '1 second'
   where user_id = v_target_id
     and token_hash <> v_caller_hash
     and expires_at > v_now;

  return jsonb_build_object(
    'ok', true,
    'userId', v_target_id,
    'passwordUpdatedAt', to_char(v_now at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

create or replace function public.admin_upsert_staff(
  p_token text,
  p_id text default null,
  p_name text default '',
  p_phone text default '',
  p_address text default '—',
  p_monthly_salary numeric default 0,
  p_role_type text default 'staff',
  p_password text default null,
  p_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller public.pos_users;
  v_id text;
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := private.normalize_bd_phone(p_phone);
  v_address text := coalesce(nullif(btrim(coalesce(p_address, '')), ''), '—');
  v_salary numeric(12,2) := greatest(0, round(coalesce(p_monthly_salary, 0)));
  v_role text := case when p_role_type = 'servicing' then 'servicing' else 'staff' end;
  v_pw text := private.normalize_pos_password(p_password);
  v_now timestamptz := now();
  v_saved public.pos_users;
begin
  v_caller := private.resolve_session_user(p_token);
  if v_caller.id is null then
    return jsonb_build_object('ok', false, 'error', 'অনুমোদিত নয়। অনুগ্রহ করে লগইন করুন।');
  end if;
  if v_caller.role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'শুধুমাত্র অ্যাডমিন স্টাফ অ্যাকাউন্ট পরিচালনা করতে পারবেন');
  end if;
  if v_name = '' or v_phone !~ '^01[0-9]{9}$' then
    return jsonb_build_object('ok', false, 'error', 'সঠিক নাম ও ১১ ডিজিটের মোবাইল নম্বর আবশ্যক');
  end if;

  v_id := coalesce(nullif(btrim(coalesce(p_id, '')), ''), 'emp-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  if exists (select 1 from public.pos_users where phone = v_phone and id <> v_id) then
    return jsonb_build_object('ok', false, 'error', 'এই মোবাইল নম্বরে আরেকটি অ্যাকাউন্ট রয়েছে');
  end if;
  if exists (select 1 from public.pos_users where id = v_id and role = 'admin') then
    return jsonb_build_object('ok', false, 'error', 'অ্যাডমিন অ্যাকাউন্ট এখান থেকে পরিবর্তন করা যাবে না');
  end if;

  insert into public.pos_users (
    id, name, phone, role, staff_id, address, monthly_salary,
    joined_at, active, password_updated_at, created_at, updated_at
  )
  values (
    v_id, v_name, v_phone, v_role, v_id, v_address, v_salary,
    v_now, coalesce(p_active, true), v_now, v_now, v_now
  )
  on conflict (id) do update
    set name = excluded.name,
        phone = excluded.phone,
        role = excluded.role,
        staff_id = excluded.id,
        address = excluded.address,
        monthly_salary = excluded.monthly_salary,
        active = excluded.active,
        updated_at = v_now
  returning * into v_saved;

  if not exists (select 1 from private.pos_user_credentials where user_id = v_id) or v_pw <> '' then
    if v_pw = '' then
      v_pw := v_phone;
    end if;
    insert into private.pos_user_credentials (user_id, password_hash, updated_at)
    values (v_id, extensions.crypt(v_pw, extensions.gen_salt('bf', 10)), v_now)
    on conflict (user_id) do update
      set password_hash = excluded.password_hash,
          updated_at = excluded.updated_at;

    update public.pos_users set password_updated_at = v_now where id = v_id
    returning * into v_saved;
  end if;

  return jsonb_build_object(
    'ok', true,
    'employee', jsonb_build_object(
      'id', v_saved.id,
      'name', v_saved.name,
      'phone', v_saved.phone,
      'address', v_saved.address,
      'monthlySalary', v_saved.monthly_salary,
      'joinedAt', to_char(v_saved.joined_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'active', v_saved.active,
      'roleType', v_saved.role,
      'passwordUpdatedAt', to_char(v_saved.password_updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  );
end;
$$;

create or replace function public.admin_delete_staff(p_token text, p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller public.pos_users;
  v_target_id text := btrim(coalesce(p_user_id, ''));
  v_now timestamptz := now();
begin
  v_caller := private.resolve_session_user(p_token);
  if v_caller.id is null then
    return jsonb_build_object('ok', false, 'error', 'অনুমোদিত নয়। অনুগ্রহ করে লগইন করুন।');
  end if;
  if v_caller.role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'শুধুমাত্র অ্যাডমিন স্টাফ মুছতে পারবেন');
  end if;
  if v_target_id = '' or v_target_id = v_caller.id then
    return jsonb_build_object('ok', false, 'error', 'নিজের অ্যাকাউন্ট মোছা যাবে না');
  end if;

  update public.pos_users
     set active = false,
         updated_at = v_now
   where id = v_target_id
     and role <> 'admin';

  update public.pos_sessions
     set expires_at = v_now - interval '1 second'
   where user_id = v_target_id
     and expires_at > v_now;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_pos_state(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller public.pos_users;
  v_is_admin boolean;
  v_staff_id text;
  v_settings public.pos_settings;
  v_categories jsonb;
  v_companies jsonb;
  v_products jsonb;
  v_customers jsonb;
  v_suppliers jsonb;
  v_accounts jsonb;
  v_employees jsonb;
  v_service_jobs jsonb;
  v_notifications jsonb;
  v_invoices jsonb;
  v_purchases jsonb;
  v_ledger jsonb;
  v_salary_payments jsonb;
  v_returns jsonb;
begin
  v_caller := private.resolve_session_user(p_token);
  if v_caller.id is null then
    return jsonb_build_object('ok', false, 'error', 'সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।');
  end if;

  v_is_admin := (v_caller.role = 'admin');
  v_staff_id := coalesce(v_caller.staff_id, v_caller.id);

  select * into v_settings from public.pos_settings where id = 'default' limit 1;

  select coalesce(jsonb_agg(c.name order by c.sort_order, c.id), '[]'::jsonb)
    into v_categories
    from public.pos_categories c;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'code', c.code,
    'mobile', c.mobile
  ) order by c.id), '[]'::jsonb)
    into v_companies
    from public.pos_companies c;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'sku', p.sku,
    'barcode', p.barcode,
    'category', p.category,
    'company', p.company,
    'unit', p.unit,
    'purchaseRate', case when v_is_admin then p.purchase_rate else 0 end,
    'saleRate', p.sale_rate,
    'paidStock', p.paid_stock,
    'freeStock', p.free_stock,
    'minStock', p.min_stock
  ) order by p.created_at desc, p.id), '[]'::jsonb)
    into v_products
    from public.pos_products p;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'mobile', c.mobile,
    'area', c.area,
    'due', c.due
  ) order by c.created_at desc, c.id), '[]'::jsonb)
    into v_customers
    from public.pos_customers c;

  if v_is_admin then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'mobile', s.mobile,
      'area', s.area,
      'lastTxn', s.last_txn,
      'due', s.due
    ) order by s.created_at desc, s.id), '[]'::jsonb)
      into v_suppliers
      from public.pos_suppliers s;
  else
    v_suppliers := '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'type', a.type,
    'balance', case when v_is_admin then a.balance else 0 end
  ) order by a.sort_order, a.id), '[]'::jsonb)
    into v_accounts
    from public.pos_accounts a;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id,
    'name', u.name,
    'phone', u.phone,
    'address', u.address,
    'monthlySalary', case when v_is_admin then u.monthly_salary else 0 end,
    'joinedAt', to_char(u.joined_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'active', u.active,
    'roleType', u.role,
    'passwordUpdatedAt', to_char(u.password_updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) order by u.joined_at asc, u.id), '[]'::jsonb)
    into v_employees
    from public.pos_users u
   where u.role in ('staff', 'servicing')
     and u.active = true;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', j.id,
    'jobNo', j.job_no,
    'title', j.title,
    'deviceName', j.device_name,
    'problemDescription', j.problem_description,
    'description', j.description,
    'customerName', j.customer_name,
    'customerMobile', j.customer_mobile,
    'location', j.location,
    'entryDate', j.entry_date,
    'entryTime', j.entry_time,
    'expectedDeliveryDate', j.expected_delivery_date,
    'staffIds', to_jsonb(j.staff_ids),
    'staffNames', to_jsonb(j.staff_names),
    'status', j.status,
    'paymentStatus', j.payment_status,
    'serviceCharge', j.service_charge,
    'paidCharge', j.paid_charge,
    'dueCharge', j.due_charge,
    'paymentMethod', j.payment_method,
    'accountId', j.account_id,
    'createdAt', to_char(j.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'completedAt', case when j.completed_at is not null then to_char(j.completed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') else null end,
    'linkedInvoiceIds', to_jsonb(j.linked_invoice_ids)
  )) order by j.created_at desc), '[]'::jsonb)
    into v_service_jobs
    from public.pos_service_jobs j
   where v_is_admin or (v_staff_id = any(j.staff_ids));

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', n.id,
    'type', n.type,
    'title', n.title,
    'message', n.message,
    'serviceJobId', n.service_job_id,
    'jobNo', n.job_no,
    'assignedStaffIds', to_jsonb(n.assigned_staff_ids),
    'createdAt', to_char(n.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'readByUserIds', to_jsonb(n.read_by_user_ids)
  )) order by n.created_at desc), '[]'::jsonb)
    into v_notifications
    from public.pos_notifications n
   where v_is_admin or (v_staff_id = any(n.assigned_staff_ids));

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', i.id,
    'number', i.number,
    'date', to_char(i.date at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'timeLabel', i.time_label,
    'partyName', i.party_name,
    'partyMobile', i.party_mobile,
    'itemsCount', i.items_count,
    'total', i.total,
    'paid', i.paid,
    'due', i.due,
    'method', i.method,
    'status', i.status,
    'serviceJobId', i.service_job_id,
    'serviceJobNo', i.service_job_no,
    'serviceCharge', i.service_charge,
    'partsSubtotal', i.parts_subtotal,
    'discount', i.discount,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', ii.product_id,
        'name', ii.name,
        'unit', ii.unit,
        'qty', ii.qty,
        'rate', ii.rate,
        'total', ii.total
      ) order by ii.id)
      from public.pos_invoice_items ii
      where ii.invoice_id = i.id
    ), '[]'::jsonb)
  )) order by i.date desc), '[]'::jsonb)
    into v_invoices
    from public.pos_invoices i
   where v_is_admin
      or exists (
        select 1 from public.pos_service_jobs j
         where v_staff_id = any(j.staff_ids)
           and (j.id = i.service_job_id or i.id = any(j.linked_invoice_ids))
      );

  if v_is_admin then
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', p.id,
      'number', p.number,
      'date', to_char(p.date at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'timeLabel', p.time_label,
      'partyName', p.party_name,
      'partyMobile', p.party_mobile,
      'itemsCount', p.items_count,
      'total', p.total,
      'paid', p.paid,
      'due', p.due,
      'method', p.method,
      'status', p.status,
      'discount', p.discount,
      'items', p.items
    )) order by p.date desc), '[]'::jsonb)
      into v_purchases
      from public.pos_purchases p;

    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', l.id,
      'party', l.party,
      'date', to_char(l.date at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'amount', l.amount,
      'direction', l.direction,
      'kind', l.kind,
      'note', l.note
    )) order by l.date desc), '[]'::jsonb)
      into v_ledger
      from public.pos_ledger_entries l;

    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', sp.id,
      'employeeId', sp.employee_id,
      'employeeName', sp.employee_name,
      'month', sp.month,
      'amount', sp.amount,
      'paidAt', to_char(sp.paid_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'accountId', sp.account_id,
      'method', sp.method,
      'note', sp.note
    )) order by sp.paid_at desc), '[]'::jsonb)
      into v_salary_payments
      from public.pos_salary_payments sp;

    select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'number', r.number,
      'customerName', r.customer_name,
      'invoiceNo', r.invoice_no,
      'amount', r.amount,
      'date', to_char(r.date at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'status', r.status
    ) order by r.date desc), '[]'::jsonb)
      into v_returns
      from public.pos_returns r;
  else
    v_purchases := '[]'::jsonb;
    v_ledger := '[]'::jsonb;
    v_salary_payments := '[]'::jsonb;
    v_returns := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'ok', true,
    'state', jsonb_build_object(
      'mode', 'retail-pos',
      'activeOrgId', coalesce(v_settings.org_id, 'org-bismillah-cctv'),
      'orgs', jsonb_build_array(jsonb_build_object(
        'id', coalesce(v_settings.org_id, 'org-bismillah-cctv'),
        'name', coalesce(v_settings.org_name, 'বিসমিল্লাহ সিসিটিভি এন্ড ইলেকট্রনিক্স'),
        'address', coalesce(v_settings.org_address, 'ঢাকা, বাংলাদেশ'),
        'phone', coalesce(v_settings.org_phone, '01609099713'),
        'email', coalesce(v_settings.org_email, 'bismillahcctv.bd@gmail.com'),
        'ownerName', coalesce(v_settings.owner_name, 'মোঃ তারিকুল ইসলাম (মামুন)'),
        'initials', coalesce(v_settings.initials, 'BC'),
        'dealerCode', coalesce(v_settings.dealer_code, 'BCE-01'),
        'tradeLicense', coalesce(v_settings.trade_license, 'TRAD/BCE/2026-0148'),
        'bin', coalesce(v_settings.bin, '004912854-0102')
      )),
      'categories', v_categories,
      'products', v_products,
      'customers', v_customers,
      'suppliers', v_suppliers,
      'invoices', v_invoices,
      'purchases', v_purchases,
      'ledger', v_ledger,
      'accounts', v_accounts,
      'orders', '[]'::jsonb,
      'staff', '[]'::jsonb,
      'employees', v_employees,
      'salaryPayments', v_salary_payments,
      'serviceJobs', v_service_jobs,
      'notifications', v_notifications,
      'routes', '[]'::jsonb,
      'returns', v_returns,
      'companies', v_companies,
      'settings', jsonb_build_object(
        'invoicePrefix', coalesce(v_settings.invoice_prefix, 'BCE'),
        'invoiceFooter', coalesce(v_settings.invoice_footer, 'ধন্যবাদ! আবার আসবেন — বিসমিল্লাহ সিসিটিভি এন্ড ইলেকট্রনিক্স (01609099713)'),
        'invoiceTemplate', coalesce(v_settings.invoice_template, 'compact'),
        'allowNegativeStock', coalesce(v_settings.allow_negative_stock, false),
        'vatEnabled', coalesce(v_settings.vat_enabled, false)
      )
    )
  );
end;
$$;

-- Restrict SECURITY DEFINER RPCs strictly to service_role (Edge Function pos-api)
revoke all on function public.login(text, text) from public, anon, authenticated;
revoke all on function public.logout(text) from public, anon, authenticated;
revoke all on function public.get_me(text) from public, anon, authenticated;
revoke all on function public.admin_change_user_password(text, text, text) from public, anon, authenticated;
revoke all on function public.admin_upsert_staff(text, text, text, text, text, numeric, text, text, boolean) from public, anon, authenticated;
revoke all on function public.admin_delete_staff(text, text) from public, anon, authenticated;
revoke all on function public.get_pos_state(text) from public, anon, authenticated;

grant execute on function public.login(text, text) to service_role;
grant execute on function public.logout(text) to service_role;
grant execute on function public.get_me(text) to service_role;
grant execute on function public.admin_change_user_password(text, text, text) to service_role;
grant execute on function public.admin_upsert_staff(text, text, text, text, text, numeric, text, text, boolean) to service_role;
grant execute on function public.admin_delete_staff(text, text) to service_role;
grant execute on function public.get_pos_state(text) to service_role;
