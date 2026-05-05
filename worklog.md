# Worklog — Site Performance + Pack Section UX Fixes

**Date:** 2026-03-05
**Commit:** `fix: improve site performance + simplify Pack section UX`

---

## ISSUE 1: Site Performance Improvements

### 1. LiveDataSection — No longer calls Arena API on initial page load
- **File:** `src/components/doom/live-data-section.tsx`
- Added `userRequestedData` and `dataLoaded` state variables
- API calls (`fetchStats`, `fetchTrending`) now only execute when the user clicks the **"📡 Load Arena Data"** button
- Polling intervals (15s for stats, 60s for trending) only start **after** the initial data load completes
- `loading` state initialized to `false` instead of `true` (since nothing is loading on mount)
- All live data cards (Live Price, Holders, Top Holders, Arena Live Feed, Stats Footer) are gated behind `userRequestedData`
- This is the **#1 performance fix** — the Arena API was being called immediately on page load, potentially blocking rendering

### 2. next.config.ts — Added optimization settings
- **File:** `next.config.ts`
- Added `images.formats: ["image/avif", "image/webp"]` for modern image format support
- Added `experimental.optimizeCss: true` for CSS optimization

### 3. Added `loading="lazy"` to all non-hero/non-logo `<img>` tags
- **Files changed:**
  - `src/components/doom/live-data-section.tsx` — holder profile pictures, thread user pictures
  - `src/components/doom/arena-game-section.tsx` — member profile pic, leaderboard user pics
  - `src/components/doom/meme-wall-section.tsx` — meme images (grid + lightbox)
  - `src/components/doom/meme-generator-section.tsx` — template images
  - `src/components/doom/arena-profile-section.tsx` — banner and profile avatar
  - `src/components/doom/footer.tsx` — footer logo
- Hero logo and navbar logo intentionally kept without `loading="lazy"` (above-the-fold)

---

## ISSUE 2: Pack Section UX Fixes

### 1. Simplified pre-registration view
- **File:** `src/components/doom/arena-game-section.tsx` (lines 741-762)
- **Before:** Showed Rank Tiers table + How To Earn breakdown (5 rows) + italic disclaimer + JOIN THE PACK button — overwhelming for first-time visitors
- **After:** Shows only:
  - 🐺 wolf emoji
  - "Join The Pack" heading (font-creepster, red-500)
  - One-liner: "Register your Arena handle. Earn points, climb ranks, get rewards."
  - "🐺 JOIN THE PACK" button prominently centered
- Rank Tiers and How To Earn details are still visible **after registering** (in the "How Points Work" card in the game tab)

### 2. ScrollReveal — Removed layout-shifting translateY animations
- **File:** `src/components/doom/scroll-reveal.tsx`
- **Before:** Used `translateY(40px)` / `translateX(40px)` on initial state, then animated to `y: 0, x: 0`. This caused elements to "jump" into place as they entered the viewport, pushing content below them down (layout shift).
- **After:** Uses **opacity-only animation** (`opacity: 0` → `opacity: 1`). No translate transforms at all. This eliminates layout shift completely while keeping a subtle fade-in effect.
- Removed the unused `direction` prop from the destructured parameters.
- Reduced duration from 0.6s to 0.5s for snappier feel.

### 3. Navbar scroll behavior
- **File:** `src/components/doom/navbar.tsx` — No changes needed
- The `scrollTo` function already uses smooth scroll with a 60px offset. The auto-scroll issue was caused by ScrollReveal's translateY animations pushing content down as they animated in. With the opacity-only fix, this problem is eliminated.

---

## Build Verification
- `DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npm run build` — ✅ Success
- All routes compiled and generated without errors
