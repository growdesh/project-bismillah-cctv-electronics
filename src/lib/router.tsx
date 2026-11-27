import {
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

/**
 * Tiny History-API router.
 *  - navigate("/dealership") → pushState + scroll to top
 *  - navigate("/#contact")   → go to "/" then scroll to #contact
 *  - <Link to="..."> renders a real <a href> (crawlable) and intercepts plain left-clicks.
 */

const EVENT = "gd:navigate";

function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function getPath() {
  return normalizePath(window.location.pathname);
}

function getSearch() {
  return window.location.search;
}

export function normalizePath(path: string): string {
  const p = path.replace(/\/{2,}/g, "/");
  return p.length > 1 ? p.replace(/\/+$/, "") : "/";
}

function scrollToHash(hash: string, smooth: boolean) {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  return true;
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const url = new URL(to, window.location.href);
  if (url.origin !== window.location.origin) {
    window.location.href = url.toString();
    return;
  }
  const samePath = normalizePath(url.pathname) === getPath();
  const target = url.pathname + url.search + url.hash;
  if (opts.replace) window.history.replaceState(null, "", target);
  else window.history.pushState(null, "", target);
  window.dispatchEvent(new Event(EVENT));

  if (url.hash) {
    // Wait for the new route to render, then scroll to the anchor.
    const tryScroll = (n: number) => {
      if (scrollToHash(url.hash, samePath)) return;
      if (n > 0) requestAnimationFrame(() => tryScroll(n - 1));
    };
    requestAnimationFrame(() => tryScroll(20));
  } else {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
}

/** Scroll to the hash on first load (for /#contact links shared externally). */
export function scrollToInitialHash() {
  if (!window.location.hash) return;
  let n = 30;
  const tick = () => {
    if (scrollToHash(window.location.hash, false) || --n <= 0) return;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function useRouter() {
  const path = useSyncExternalStore(subscribe, getPath, () => "/");
  const search = useSyncExternalStore(subscribe, getSearch, () => "");
  return { path, search, navigate };
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  children?: ReactNode;
};

export function Link({ to, onClick, target, children, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (target && target !== "_self")
    )
      return;
    const url = new URL(to, window.location.href);
    if (url.origin !== window.location.origin) return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} target={target} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
