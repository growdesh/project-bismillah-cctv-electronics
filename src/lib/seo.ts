import { SITE } from "./config";

export interface SeoParams {
  title: string;
  description: string;
  image?: string;
  path: string;
  noIndex?: boolean;
}

export function toAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const clean = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE.origin}${clean}`;
}

function upsertMeta(attr: "name" | "property", key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

export function applySeo({ title, description, image, path, noIndex }: SeoParams): void {
  if (typeof document === "undefined") return;

  const url = SITE.origin ? toAbsoluteUrl(path === "/" ? "/" : path.replace(/\/+$/, "")) : "";
  const ogImage = image ? toAbsoluteUrl(image) : "";

  document.title = title;
  if (url) upsertCanonical(url);

  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow");

  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:site_name", SITE.name);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  if (url) upsertMeta("property", "og:url", url);
  if (ogImage) upsertMeta("property", "og:image", ogImage);
}
