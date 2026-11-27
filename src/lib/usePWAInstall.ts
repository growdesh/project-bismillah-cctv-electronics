import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __bismillahDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window !== "undefined" ? (window.__bismillahDeferredInstallPrompt ?? null) : null,
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectStandalone());
  const [isIOS] = useState<boolean>(() => detectIOS());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__bismillahDeferredInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleInstalled = () => {
      window.__bismillahDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const mq = window.matchMedia("(display-mode: standalone)");
    const handleDisplayMode = () => setIsInstalled(detectStandalone());

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    mq.addEventListener("change", handleDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      mq.removeEventListener("change", handleDisplayMode);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "manual"> => {
    const activePrompt = deferredPrompt ?? window.__bismillahDeferredInstallPrompt ?? null;
    if (!activePrompt) return "manual";

    await activePrompt.prompt();
    const { outcome } = await activePrompt.userChoice;
    if (outcome === "accepted") {
      window.__bismillahDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
    return outcome;
  }, [deferredPrompt]);

  return {
    canNativeInstall: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    promptInstall,
  };
}
