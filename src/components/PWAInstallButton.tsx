import { CheckCircle2, Download, Share, Smartphone, X } from "lucide-react";
import { useState } from "react";
import { usePWAInstall } from "../lib/usePWAInstall";

interface PWAInstallButtonProps {
  variant?: "login" | "topbar" | "sidebar";
  compact?: boolean;
  onInstalledToast?: (msg: string) => void;
}

export function PWAInstallButton({
  variant = "topbar",
  compact = false,
  onInstalledToast,
}: PWAInstallButtonProps) {
  const { isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [guideOpen, setGuideOpen] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      onInstalledToast?.("অ্যাপটি সফলভাবে ইনস্টল হয়েছে");
      return;
    }
    if (outcome === "manual") {
      setGuideOpen(true);
    }
  };

  const buttonClass =
    variant === "login"
      ? "pos-pwa-install-btn"
      : variant === "sidebar"
        ? "dm-footer-action is-pwa"
        : "dm-pwa-topbar-btn";

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        aria-label="অ্যাপ ইনস্টল করুন"
        title="অ্যাপ ইনস্টল করুন (PWA)"
        data-pwa-install={variant}
        className={buttonClass}
      >
        <Download size={variant === "login" ? 17 : 16} aria-hidden="true" />
        {!compact && (
          <span className={variant === "topbar" ? "dm-pwa-topbar-label" : undefined}>
            অ্যাপ ইনস্টল করুন
          </span>
        )}
      </button>

      {guideOpen && (
        <div
          className="pwa-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="অ্যাপ ইনস্টল নির্দেশিকা"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGuideOpen(false);
          }}
        >
          <div className="pwa-modal-card">
            <div className="pwa-modal-head">
              <div className="pwa-modal-title-wrap">
                <span className="pwa-modal-icon" aria-hidden="true">
                  <Smartphone size={20} />
                </span>
                <div>
                  <h2 className="pwa-modal-title">অ্যাপ ইনস্টল করুন</h2>
                  <p className="pwa-modal-sub">হোম স্ক্রিন থেকে দ্রুত POS ব্যবহার করুন</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="বন্ধ করুন"
                onClick={() => setGuideOpen(false)}
                className="pwa-modal-close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="pwa-modal-body">
              {isIOS ? (
                <ol className="pwa-steps">
                  <li>
                    <Share size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span>Safari ব্রাউজারের নিচের <strong>Share</strong> বাটনে চাপ দিন।</span>
                  </li>
                  <li>
                    <CheckCircle2 size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span>তালিকা থেকে <strong>Add to Home Screen</strong> নির্বাচন করুন।</span>
                  </li>
                  <li>
                    <CheckCircle2 size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span>উপরে ডান পাশে <strong>Add</strong> চাপলে অ্যাপটি ইনস্টল হয়ে যাবে।</span>
                  </li>
                </ol>
              ) : (
                <ol className="pwa-steps">
                  <li>
                    <CheckCircle2 size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span>ব্রাউজারের উপরের মেনু (<strong>⋮</strong>) বা অ্যাড্রেস বারের <strong>Install</strong> আইকনে চাপ দিন।</span>
                  </li>
                  <li>
                    <CheckCircle2 size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span><strong>Install app</strong> বা <strong>Add to Home screen</strong> বেছে নিন।</span>
                  </li>
                  <li>
                    <CheckCircle2 size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span>এরপর সরাসরি মোবাইল বা কম্পিউটারের হোম স্ক্রিন থেকে অ্যাপটি চালু করতে পারবেন।</span>
                  </li>
                </ol>
              )}
            </div>

            <div className="pwa-modal-foot">
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="pwa-modal-ok"
              >
                বুঝেছি
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
