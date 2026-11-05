# noslopfactory

An Astro website for future AI education, with a simulated merchandise shop at `/shop`. The homepage is intentionally a placeholder. The shop uses React, TanStack Router and TanStack Store. It takes no real orders and collects no payment or personal information.

## Development

Use Node 22.23.4 or later and pnpm.

```sh
pnpm install
pnpm exec astro dev --background
```

The local site runs at http://localhost:4321. Manage the background process with `pnpm exec astro dev status`, `pnpm exec astro dev logs`, and `pnpm exec astro dev stop`.

```sh
pnpm test
pnpm check
pnpm build
pnpm format:check
```

The build produces static files in `dist/`. Astro generates direct entry pages for the catalog, every product, cart, checkout, and confirmation. Shop navigation after loading is handled by TanStack Router. When adding a non-product shop route, update both `ShopApp.tsx` and the static path list in `src/pages/shop/[...path].astro`.

## Product content

Each product is one Markdown file in `src/content/products/`. Edit its YAML frontmatter to change the title, slogan, description, detail list, price, order, colors, sizes, and product photos. Prices use integer USD cents: `3200` means $32. The Markdown filename is the product ID and URL segment; use a flat, lowercase, hyphenated filename.

The collection schema in `src/content.config.ts` validates content during checks and builds. Each offered color needs exactly one image entry. Shirt sizes are XS, S, M, L, XL, 2XL, and 3XL. Store artwork under `public/products/`, with descriptive image text in the product's `alt` fields. `backImage` is optional; the starter back-print reference is photographed in off-white.

Product images contain the printed words. Changing the slogan in content changes site text, but does not rewrite the words in the photograph. Regenerate the affected photo when changing the artwork. See [image generation notes](docs/product-images.md).

## Deployment caching

HTML and stable public URLs, including product photos and favicons, use `no-cache, max-age=0, must-revalidate`. Browsers may retain a response, but must check it with the server before reuse. Only Astro's generated, fingerprinted files under `/_astro/` use four-week public immutable caching, because a changed file gets a new URL.

This policy is defined in `.upsun/config.yaml` using [Upsun static response headers](https://developer.upsun.com/docs/configure-apps/web/custom-headers). Keep stable filenames outside `/_astro/`; placing an unversioned public file there would give it immutable caching.

After `pnpm build`, run `pnpm check:cache` with the deployment origin (scheme and hostname, without a path, query, or fragment) as its argument. It checks the built HTML routes, a product photo, the favicon, and representative generated JavaScript, CSS and font responses against the real server. A local Astro preview does not apply Upsun's response-header configuration.

Responses already cached under the previous 24-hour policy cannot be revoked remotely. Existing visitors may need one hard refresh or must wait for that old cache entry to expire; later responses use revalidation.

## Cart and simulation

Cart selections are stored at `noslopfactory.cart.v1` in localStorage. Each product, color and size combination is a separate line, with quantities from 1 to 99. Current prices always come from content. Invalid or discontinued variants are discarded when restoring a saved cart. Storage events reconcile other tabs; simultaneous changes use the latest received state.

Checkout creates a local demo receipt and clears the cart. Only the most recent receipt is retained in the current tab's sessionStorage, at `noslopfactory.order.v1`. A confirmation refresh shows the same receipt without submitting another order. The application remains usable in memory if browser storage is blocked, but persistence cannot be guaranteed.

There is no backend, account system, analytics integration, payment provider, or tax calculation. Shipping is simulated: a flat $9 fee applies to product subtotals below $40, and shipping is free from $40 up (threshold on the subtotal, excluding shipping). The mini cart and cart page show progress toward free shipping, and new receipts record subtotal, shipping and total. Receipts without shipping fields from earlier versions still restore unchanged.

## Design and scope

The visual system reuses number6.ai's approved fonts, neutral palette, grid, spacing, and control rules. Claude-referencing product photography uses an approximate editorial serif, not a bundled proprietary Claude font.

- [Approved scope and verification plan](docs/specs/demo-shop.md)
- [Architecture decision](docs/adr/0001-astro-site-react-shop.md)
- [Governing issue](https://github.com/upsun/noslopfactory.com/issues/1)

SemVer impact: additive MINOR feature.
