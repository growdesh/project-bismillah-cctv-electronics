import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_PASSWORD,
  AUTH_PHONE,
  SERVICING_DEPT_PHONE,
  checkAuthSession,
  clearAuthSession,
  clearLocalAuthSession,
  getAuthHeaders,
  getAuthToken,
  isRouteAllowedForRole,
  loadAuthSession,
  loginWithServer,
  normalizePasswordInput,
  normalizePhoneInput,
  resolveRetailPosSubPath,
  saveAuthSession,
  validateLoginCredentials,
} from "./auth";
import { getSupabaseConfig } from "./supabase";

test("normalizes Bangladeshi phone numbers and passwords cleanly", () => {
  assert.equal(normalizePhoneInput("01609099713"), "01609099713");
  assert.equal(normalizePhoneInput("+880 1609-099713"), "01609099713");
  assert.equal(normalizePhoneInput("8801609099713"), "01609099713");
  assert.equal(normalizePhoneInput("008801609099713"), "01609099713");
  assert.equal(normalizePhoneInput("+88 ০১৬০৯-০৯৯৭১৩"), "01609099713");
  assert.equal(normalizePhoneInput("1609099713"), "01609099713");
  assert.equal(normalizePhoneInput("   "), "");

  assert.equal(normalizePasswordInput("  ০১৬০৯০৯৯৭১৩  "), "01609099713");
  assert.equal(normalizePasswordInput(" Pass@১২৩৪ "), "Pass@1234");
});

test("supabase public config has endpoint and publishable key without service_role", () => {
  const cfg = getSupabaseConfig();
  assert.equal(cfg.isConfigured, true);
  assert.match(cfg.url, /^https:\/\/[a-z0-9]+\.supabase\.co$/);
  assert.equal(cfg.posApiUrl, `${cfg.url}/functions/v1/pos-api`);
  assert.equal(cfg.publishableKey.includes("service_role"), false);
});

test("accepts exact admin phone and password 01609099713", () => {
  const res = validateLoginCredentials("01609099713", "01609099713");
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.normalizedPhone, AUTH_PHONE);
    assert.equal(res.user.role, "admin");
  }
});

test("accepts servicing department login and staff login with identical phone and password", () => {
  const srvRes = validateLoginCredentials(SERVICING_DEPT_PHONE, SERVICING_DEPT_PASSWORD_OR_PHONE());
  assert.equal(srvRes.ok, true);
  if (srvRes.ok) {
    assert.equal(srvRes.user.role, "servicing");
  }

  const staffRes = validateLoginCredentials("01718554411", "01718554411", [
    {
      id: "emp-1",
      name: "মো. রাকিবুল ইসলাম",
      phone: "01718554411",
      address: "সিলেট",
      monthlySalary: 16000,
      joinedAt: "2026-01-01",
      active: true,
    },
  ]);
  assert.equal(staffRes.ok, true);
  if (staffRes.ok) {
    assert.equal(staffRes.user.role, "staff");
    assert.equal(staffRes.user.staffId, "emp-1");
  }
});

function SERVICING_DEPT_PASSWORD_OR_PHONE(): string {
  return SERVICING_DEPT_PHONE;
}

test("accepts Bengali digits and +88 prefix for phone and Bengali digits for password", () => {
  const res = validateLoginCredentials("+88 ০১৬০৯-০৯৯৭১৩", "০১৬০৯০৯৯৭১৩");
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.normalizedPhone, AUTH_PHONE);
  }
  assert.equal(normalizePhoneInput("8801609099713"), AUTH_PHONE);
});

test("rejects empty phone or empty password", () => {
  const noPhone = validateLoginCredentials("   ", AUTH_PASSWORD);
  assert.equal(noPhone.ok, false);
  if (!noPhone.ok) assert.equal(noPhone.field, "phone");

  const noPass = validateLoginCredentials(AUTH_PHONE, "");
  assert.equal(noPass.ok, false);
  if (!noPass.ok) assert.equal(noPass.field, "password");
});

test("rejects mismatched phone or password", () => {
  const wrongPass = validateLoginCredentials(AUTH_PHONE, "12345678");
  assert.equal(wrongPass.ok, false);
  if (!wrongPass.ok) assert.equal(wrongPass.field, "form");

  const wrongPhone = validateLoginCredentials("01711111111", AUTH_PASSWORD);
  assert.equal(wrongPhone.ok, false);
  if (!wrongPhone.ok) assert.equal(wrongPhone.field, "form");
});

test("loginWithServer authenticates against Supabase pos-api with normalized BD phone and updated password", async () => {
  const calls: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const mockFetch: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      headers: (init?.headers as Record<string, string>) || {},
      body: JSON.parse(String(init?.body || "{}")),
    });
    return new Response(
      JSON.stringify({
        ok: true,
        token: "supa-session-token-123",
        user: {
          id: "emp-1",
          name: "মো. রাকিবুল ইসলাম",
          phone: "01718554411",
          role: "staff",
          staffId: "emp-1",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const res = await loginWithServer("+88 ০১৭১৮-৫৫৪৪১১", "NewStaffPass@99", {
    fetchImpl: mockFetch,
  });

  assert.equal(res.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, getSupabaseConfig().posApiUrl);
  assert.equal(calls[0].headers.apikey, getSupabaseConfig().publishableKey);
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.deepEqual(calls[0].body, {
    action: "login",
    phone: "01718554411",
    password: "NewStaffPass@99",
  });
  if (res.ok) {
    assert.equal(res.token, "supa-session-token-123");
    assert.equal(res.user.role, "staff");
    assert.equal(res.normalizedPhone, "01718554411");
  }
});

test("loginWithServer never falls back to hardcoded admin password when Supabase rejects credentials", async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount += 1;
    return new Response(
      JSON.stringify({
        ok: false,
        field: "form",
        error: "মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  };

  // Even with the old default password 01609099713, if Supabase rejects (e.g. after admin changed password), it MUST fail.
  const res = await loginWithServer(AUTH_PHONE, AUTH_PASSWORD, { fetchImpl: mockFetch });
  assert.equal(callCount, 1);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.field, "form");
  }
});

test("loginWithServer falls back to Express /api/auth/login on Supabase network failure and fails cleanly offline", async () => {
  const expressFetch: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/functions/v1/pos-api")) {
      throw new TypeError("Failed to fetch");
    }
    return new Response(
      JSON.stringify({
        ok: true,
        token: "express-token-xyz",
        user: {
          id: "usr-admin",
          name: "মোঃ তারিকুল ইসলাম (মামুন)",
          phone: AUTH_PHONE,
          role: "admin",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const expressRes = await loginWithServer(AUTH_PHONE, AUTH_PASSWORD, { fetchImpl: expressFetch });
  assert.equal(expressRes.ok, true);
  if (expressRes.ok) {
    assert.equal(expressRes.token, "express-token-xyz");
  }

  const offlineFetch: typeof fetch = async () => {
    throw new TypeError("Network offline");
  };
  const offlineRes = await loginWithServer(AUTH_PHONE, AUTH_PASSWORD, { fetchImpl: offlineFetch });
  assert.equal(offlineRes.ok, false);
  if (!offlineRes.ok) {
    assert.equal(offlineRes.field, "form");
  }
});

test("session save, token check, refresh via me, and logout work cleanly", async () => {
  clearLocalAuthSession();
  assert.equal(loadAuthSession(), null);
  assert.equal(getAuthToken(), null);
  assert.deepEqual(getAuthHeaders(), {});

  saveAuthSession(
    {
      id: "usr-admin",
      name: "Admin",
      phone: "+8801609099713",
      role: "admin",
    },
    "tok-abc-123",
  );

  assert.equal(getAuthToken(), "tok-abc-123");
  assert.deepEqual(getAuthHeaders(), { Authorization: "Bearer tok-abc-123" });
  assert.equal(loadAuthSession()?.user.phone, "01609099713");

  // 1. Valid `me` response refreshes user details
  const meCalls: Array<{ headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const validMeFetch: typeof fetch = async (_input, init) => {
    meCalls.push({
      headers: (init?.headers as Record<string, string>) || {},
      body: JSON.parse(String(init?.body || "{}")),
    });
    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: "usr-admin",
          name: "মোঃ তারিকুল ইসলাম (মামুন)",
          phone: "01609099713",
          role: "admin",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const checkOk = await checkAuthSession({ fetchImpl: validMeFetch });
  assert.equal(checkOk.ok, true);
  assert.equal(meCalls[0].headers["x-pos-token"], "tok-abc-123");
  assert.equal(meCalls[0].headers.Authorization, undefined);
  assert.deepEqual(meCalls[0].body, { action: "me", token: "tok-abc-123" });
  assert.equal(loadAuthSession()?.user.name, "মোঃ তারিকুল ইসলাম (মামুন)");

  // 2. Network failure preserves cached session for offline resilience
  const offlineCheck = await checkAuthSession({
    fetchImpl: async () => {
      throw new TypeError("Offline");
    },
  });
  assert.equal(offlineCheck.ok, false);
  if (!offlineCheck.ok) assert.equal(offlineCheck.reason, "network");
  assert.equal(getAuthToken(), "tok-abc-123");

  // 3. Logout clears local session and calls pos-api logout
  const logoutBodies: Array<Record<string, unknown>> = [];
  clearAuthSession({
    fetchImpl: async (_input, init) => {
      logoutBodies.push(JSON.parse(String(init?.body || "{}")));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });
  assert.equal(loadAuthSession(), null);
  assert.equal(getAuthToken(), null);
  assert.deepEqual(logoutBodies, [{ action: "logout", token: "tok-abc-123" }]);

  // 4. Invalid `me` clears local session
  saveAuthSession(
    { id: "usr-admin", name: "Admin", phone: "01609099713", role: "admin" },
    "expired-tok",
  );
  const invalidCheck = await checkAuthSession({
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: false, error: "সেশনের মেয়াদ শেষ হয়েছে" }), { status: 401 }),
  });
  assert.equal(invalidCheck.ok, false);
  if (!invalidCheck.ok) assert.equal(invalidCheck.reason, "invalid");
  assert.equal(loadAuthSession(), null);
});

test("enforces role-based route permissions for admin, staff, and servicing", () => {
  assert.equal(isRouteAllowedForRole("/reports", "admin"), true);
  assert.equal(isRouteAllowedForRole("/staff", "admin"), true);
  assert.equal(isRouteAllowedForRole("/reports", "servicing"), false);
  assert.equal(isRouteAllowedForRole("/money", "servicing"), false);
  assert.equal(isRouteAllowedForRole("/purchases", "servicing"), false);
  assert.equal(isRouteAllowedForRole("/staff", "servicing"), false);
  assert.equal(isRouteAllowedForRole("/servicing", "servicing"), true);
  assert.equal(isRouteAllowedForRole("/notifications", "servicing"), true);
  assert.equal(isRouteAllowedForRole("/sales/new", "staff"), true);
  assert.equal(isRouteAllowedForRole("/reports", "staff"), false);
});

test("resolves root and legacy /demo/retail-pos paths cleanly", () => {
  assert.equal(resolveRetailPosSubPath("/"), "/");
  assert.equal(resolveRetailPosSubPath("/sales/new"), "/sales/new");
  assert.equal(resolveRetailPosSubPath("/demo/retail-pos"), "/");
  assert.equal(resolveRetailPosSubPath("/demo/retail-pos/"), "/");
  assert.equal(resolveRetailPosSubPath("/demo/retail-pos/stock"), "/stock");
  assert.equal(resolveRetailPosSubPath("/demo/retail-pos/sales/new/"), "/sales/new");
});
