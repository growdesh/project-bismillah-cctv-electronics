/**
 * Single source of truth for Bismillah CCTV & Electronics POS branding and contact details.
 */

export const BUSINESS = {
  nameBn: "বিসমিল্লাহ সিসিটিভি এন্ড ইলেকট্রনিক্স",
  nameEn: "Bismillah CCTV & Electronics",
  shortBrand: "BISMILLAH CCTV POS",
  ownerBn: "মোঃ তারিকুল ইসলাম (মামুন)",
  ownerEn: "Md. Tarikul Islam (Mamun)",
  initials: "BC",
  phone: "8801609099713",
  phoneDisplay: "01609099713",
  phoneTel: "+8801609099713",
  email: "bismillahcctv.bd@gmail.com",
  address: "ঢাকা, বাংলাদেশ",
  shopCode: "BCE-01",
} as const;

export const CONTACT = {
  brand: BUSINESS.nameBn,
  phone: BUSINESS.phone,
  phoneDisplay: BUSINESS.phoneDisplay,
  phoneTel: BUSINESS.phoneTel,
  email: BUSINESS.email,
  website: "",
} as const;

export const SITE = {
  name: BUSINESS.nameBn,
  origin: typeof window !== "undefined" ? window.location.origin : "",
  defaultImage: "",
} as const;

export const MESSAGES = {
  general: `আসসালামু আলাইকুম, ${BUSINESS.nameBn} (${BUSINESS.ownerBn}) এর সাথে যোগাযোগ করছি।`,
} as const;
