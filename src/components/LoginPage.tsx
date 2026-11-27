import { AlertCircle, Eye, EyeOff, Lock, LogIn, Phone } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { PosAuthUser } from "../demos/shared/demoTypes";
import { loginWithServer } from "../lib/auth";
import { BUSINESS } from "../lib/config";
import { BrandMark } from "./BrandMark";
import { PWAInstallButton } from "./PWAInstallButton";
import { Seo } from "./Seo";
import "../styles/login.css";

interface LoginPageProps {
  onSuccess: (user: PosAuthUser, token: string) => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<"phone" | "password" | "form" | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await loginWithServer(phone, password);
      if (!result.ok) {
        setError(result.error);
        setInvalidField(result.field);
        return;
      }
      setError(null);
      setInvalidField(null);
      onSuccess(result.user, result.token);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Seo
        title={`লগইন — ${BUSINESS.nameBn}`}
        description={`${BUSINESS.nameBn} (${BUSINESS.nameEn}) রিটেইল POS লগইন।`}
        path="/"
        noIndex
      />
      <main className="pos-login-page">
        <section className="pos-login-card" aria-label="লগইন">
          <div className="pos-login-head">
            <BrandMark size={46} />
            <h1 className="pos-login-title">{BUSINESS.nameBn}</h1>
          </div>

          <form onSubmit={handleSubmit} className="pos-login-form" noValidate>
            {error && (
              <div className="pos-login-error" role="alert">
                <AlertCircle size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="pos-login-field">
              <label htmlFor="pos-login-phone">মোবাইল নম্বর</label>
              <div className="pos-login-input-wrap">
                <span className="pos-login-input-icon" aria-hidden="true">
                  <Phone size={17} />
                </span>
                <input
                  id="pos-login-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="মোবাইল নম্বর লিখুন"
                  value={phone}
                  disabled={submitting}
                  aria-invalid={invalidField === "phone" || invalidField === "form"}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (error) setError(null);
                    if (invalidField) setInvalidField(null);
                  }}
                  className="pos-login-input"
                />
              </div>
            </div>

            <div className="pos-login-field">
              <label htmlFor="pos-login-password">পাসওয়ার্ড</label>
              <div className="pos-login-input-wrap">
                <span className="pos-login-input-icon" aria-hidden="true">
                  <Lock size={17} />
                </span>
                <input
                  id="pos-login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="পাসওয়ার্ড লিখুন"
                  value={password}
                  disabled={submitting}
                  aria-invalid={invalidField === "password" || invalidField === "form"}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                    if (invalidField) setInvalidField(null);
                  }}
                  className="pos-login-input has-toggle"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="pos-login-toggle-pw"
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="pos-login-submit">
              <LogIn size={18} aria-hidden="true" />
              <span>{submitting ? "যাচাই হচ্ছে…" : "লগইন করুন"}</span>
            </button>

            <PWAInstallButton variant="login" />
          </form>
        </section>
      </main>
    </>
  );
}
