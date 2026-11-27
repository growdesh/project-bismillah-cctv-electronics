# Grow Desh IT Website (`growdeshit.com`)

Mobile-first, Bengali-first marketing website & unified 3-mode live business software demos for **Grow Desh IT**, built with React 19, TypeScript, Vite 7, and plain CSS.

## Quick Start

```bash
npm install
npm run dev                  # http://localhost:3200
npm run typecheck            # tsc --noEmit
npm run build                # typecheck + vite build + route SEO prerendering (dist/)
npm run preview              # serve dist/ on http://localhost:3200
npm run build:all-demos      # standalone builds into dist-demos/{retail-pos,wholesale,dealership}
```

## Website routes

- `/` — Main agency home page (Hero + Live Demo Modal, 3 Live Demos section, Product Registry, Services, Transparent One-Time Pricing, Process, FAQ, Lead Form)
- `/<slug>` — Dedicated software landing pages generated from `src/data/products.ts` (`/dealership-management` and `/agro-management`)
- `/demo/retail-pos(/*)` — Interactive Retail POS live demo (`GROW DESH POS`, 9 sidebar modules)
- `/demo/wholesale(/*)` — Interactive Wholesale live demo (`GROW DESH WHOLESALE`, 10 sidebar modules)
- `/demo/dealership(/*)` — Interactive Dealership Management live demo (`GROW DESH DMS`, 12 sidebar modules with SR/DSR field team & delivery pipeline)
- Any unknown path — Clean Bengali 404 page

Post-build, `scripts/prerender-routes.mjs` writes `dist/<slug>/index.html` for marketing routes (indexed, included in `dist/sitemap.xml`) and `dist/demo/<mode>/index.html` (`noindex, nofollow`, excluded from `dist/sitemap.xml`).

## Standalone Single-Demo Websites

Each demo can also be built and deployed as an independent website using the npm scripts:

```bash
npm run build:retail-demo       # dist-demos/retail-pos
npm run build:wholesale-demo    # dist-demos/wholesale
npm run build:dealership-demo   # dist-demos/dealership
npm run build:all-demos         # Builds all three standalone demo folders
```

In standalone mode, the root `/` route renders that demo directly without marketing header/footer, and `scripts/prerender-routes.mjs` marks `<meta name="robots" content="noindex, nofollow" />` with a demo-specific `<title>`.

## Configuration

The website and standalone demos build without environment variables. Keep the environment variable list empty for the initial Hostinger deployment. See [AGENTS.md](AGENTS.md#github-and-hostinger-deployment) for deployment settings.

The quote form validates Bangladeshi numbers, saves a local copy with campaign attribution, and prepares a WhatsApp message. The lead endpoint and Meta Pixel can be added later through the integration settings in `src/lib/config.ts`.

## Adding a New Software or Fixed-Price SaaS Product

Add a single entry to `PRODUCTS` in `src/data/products.ts`:
- `pricing.model: "starting"` or `"quote"` — keeps Home free of per-software exact prices and shows starting/discussion pricing on the product's landing page.
- `pricing.model: "fixed"` with `amountBn` (and optional `periodBn`) — renders the fixed price on both the Home card and the product landing page.
- Running `npm run build` automatically creates `dist/<slug>/index.html` and updates `dist/sitemap.xml`.

## Deployment (Vercel)

`vercel.json` is preconfigured with SPA rewrites to `/index.html`, `X-Robots-Tag: noindex, nofollow, noarchive` on `/demo/(.*)`, and immutable caching for `/demos/shared/fonts/*` and `/assets/*`. Prerendered static routes are served directly by Vercel before falling back to `/index.html`.

See [the demo guide](src/demos/demo.md) for the package folders, shared assets and screenshot workflow.
