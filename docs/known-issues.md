# Known Issues

## 2026-10-18 — Homepage rendered Suspense fallback indefinitely in production

**Symptom:** `https://tour.nmas.site/` served the hero + "Loading approved experiences and local guides…" forever. Route returned HTTP 200 in ~0.5s. Other routes (`/experiences`, `/guides`, `/destinations`) worked correctly with the same Prisma service layer.

**Not the cause** (all checked): missing Prisma client, wrong DATABASE_URL, DB connection hang, empty DB, migration state, build cache.

**Root cause:** `<Suspense fallback={<HomePageFallback />}>` in `app/page.tsx` around an async component that calls `await connection()`, combined with Next.js 16's `cacheComponents: true` and Partial Prefetching. The stream closed after the fallback was flushed and the real content never reached the client.

**Fix:** Removed the Suspense wrapper. `HomePage` renders synchronously inside the route component. `HomePageFallback` remains exported in `home-page.tsx` (unused) for a future `app/loading.tsx` once the PPR interaction is better understood.

**Verification after deploy:**
- `wc -c` on homepage HTML: 169031 bytes (fallback shell was ~25 KB)
- `grep -c '<h2'`: 10 (fallback had 1)
- Playwright visible-text check confirms full section structure

**Do not reintroduce `<Suspense>` around `<HomePage />` without testing PPR behaviour on a Coolify deployment first.**

## npm audit — dev-only vulnerabilities (2026-10-18)

`npm audit --omit=dev` → **0 vulnerabilities** (production is clean).

Full `npm audit` reports 8 findings, all in dev tooling:
- `tinypool` (critical, ×2) — Vitest worker pool
- `braces` (high) — via `eslint-config-next` glob matching
- `@vitest/mocker` (moderate) — Vitest mock helper
- `vitest` (transitive)

**Action:** none required for production. Do not run `npm audit fix --force` — it downgrades `eslint-config-next` from 16 to 14 (breaking) and major-bumps `vitest`. Revisit when `vitest` and `eslint-config-next` release patched versions of the vulnerable transitive deps.
