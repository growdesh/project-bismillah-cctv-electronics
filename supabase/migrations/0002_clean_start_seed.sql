-- Clean-Start Seed Data (Users, Catalog, Accounts=0, Settings; 0 Transaction Rows)

insert into public.pos_settings (
  id, org_id, org_name, org_address, org_phone, org_email, owner_name,
  initials, dealer_code, trade_license, bin,
  invoice_prefix, invoice_footer, invoice_template, allow_negative_stock, vat_enabled
) values (
  'default',
  'org-bismillah-cctv',
  'বিসমিল্লাহ সিসিটিভি এন্ড ইলেকট্রনিক্স',
  'ঢাকা, বাংলাদেশ',
  '01609099713',
  'bismillahcctv.bd@gmail.com',
  'মোঃ তারিকুল ইসলাম (মামুন)',
  'BC',
  'BCE-01',
  'TRAD/BCE/2026-0148',
  '004912854-0102',
  'BCE',
  'ধন্যবাদ! আবার আসবেন — বিসমিল্লাহ সিসিটিভি এন্ড ইলেকট্রনিক্স (01609099713)',
  'compact',
  false,
  false
)
on conflict (id) do nothing;

insert into public.pos_accounts (id, name, type, balance, sort_order) values
  ('acc-cash', 'হাতে নগদ', 'cash', 0, 1),
  ('acc-bank', 'ব্যাংক (ডাচ-বাংলা)', 'bank', 0, 2),
  ('acc-bkash', 'bKash মার্চেন্ট', 'bkash', 0, 3),
  ('acc-nagad', 'Nagad মার্চেন্ট', 'nagad', 0, 4)
on conflict (id) do nothing;

insert into public.pos_categories (name, sort_order) values
  ('সিসিটিভি ক্যামেরা', 1),
  ('ওয়াই-ফাই ক্যামেরা', 2),
  ('DVR ও NVR', 3),
  ('স্টোরেজ ও মেমোরি', 4),
  ('ক্যাবল ও কানেক্টর', 5),
  ('পাওয়ার ও UPS', 6),
  ('মনিটর ও ইলেকট্রনিক্স', 7),
  ('নেটওয়ার্কিং', 8),
  ('সাধারণ', 9)
on conflict (name) do nothing;

insert into public.pos_companies (id, name, code, mobile) values
  ('comp-b1', 'Hikvision Bangladesh', 'HIK', '01711009988'),
  ('comp-b2', 'Dahua Technology', 'DAH', '01811009977'),
  ('comp-b3', 'IMOU & TP-Link BD', 'IMOU', '01911009966')
on conflict (id) do nothing;

insert into public.pos_products (
  id, name, sku, barcode, category, company, unit,
  purchase_rate, sale_rate, paid_stock, free_stock, min_stock
) values
  ('bce-1', 'Hikvision 2MP ColorVu Bullet Camera', 'BCE-1001', '8942200100101', 'সিসিটিভি ক্যামেরা', 'Hikvision', 'পিস', 1850, 2350, 36, 0, 8),
  ('bce-2', 'Dahua 2MP HDCVI Dome Camera', 'BCE-1002', '8942200100102', 'সিসিটিভি ক্যামেরা', 'Dahua', 'পিস', 1450, 1850, 42, 0, 10),
  ('bce-3', 'IMOU Ranger 2 Smart Wi-Fi Camera (3MP)', 'BCE-1003', '8942200100103', 'ওয়াই-ফাই ক্যামেরা', 'IMOU', 'পিস', 2400, 2950, 18, 0, 6),
  ('bce-4', 'Hikvision 4-Channel 1080P DVR', 'BCE-1004', '8942200100104', 'DVR ও NVR', 'Hikvision', 'পিস', 4100, 4950, 5, 0, 6),
  ('bce-5', 'Dahua 8-Channel XVR Recorder', 'BCE-1005', '8942200100105', 'DVR ও NVR', 'Dahua', 'পিস', 5900, 6950, 11, 0, 4),
  ('bce-6', 'WD Purple 1TB Surveillance HDD', 'BCE-1006', '8942200100106', 'স্টোরেজ ও মেমোরি', 'Western Digital', 'পিস', 4650, 5400, 14, 0, 5),
  ('bce-7', 'Cat6 UTP Network Cable (305m Box)', 'BCE-1007', '8942200100107', 'ক্যাবল ও কানেক্টর', 'D-Link', 'বক্স', 5800, 6800, 3, 0, 5),
  ('bce-8', '12V 2A CCTV Power Adapter', 'BCE-1008', '8942200100108', 'পাওয়ার ও UPS', 'Bismillah Power', 'পিস', 185, 260, 85, 0, 20),
  ('bce-9', 'BNC & DC Connector Set (Copper)', 'BCE-1009', '8942200100109', 'ক্যাবল ও কানেক্টর', 'Hikvision', 'সেট', 48, 80, 140, 0, 30),
  ('bce-10', '19" HD LED Security Monitor', 'BCE-1010', '8942200100110', 'মনিটর ও ইলেকট্রনিক্স', 'Walton', 'পিস', 6200, 7300, 8, 0, 4),
  ('bce-11', '650VA Offline UPS', 'BCE-1011', '8942200100111', 'পাওয়ার ও UPS', 'Apollo', 'পিস', 2850, 3450, 12, 0, 4),
  ('bce-12', 'TP-Link Archer C6 Dual-Band Router', 'BCE-1012', '8942200100112', 'নেটওয়ার্কিং', 'TP-Link', 'পিস', 2950, 3600, 0, 0, 5)
on conflict (id) do nothing;

insert into public.pos_users (id, name, phone, role, staff_id, address, monthly_salary, joined_at, active) values
  ('usr-admin', 'মোঃ তারিকুল ইসলাম (মামুন)', '01609099713', 'admin', null, 'ঢাকা, বাংলাদেশ', 0, now() - interval '180 days', true),
  ('emp-servicing', 'সার্ভিসিং বিভাগ', '01700998877', 'servicing', 'emp-servicing', 'সার্ভিসিং ডেস্ক, সিলেট', 18000, now() - interval '150 days', true),
  ('emp-1', 'মো. রাকিবুল ইসলাম', '01718554411', 'staff', 'emp-1', 'জিন্দাবাজার, সিলেট', 16000, now() - interval '120 days', true),
  ('emp-2', 'তানভীর আহমেদ', '01819665522', 'staff', 'emp-2', 'আম্বরখানা, সিলেট', 14000, now() - interval '90 days', true),
  ('emp-3', 'সাজ্জাদ হোসেন', '01917443399', 'staff', 'emp-3', 'বন্দরবাজার, সিলেট', 12500, now() - interval '45 days', true)
on conflict (id) do nothing;

insert into private.pos_user_credentials (user_id, password_hash) values
  ('usr-admin', extensions.crypt('01609099713', extensions.gen_salt('bf', 10))),
  ('emp-servicing', extensions.crypt('01700998877', extensions.gen_salt('bf', 10))),
  ('emp-1', extensions.crypt('01718554411', extensions.gen_salt('bf', 10))),
  ('emp-2', extensions.crypt('01819665522', extensions.gen_salt('bf', 10))),
  ('emp-3', extensions.crypt('01917443399', extensions.gen_salt('bf', 10)))
on conflict (user_id) do nothing;
