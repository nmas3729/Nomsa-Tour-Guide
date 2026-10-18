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
