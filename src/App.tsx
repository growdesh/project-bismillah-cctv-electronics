import { useCallback, useEffect, useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { OfflineIndicator } from "./components/OfflineIndicator";
import RetailPosDemo from "./demos/retail-pos/Demo";
import type { PosAuthUser } from "./demos/shared/demoTypes";
import {
  checkAuthSession,
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  type AuthSession,
} from "./lib/auth";
import { navigate } from "./lib/router";

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [checkingSession, setCheckingSession] = useState<boolean>(() => Boolean(loadAuthSession()));

  useEffect(() => {
    const initial = loadAuthSession();
    if (!initial) {
      setCheckingSession(false);
      return;
    }

    let cancelled = false;
    checkAuthSession()
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setSession(res.session);
        } else if (res.reason === "invalid" || res.reason === "unauthenticated") {
          setSession(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoginSuccess = useCallback((user: PosAuthUser, token: string) => {
    const next = saveAuthSession(user, token);
    setSession(next);
    setCheckingSession(false);
    navigate("/", { replace: true });
  }, []);

  const handleLogout = useCallback(() => {
    clearAuthSession();
    setSession(null);
    setCheckingSession(false);
    navigate("/", { replace: true });
  }, []);

  return (
    <>
      <OfflineIndicator />
      {checkingSession ? (
        <main className="pos-login-page" aria-busy="true">
          <section className="pos-login-card" aria-label="সেশন যাচাই">
            <p style={{ textAlign: "center", fontWeight: 700, color: "#334155" }}>
              সেশন যাচাই হচ্ছে…
            </p>
          </section>
        </main>
      ) : !session ? (
        <LoginPage onSuccess={handleLoginSuccess} />
      ) : (
        <RetailPosDemo
          basePath=""
          currentUser={session.user}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}
