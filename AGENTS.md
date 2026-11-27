# Grow Desh IT website

React, TypeScript and Vite marketing website for `growdeshit.com`. The public site helps visitors understand services, see software work and request a quote. Interactive demos use sample data and open from software cards and landing pages.

## Skills for website work

- In the Grow Desh IT workspace, read the [workspace skill instructions](../AGENTS.md). Browser UI, React, CSS, accessibility and loading changes start with [`modern-web-guidance`](../.agents/skills/modern-web-guidance/SKILL.md). Search and retrieve the relevant guidance with Node.js 22 before editing.
- Use `imagegen` when available for requested ads, photos or illustrations. Software previews should use screenshots of the actual demo. Follow the Open Graph workflow below for demo landing pages.
- For a bug, reproduce the problem and inspect its cause before editing. For a UI change, verify mobile and desktop layouts and exercise any affected CTA or demo entry action.

## Start here

| Change | Files |
| --- | --- |
| Home services, pricing and conversion copy | `src/pages/Home.tsx`, `src/styles/home.css` |
| Contact details and WhatsApp messages | `src/lib/config.ts`, `src/lib/wa.ts` |
| Public navigation | `src/components/Header.tsx`, `src/components/Footer.tsx` |
| Portfolio layout and card actions | `src/pages/Portfolio.tsx`, `src/components/ProductCard.tsx`, `src/components/ProductDemoButton.tsx`, `src/styles/portfolio.css` |
| Software content and screenshots | `src/demos/<slug>/product.ts`, `public/demos/<slug>/screenshots/` |
| Reusable software landing page | `src/demos/shared/ProductLanding.tsx`, `src/components/ProductScreenshotSlider.tsx`, `src/styles/product.css` |
| Site routing and SEO | `src/App.tsx`, `src/lib/router.tsx`, `src/data/marketingRoutes.ts`, `src/components/Seo.tsx`, `scripts/prerender-routes.mjs`, `vercel.json` |
| Quote form, UTM attribution and tracking | `src/components/LeadForm.tsx`, `src/lib/leads.ts`, `src/lib/attribution.ts`, `src/lib/pixel.ts` |
| Interactive demo entry and screens | `src/demos/<slug>/Demo.tsx`, `src/demos/shared/`, [demo guide](src/demos/demo.md) |
| Demo data, capabilities and behavior | `src/demos/<slug>/seed.ts`, `src/demos/<slug>/Demo.tsx`, `src/demos/shared/demoStore.tsx` |

Use the active project's files. Treat any legacy standalone dealership app as a read-only reference. Agro/Khamar is a separate application.

## Public pages and conversion

- `/` leads with custom software and website development, both starting at ৳৪,৯৯০. Keep the hero image-free and the page copy and quote options service-focused. Link to `/portfolio` for individual products, screenshots and demos. Services have their own WhatsApp quote messages. The Home quote form lives at `/#contact`.
- `/portfolio` features three interactive packages. The package links across the top open the matching software landing pages. The cards offer **বিস্তারিত দেখুন** and **ডেমো দেখুন**.
- The featured software landing routes are `/dealership-management`, `/retail-pos` and `/wholesale-management`. Keep their copy concise and show the main mobile screens in a slider. `/agro-management` is a separate landing page outside the portfolio.
- Reuse `ProductDemoButton` on the portfolio and software landing pages. For Dealership, it must open the role picker on the current page and wait for Admin, SR, or DSR selection before navigating. Retail POS and Wholesale open directly. Keep demo URLs out of the main navigation and sitemap, and keep demo roots noindex. Populate demos with sample data only.
- Keep the brand **Grow Desh IT** and use the contact constants in `src/lib/config.ts`. The demo dealer code is `GDI-01`. Keep legacy references such as `bondhu`, `code bondhu`, `BondhuPOS`, `01798388388`, `CBD-01` and `khamari` out of customer-facing content.
- The existing one-time starting price is ৳৪,৯৯০. Home should display only the configured starting price. Keep separate-cost and third-party charge copy off marketing pages and demos. Use `SITE.startingPriceBn` and keep `GLOBAL_POLICY` and SEO copy aligned if the company changes its pricing. Do not reintroduce ৳৭,৯৯০, ৳৮,৯৯০ or ৳১৪,৯৯০.
- Keep Bengali copy concrete and mobile controls at least 44px tall. Use plain CSS, the existing theme tokens and self-hosted Noto Sans Bengali. Keep demo styles scoped to the demo shells.

## Demo folders and public assets

- Put reusable runtime code, screens and the landing template in `src/demos/shared/`. Put files used only by one product in `src/demos/<slug>/`, including `Landing.tsx`, `product.ts`, `Demo.tsx`, `seed.ts` and `demo.md`. The per-demo guide records URLs, roles or capabilities, data, and how to verify the software.
- Put shared logos, fonts and reusable files in `public/demos/shared/`. Give each product its own `public/demos/<slug>/` with a desktop cover, mobile screenshots under `screenshots/mobile/` and its `og.jpg`. A product should use its own images or the shared assets. The portfolio can show a cover for each package.
- The three packages are `retail-pos`, `wholesale-management` and `dealership-management`. Keep the global demo-mode and role toolbars out of all software workspaces. The Dealership entry button opens the three-role picker. The field profile can reopen the same picker under **আরও**.
- Register new package metadata in `src/data/products.ts`. For an interactive package, also add its mode to `src/lib/global.ts`, its landing and lazy demo component to `src/App.tsx`, and its prerender route and verification coverage.
- **Create a dedicated 1200 × 630 Open Graph image for every demo landing page.** Arrange exactly three distinct, readable mobile screenshots of that software. Place the largest screenshot in the center and one smaller screenshot on each side. Include the **Grow Desh IT** brand, **ডেমো দেখুন** and the visible WhatsApp number **01806476652**. Use `public/demos/<slug>/og.jpg`, set the product's `seo.image`, and verify the absolute image URL in `og:image` and `twitter:image`. Run `node scripts/capture-shots.mjs http://localhost:3200` against a running website to refresh screenshots and OG images. Pass `--og-only` to regenerate the OG images from the existing mobile screenshots. Check that each composition meets these requirements before publishing.
- Read [the demo guide](src/demos/demo.md) before changing demo routes, seeds, roles, landings or images.

## Client demo links and behavior

Use the matching production origin when sharing these paths.

| Software | Client path |
| --- | --- |
| Retail POS | `/demo/retail-pos` |
| Wholesale | `/demo/wholesale` |
| Dealership role picker | `/demo/dealership` |
| Dealership Admin, SR or DSR | `/demo/dealership?role=admin`, `?role=sr`, `?role=dsr` on the same path. SR and DSR can include `&staff=<id>`. |
| Agro/Khamar | Share the verified deployment URL for the separate app, or arrange a walkthrough. |

Every in-app exit or logout action must return the visitor to that demo's software landing page. Retail POS returns to `/retail-pos`, Wholesale to `/wholesale-management`, and all Dealership roles (Admin, SR and DSR) to `/dealership-management`. When running on a standalone demo origin, use the corresponding landing URL on `https://growdeshit.com`. Verify this from both the demo home and a nested screen.

Each package loads its own demo entry and shares the office engine. The demo store persists sample changes to `localStorage["gd-demo-v1:<mode>"]`. Reset restores seed data for the current mode. Retail has 9 sidebar modules, Wholesale adds suppliers and has 10, and Dealership adds deliveries, field team and paid/free stock. The secondary dealership organization hides deliveries and field team. Field entry and navigation preserve the selected role and staff query parameters. Standalone builds open the configured package at `/`.

## Leads and analytics

`LeadForm` normalizes Bengali digits and Bangladeshi mobile numbers, keeps a local copy with attribution in `gd-leads`, and prepares a WhatsApp message for the visitor to open and send. The lead endpoint and Meta Pixel are deferred. Add them only when requested. The default integration settings live in `src/lib/config.ts`.

## Build and verify

Use Node 22. On this machine it is available at `/home/emon/.nvm/versions/node/v22.23.2/bin`.

```sh
npm run dev
npm run typecheck
npm run build
npm run build:all-demos
npm run preview
LANDING_URL=http://localhost:3200 npm run verify
```

The website builds to `dist/`. Static route heads and `sitemap.xml` come from `scripts/prerender-routes.mjs`. Standalone builds land in `dist-demos/<mode>/`. Edit source files and rebuild artifacts. The verification script covers public navigation, 320–1440px layouts, demo-link visibility, product CTAs, quote handling and interactive demo roles. Pass a temporary path after `npm run verify --` to choose the screenshot directory.

## GitHub and Hostinger deployment

- Production source is [`growdesh/growdeshit-website`](https://github.com/growdesh/growdeshit-website), branch `main`. A push to `main` triggers the live site rebuild and redeploy when the Hostinger Web App is connected to this repository and branch with automatic deployment enabled.
- In Hostinger hPanel, use the Node.js Web App GitHub integration for this React/Vite project. Select the repository root, Node.js 22, build command `npm run build`, and output directory `dist`. Hostinger builds the site from committed source. [Hostinger deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- **No environment variables are required.** Leave **Environment variables** empty in hPanel. The standard build uses `https://growdeshit.com` and includes the website and client demo routes. Standalone builds select their mode through the npm scripts.
- Run the local build before pushing. After pushing, check **Deployments** in hPanel for the latest `main` commit and verify the live home, `/portfolio`, a software landing page and a direct demo link.
