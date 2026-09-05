# Repository Context

## Stack

**None.** `github.com/ashin-15/hackathon` has zero commits; the local clone `/home/ubuntu/repos/hackathon` contains only `.git`. There is no `package.json`, no lockfile, no framework config, no source, no CSS, no assets, no agent/instruction files, no schema, no test or build config. Nothing was inferred or assumed — the audit sections below are empty by fact, not by omission.

Confirmed by: `git log` (no commits), `git ls-remote origin` (no refs), `find` over the repo root (only `.git`), `git_list_repos` (no other repo in the account resembles an ICS product; nearest neighbours are `team-tracker`, `college-discover`, `urbanflow` — unrelated domains).

## Architecture

Does not exist yet. Recommended target stack (justified in *Dependencies / Risks*):

| Concern | Choice | Justification |
| --- | --- | --- |
| Framework | React 18 + Vite | Fast HMR, no SSR requirement (ICS is an authenticated operational console, not SEO surface); avoids Next.js server/client-component complexity for a hackathon-scale team. |
| Language | TypeScript (strict) | Status enums, incident taxonomies, and unit-typed values (coords, timestamps) are exactly what a type system prevents mistakes in. |
| Styling | Tailwind CSS v4 driven **entirely** by CSS custom properties | Tokens live in one CSS file, consumable by Tailwind utilities, raw CSS, canvas/map code, and chart libs alike. Prevents a token fork between "Tailwind config" and "runtime CSS". |
| Components | Headless primitives (Radix UI) + local `ui/` wrappers | Radix gives keyboard/focus/ARIA semantics for free — the single hardest accessibility requirement in the spec — while leaving all visuals to our tokens. No opinionated visual library to fight. |
| Routing | React Router v6 (data routers) | Route-level loaders map cleanly to "incident → view" navigation and to offline caching boundaries. |
| Data layer | TanStack Query | Its per-query `dataUpdatedAt`, `isStale`, `isFetching`, and offline/retry semantics are the substrate for the *data-freshness*, *sync-state*, and *connectivity* visual language the spec asks for. Building those indicators on ad-hoc `useEffect` fetching is the main reason such indicators end up lying. |
| Client state | Zustand for UI/session state only | Server state stays in TanStack Query; avoids the classic duplicate-source-of-truth bug. |
| Maps | MapLibre GL JS | Open, vector, offline-capable style/tile handling; no license-key dependency during a hackathon. |
| Charts | Visx or Recharts (`svg`) | SVG output can consume CSS custom properties directly, so charts inherit the token system instead of hard-coding hexes. |
| Icons | Lucide React | Consistent 24px grid, stroke-based (legible at small sizes and in high contrast), tree-shakeable. |
| Build/test | Vite, Vitest + Testing Library, Playwright, ESLint + Prettier | Playwright is required by the accessibility/mobile validation strategy (viewport emulation, `axe-core`, `prefers-reduced-motion` emulation). |

## Existing Design System

None. No color tokens, typography tokens, spacing tokens, radius tokens, shadows, icons, components, theme variables, breakpoints, or accessibility utilities exist.

## Current Mobile Support

None. No viewport meta, no breakpoints, no touch-target conventions, no responsive layout.

---

# Design-System Audit

## Already Good

Nothing to preserve — and one genuine advantage: **no legacy to migrate.** There are no hard-coded colors, no duplicated spacing, and no inconsistent components to unwind. The whole "migration" cost of this plan is zero if tokens land *before* the first feature component. That is the single most time-sensitive fact in this document.

## Needs Modification

N/A — nothing exists.

## Needs Standardization

N/A — nothing exists. Preventative equivalent: the conventions in Phase 1 must be enforced by lint *from the first commit*, otherwise this section will be non-empty within a week.

## Missing

Everything the specification requires. Enumerated as work items in the Implementation Plan.

## Potential Problems

Risks specific to starting greenfield, which this plan is designed to defuse:

1. **Feature-first ordering.** If incident/map/roster screens are built before tokens, hex literals and ad-hoc spacing spread across dozens of files, and the design system becomes a refactor rather than a foundation. Mitigation: Phases 1–3 gate all feature work.
2. **Semantic/categorical color collision.** The most likely and most damaging failure: a team color (categorical) rendered in the same green as `--safe`, so an operator reads "Team Green" as "status: safe". Mitigation: two disjoint palettes, separate namespaces, and a lint rule (Phase 2).
3. **Tailwind's default palette leaking in.** `bg-red-500` and `p-[13px]` silently bypass every token. Mitigation: disable default color/spacing scales; only token-derived utilities exist.
4. **Color-only status encoding.** Roughly 1 in 12 men has a CVD; an ICS whose criticality is encoded purely in hue is unusable for them and illegible in direct sunlight. Mitigation: the `StatusBadge` primitive is physically incapable of rendering without an icon + text label (Phase 5).
5. **The dark palette assumed to be sunlight-safe.** `#0a0a0f` on a phone in daylight is a black mirror. The provided palette is correct for a command center and inadequate for a field responder outdoors. Mitigation: a light theme is P0, not P2, and it is the *field* theme (Phase 2).
6. **Map layers ignoring tokens.** MapLibre styles are JSON, not CSS, so they will hard-code colors unless the style is generated from the token module. Mitigation: JS token export + style factory (Phase 2/6).
7. **Density collapse on small screens.** Naively shrinking a command-center-density table to 375px yields 11px text and 24px tap targets. Mitigation: mobile *increases* the minimum type size and target size rather than scaling everything down (Phase 4).
8. **Motion in a stress context.** Animated transitions on incident-status changes delay information and can trigger vestibular symptoms. Mitigation: motion tokens capped at 350ms, and reduced-motion disables all non-essential animation globally (Phase 5).

---

# Recommended Additions

**[P0] Centralized token layer (`tokens.css` + `tokens.ts`)**
* **What:** All colors, type, spacing, radius, shadow, motion, and z-index as CSS custom properties, plus a typed TS mirror generated/kept in lockstep for JS consumers (MapLibre, charts, canvas).
* **Why:** CSS-only tokens are invisible to map/chart code; JS-only tokens are invisible to CSS. ICS needs both.
* **Problem solved:** Prevents the exact token fork described in Potential Problem 6.
* **Recommendation:** Essential.

**[P0] Semantic status system (`safe / watch / warning / critical / info / accent`)**
* **What:** Each level gets a fixed tuple: `fg`, `bg`, `border`, icon, text label, and sort weight.
* **Why:** Status is the primary information channel of an ICS.
* **Problem solved:** Divergent renderings of "critical" across list, map, badge, and chart.
* **Recommendation:** Essential.

**[P0] Categorical palette, namespaced separately (`--cat-1..--cat-12`)**
* **What:** A ColorBrewer Set3/Paired-derived palette for team/agency/resource/incident-type/map-layer identity, deliberately hue-shifted away from the six semantic colors, with a deterministic `categoricalColor(key)` hash.
* **Why:** Identity and condition are orthogonal dimensions that must never share a color.
* **Problem solved:** Potential Problem 2.
* **Recommendation:** Essential.

**[P0] Dual theme: `dark` (command center) and `light` (field/outdoor), plus `system`**
* **What:** Both themes as `[data-theme]` overrides of the same token names; no component reads a raw color.
* **Why:** The provided dark palette is unreadable on a phone outdoors.
* **Problem solved:** Potential Problem 5.
* **Recommendation:** Essential.

**[P0] Focus-visible and touch-target utilities**
* **What:** A single global `:focus-visible` ring token applied via `@layer base`, and a `min-h-touch`/`min-w-touch` (44px) utility with an invisible tap-area expander for small icon buttons.
* **Why:** WCAG AA keyboard access and gloved-hand field use.
* **Problem solved:** Sub-44px targets and invisible keyboard focus.
* **Recommendation:** Essential.

**[P0] Reduced-motion support**
* **What:** A global `@media (prefers-reduced-motion: reduce)` block that zeroes all duration tokens.
* **Why:** Token-level implementation means it works everywhere automatically; per-component handling always misses cases.
* **Problem solved:** Potential Problem 8.
* **Recommendation:** Essential.

**[P1] Connectivity / sync / offline visual language**
* **What:** A persistent `ConnectionStatus` bar: `online` (silent), `reconnecting`, `offline`, `syncing (n pending)`, `sync failed`. Offline-queued records get a distinct outlined treatment.
* **Why:** Disaster ops run on degraded networks; an operator must never mistake stale local data for confirmed shared state.
* **Problem solved:** Silent data loss and false confidence.
* **Recommendation:** Essential in practice for an ICS; formally P1 because the app can boot without it.

**[P1] Data-freshness and timestamp conventions**
* **What:** A `<Timestamp>` primitive: relative age ("4m ago") with absolute UTC + local on hover/long-press, monospace digits, and an age-tinted dot (fresh / aging / stale) that also carries a text suffix.
* **Why:** Every operational decision depends on how old the data is.
* **Problem solved:** "Is this position report current?" — currently unanswerable at a glance.
* **Recommendation:** Recommended (strongly).

**[P1] Full state coverage: loading / empty / error / permission-denied**
* **What:** Four shared components with consistent iconography and copy tone; skeletons that match final layout to avoid reflow.
* **Why:** ICS screens routinely hit all four; ad-hoc handling produces a jarring, untrustworthy feel.
* **Problem solved:** Blank screens that are ambiguous between "no incidents" and "failed to load" — a dangerous ambiguity here.
* **Recommendation:** Recommended.

**[P1] Priority/emphasis scale**
* **What:** Tokenized emphasis levels (`ambient`, `notable`, `urgent`) controlling border weight, background lift, and optional pulse — distinct from status color.
* **Why:** Two critical incidents can differ in whether they need action *now*.
* **Problem solved:** Everything shouting at once, so nothing does.
* **Recommendation:** Recommended.

**[P1] Chart + map visualization standards**
* **What:** A documented mapping of token → chart series/axis/grid, and a MapLibre style factory built from `tokens.ts`, with a minimum symbol size of 12px and a minimum stroke of 1.5px.
* **Why:** Visualizations are where token discipline usually breaks.
* **Problem solved:** Potential Problem 6.
* **Recommendation:** Recommended.

**[P2] High-contrast mode**
* **What:** A third `[data-theme="hc"]` raising border and text contrast toward 7:1, plus `forced-colors` handling.
* **Why:** Sunlight, low-quality projector displays, and low-vision operators.
* **Recommendation:** Useful enhancement (cheap once the theme architecture exists — approximately one file).

**[P2] Confidence / uncertainty indicators**
* **What:** A visual vocabulary for unconfirmed reports: dashed borders, reduced fill opacity, an `unconfirmed` chip.
* **Why:** Early incident data is frequently unverified, and presenting it identically to confirmed data is misleading.
* **Recommendation:** Useful enhancement.

**[P2] Mobile density tokens**
* **What:** `--density-comfortable` (default, touch) and `--density-compact` (opt-in, desktop tables) as row-height/padding multipliers.
* **Why:** Command centers legitimately want more rows per screen; phones must not inherit that.
* **Recommendation:** Useful enhancement.

**[P3] Print/export consistency**
* **What:** A print stylesheet forcing the light theme, adding status text labels, and expanding relative timestamps to absolute.
* **Why:** ICS forms (204/205/214) get printed at shift change.
* **Recommendation:** Optional; add when export is built.

**Explicitly not recommended:** glassmorphism/blur surfaces (GPU cost on field devices, contrast loss), decorative gradients on status surfaces (breaks semantic color reading), custom scrollbar restyling, animated page transitions, and a custom icon set (Lucide is sufficient). None are justified by the project context.

---

# Implementation Plan

## Phase 1 — Foundation (P0)

Scaffold and lock conventions *before* any feature UI.

1. `npm create vite@latest . -- --template react-ts`; add React Router, TanStack Query, Zustand, Radix primitives, Lucide, MapLibre GL, Tailwind v4.
2. Directory structure:
   ```text
   src/
     styles/     tokens.css, base.css, themes.css, utilities.css, print.css
     design/     tokens.ts, status.ts, categorical.ts, mapStyle.ts, chartTheme.ts
     ui/         primitives (Button, Card, Badge, StatusBadge, Table, Sheet, Dialog, Timestamp, ...)
     components/ composed, domain-aware components
     features/   incidents/, resources/, map/, comms/
     routes/     route modules + loaders
     lib/        query client, api, offline queue
   ```
3. Tailwind v4 `@theme` configured so **only** token-derived utilities exist: default color and spacing scales disabled.
4. ESLint rules: ban hex/rgb literals and `px` values outside `src/styles/**`, ban arbitrary Tailwind values (`[...]`), ban raw `<button>`/`<input>` outside `src/ui/**`.
5. `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; `env(safe-area-inset-*)` wired into layout padding tokens.
6. Storybook (or a `/dev/tokens` route) as the visual review surface for all subsequent phases.

**Exit criterion:** a hex literal in a component fails lint.

## Phase 2 — Semantic Design Tokens (P0)

1. `tokens.css` — the specified base palette verbatim as the dark theme, extended with per-status triplets:
   ```css
   :root[data-theme="dark"] {
     --bg:#0a0a0f; --surface:#16161d; --surface-2:#1d1d26; --surface-3:#24242e;
     --fg:#f4f4f8; --muted:#8a8a9a; --disabled:#555563;
     --border:rgba(255,255,255,.08); --border-strong:rgba(255,255,255,.16);
     --safe:#34d399; --watch:#fbbf24; --warning:#fb923c; --critical:#f87171; --info:#60a5fa;
     --accent:#38bdf8;
     /* derived, per status: */
     --safe-fg:#34d399; --safe-bg:rgba(52,211,153,.12); --safe-border:rgba(52,211,153,.35);
     /* ...watch/warning/critical/info/accent identically... */
   }
   ```
2. `themes.css` — `[data-theme="light"]` redefines the *same* names with darkened status hues (the given values fail 4.5:1 on white; e.g. `--safe` becomes roughly `#047857`, `--critical` roughly `#b91c1c`, `--watch` roughly `#a16207`, verified in Phase 7, not guessed at merge time). Theme applied via `data-theme` on `<html>`, persisted in `localStorage`, defaulting to `system`; `color-scheme` set so native controls follow.
3. `categorical.ts` — 12 Set3/Paired-derived colors as `--cat-1..--cat-12`, each with a light-theme variant, plus `categoricalColor(key: string)` (stable hash) and `categoricalPair(key)` for fill/stroke. Documented rule: **categorical tokens never appear in a status context, and semantic tokens never encode identity.** Enforced by lint (`--cat-*` banned in `StatusBadge`/status modules; `--safe|watch|warning|critical` banned in legend/series modules).
4. `status.ts` — the single source of truth:
   ```ts
   type StatusLevel = 'safe' | 'watch' | 'warning' | 'critical' | 'info';
   // each -> { token, icon, label, shortLabel, weight, pattern }
   ```
5. Elevation: `--shadow-1/2/3` (subtle in dark, where borders do most of the work; more pronounced in light).

## Phase 3 — Typography & Spacing (P0)

1. Self-host Inter (variable) and JetBrains Mono via `@fontsource-variable` — no CDN dependency, since a command center may be air-gapped. `font-display: swap`; preload the Latin subset.
2. Type scale as tokens `--fs-11 … --fs-32` matching the specified ramp, each with a paired `--lh-*` and `--tracking-*`. Roles: `display-32`, `title-24`, `heading-20`, `subheading-18`, `body-16`, `body-14`, `label-13`, `caption-12`, `micro-11`.
3. Hard rule: `--fs-11` and `--fs-12` are permitted **only** for non-essential metadata on desktop, and are remapped upward on mobile (Phase 4). Body text never drops below 14px.
4. `tabular-nums` + JetBrains Mono for all counts, coordinates, timestamps, and radio call signs so columns do not jitter as values update.
5. Spacing tokens `--sp-1(4) … --sp-16(64)` covering the specified 4/8/12/16/20/24/32/40/48/64 scale. Radius `--r-sm 6 / --r-md 8 / --r-lg 12 / --r-xl 16`, plus `--r-full` for pills only.
6. Motion tokens: `--dur-fast 120ms`, `--dur-base 200ms`, `--dur-slow 300ms`; easings `--ease-out cubic-bezier(.2,0,0,1)`, `--ease-in-out cubic-bezier(.4,0,.2,1)`.

## Phase 4 — Responsive / Mobile Visual System (P0)

1. Breakpoints as tokens: `xs 360`, `sm 480`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1600`. Design floor is **320px**; no horizontal overflow at any width.
2. **Mobile-first defaults.** Base styles target the phone; breakpoints add density, not legibility.
3. Fluid type: role tokens use `clamp()` so mobile body sits at 16px and desktop may compact to 14px — inverting the usual (harmful) shrink-on-mobile behavior. `--fs-11`/`--fs-12` map to 13px minimum below `md`.
4. Fluid spacing: container/section padding tokens interpolate `--sp-4` (mobile) → `--sp-8` (desktop).
5. Layout rules per surface:
   * **Tables** → below `md`, render as a stacked card list from the same data definition (one `<DataView>` component, two renderers), never a horizontally scrolling table. Where a table must persist, the first column is sticky and the scroll region is explicitly marked.
   * **Map** → full-bleed with a bottom sheet (Radix Dialog in sheet mode) for details; controls docked bottom-right within thumb reach; minimum 44px control buttons; safe-area padding at the bottom.
   * **Dialogs** → become full-height bottom sheets below `md`, with drag-to-dismiss and a visible close button (never dismiss-by-backdrop-only).
   * **Navigation** → bottom tab bar below `md` (max 5 items, 56px tall, safe-area aware); collapsible sidebar at `lg`+.
   * **Charts** → responsive container, minimum 12px axis labels, legend below rather than beside on mobile, and a tabular fallback.
6. No fixed pixel widths anywhere; `min-width: 0` on flex/grid children by default to prevent the classic overflow bug.
7. Density tokens (`comfortable` default; `compact` opt-in, desktop-only).

## Phase 5 — Accessibility (P0)

1. **Focus:** global `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }` with a contrasting inner ring on colored surfaces. Never removed. Focus visible on the map's keyboard-reachable features too.
2. **Touch targets:** `--target-min: 44px`. Every interactive primitive enforces it; small icon buttons use a transparent `::after` expander so visual size and hit area can differ.
3. **No color-only encoding:** `StatusBadge` renders icon + text + color as an indivisible unit, with distinct Lucide glyphs per level (`shield-check`, `eye`, `alert-triangle`, `alert-octagon`, `info`). Map/chart series add shape or pattern (`--pattern-*`) in addition to hue.
4. **Reduced motion:** duration tokens set to `1ms` under `prefers-reduced-motion: reduce`; pulses and auto-scroll disabled; no parallax anywhere.
5. **Keyboard:** Radix supplies roving focus, focus trapping, and escape handling. Skip-to-content link; documented shortcuts (`/` search, `g i` incidents, `Esc` close) with a discoverable help sheet.
6. **Semantics:** live regions for incoming incidents (`aria-live="polite"`; `assertive` reserved for `critical`), correct landmarks, `aria-current` on nav, `<caption>`/`<th scope>` on tables.
7. **Contrast:** every token pair validated in Phase 7 against 4.5:1 (normal text) and 3:1 (large text and UI graphics — including map symbols and chart strokes against their backdrop).

## Phase 6 — Component Migration (P0/P1)

Greenfield, so "migration" means **building the primitive before its first consumer**. Order:

1. **Tier 1 primitives (`src/ui/`):** `Button` (variants: primary/secondary/ghost/danger; sizes sm/md/lg, all ≥44px on touch), `IconButton`, `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Switch`, `Card`, `Badge`, `StatusBadge`, `Tag` (categorical), `Tooltip`, `Dialog`/`Sheet`, `Tabs`, `Toast`, `Skeleton`, `Spinner`, `Timestamp`, `EmptyState`, `ErrorState`, `PermissionState`.
2. **Tier 2 composed (`src/components/`):** `IncidentCard`, `IncidentList`/`DataView`, `ResourceRow`, `PriorityBanner`, `ConnectionStatus`, `SyncBadge`, `FreshnessDot`, `MapLegend`, `ChartFrame`.
3. Each ships with a Storybook entry covering all statuses × both themes × 320/375/768/1440 widths, so regressions surface immediately.
4. Feature screens (incident board, incident detail, map, resource roster, comms log) are assembled **only** from Tier 1/2 components.

## Phase 7 — Validation (P0)

Detailed in *Validation Checklist*.

---

# File-Level Change Plan

Every file below is **newly created** — the repository is empty. "Current responsibility" is therefore *none* for all rows unless stated.

| Priority | File | Change | Reason | Risk |
| --- | --- | --- | --- | --- |
| P0 | `package.json` | Create; pin deps (prefer versions published ≥7 days) | Project does not exist | Low |
| P0 | `vite.config.ts` | Create; path aliases, Vitest config | Build tooling | Low |
| P0 | `tsconfig.json` | Create; `strict: true` | Type safety for status enums | Low |
| P0 | `index.html` | Create; viewport-fit=cover, theme bootstrap script | Prevents theme flash + notch clipping | Low |
| P0 | `src/styles/tokens.css` | Create; all primitives + derived status triplets | Single source of truth | **High** — every file depends on it; naming must be settled before Phase 6 |
| P0 | `src/styles/themes.css` | Create; `[data-theme=dark|light|hc]` | Command-center vs field readability | Medium — light-theme status hues must be contrast-verified, not eyeballed |
| P0 | `src/styles/base.css` | Create; reset, focus-visible, reduced-motion, body type | Global a11y guarantees | Low |
| P0 | `src/styles/utilities.css` | Create; touch targets, safe area, truncation, visually-hidden | Shared a11y helpers | Low |
| P0 | `tailwind.config.ts` / `@theme` block | Create; map utilities to tokens, disable default palettes | Stops `bg-red-500` bypassing tokens | Medium — disabling defaults breaks copy-pasted snippets (intended) |
| P0 | `src/design/tokens.ts` | Create; typed TS mirror of CSS tokens | Map/chart/canvas consumers | Medium — must stay in sync; guard with a unit test diffing the two |
| P0 | `src/design/status.ts` | Create; `StatusLevel` → token/icon/label/weight | Semantic single source | Low |
| P0 | `src/design/categorical.ts` | Create; `--cat-1..12` + stable hash | Identity ≠ condition | Medium — palette must be CVD-checked and hue-separated from semantics |
| P0 | `.eslintrc` / `eslint.config.js` | Create; no-hex, no-arbitrary-values, no-raw-controls rules | Enforces the system mechanically | Low |
| P0 | `src/ui/*` (≈24 primitives) | Create | Build before first consumer | Medium — API churn if built after features |
| P1 | `src/design/mapStyle.ts` | Create; MapLibre style generated from `tokens.ts` | Map must not fork the palette | Medium — restyling later is expensive |
| P1 | `src/design/chartTheme.ts` | Create; axis/grid/series mapping | Charts must not fork the palette | Low |
| P1 | `src/components/ConnectionStatus.tsx` | Create | Degraded-network truthfulness | Low |
| P1 | `src/ui/Timestamp.tsx` | Create; relative + absolute + freshness | Decision-critical data age | Low |
| P1 | `src/components/{EmptyState,ErrorState,PermissionState}.tsx` | Create | Disambiguates "none" from "failed" | Low |
| P1 | `.storybook/*` + `*.stories.tsx` | Create | Visual review + regression surface | Low |
| P1 | `playwright.config.ts`, `tests/a11y.spec.ts`, `tests/responsive.spec.ts` | Create; axe + viewport matrix | Automates the a11y contract | Low |
| P1 | `scripts/check-contrast.ts` | Create; asserts every token pair meets AA | Catches theme regressions in CI | Low |
| P2 | `src/styles/themes.css` (`hc` block) | Extend | Sunlight / low vision | Low |
| P2 | `docs/design-system.md` | Create; naming conventions + usage rules | Onboarding, prevents drift | Low |
| P3 | `src/styles/print.css` | Create | ICS form printing | Low |
| P0 | `.github/workflows/ci.yml` | Create; lint, typecheck, test, contrast, axe | Enforcement | Low |
| P0 | `README.md` | Create; setup + design-system entry point | Repo currently has no docs | Low |

---

# Dependencies / Risks

**Ordering dependency (highest risk):** `tokens.css` → `tokens.ts` → `status.ts`/`categorical.ts` → `ui/` primitives → feature screens. Building any feature screen before its primitives exists is the one decision that would make this plan expensive to complete.

**Token duplication (CSS ↔ TS):** mitigated by a unit test that parses `tokens.css` and asserts key-for-key equality with `tokens.ts`. Without it, the two silently diverge.

**Light-theme contrast:** the supplied palette is tuned for a near-black background. Its status hues will fail AA on white and *must* be re-derived and verified (Phase 7), not reused.

**Stack choices are proposals, not settled facts:** React/Vite/Tailwind/MapLibre are recommendations based on the stated ICS requirements. If you have a mandated stack (Next.js, Vue, an existing component library, Mapbox with a key), say so before Phase 1 — the token architecture is portable, but the file layout and Tailwind specifics are not.

**Supply chain:** pin exact versions; prefer releases published ≥7 days ago; no floating ranges.

**Scope:** Phases 1–5 are the design system proper. Phase 6 explicitly excludes business logic — feature screens are shells demonstrating the system.

---

# Validation Checklist

**Desktop visual validation**
- [ ] All primitives render correctly at 1440px and 1920px in both themes.
- [ ] Storybook shows every status × every variant with no missing or fallback color.
- [ ] No layout shift when live values update (tabular numerals verified).

**Mobile validation**
- [ ] Real-device or emulator check at 375×667 and 390×844.
- [ ] Every interactive element measures ≥44×44px (automated Playwright bounding-box assertion).
- [ ] Bottom nav clears the home indicator (safe-area insets applied).
- [ ] Map bottom sheet is usable one-handed; controls sit within thumb reach.
- [ ] Tables render as cards below `md`; no horizontal scroll.

**Narrow viewport validation**
- [ ] No horizontal overflow at 320px on any route (`document.scrollingElement.scrollWidth <= clientWidth`).
- [ ] No text below 13px anywhere below the `md` breakpoint.
- [ ] Dialogs remain fully reachable and dismissible at 320×568.

**Dark/light theme validation**
- [ ] Every token defined in all themes (test asserts no `var()` resolves empty).
- [ ] No component reads a raw hex (lint-enforced).
- [ ] Theme switch causes no flash; `system` preference respected; choice persists across reload.

**Contrast validation**
- [ ] `scripts/check-contrast.ts` passes: ≥4.5:1 normal text, ≥3:1 large text and UI graphics, in **all** themes.
- [ ] Map symbols and chart strokes meet 3:1 against their actual backdrop (including over satellite imagery).
- [ ] Disabled states remain perceivable (≥3:1) even though exempt from AA.

**Color-blindness validation**
- [ ] Deuteranopia/protanopia/tritanopia simulation of the status set: each level distinguishable by icon and label alone.
- [ ] Categorical palette adjacent-pair check under the same simulations.
- [ ] Grayscale screenshot test: all statuses still readable.

**Reduced-motion validation**
- [ ] Playwright with `reducedMotion: 'reduce'`: no animation exceeds 1ms; no pulses; no auto-scroll.

**Component consistency**
- [ ] Zero hex/rgb literals outside `src/styles/**` (lint).
- [ ] Zero arbitrary Tailwind values (lint).
- [ ] Zero raw `<button>`/`<input>` outside `src/ui/**` (lint).
- [ ] No `--cat-*` token in a status context; no semantic token in a categorical legend (lint).

**Regression testing**
- [ ] Storybook visual snapshots across the theme × viewport matrix, gating CI.
- [ ] `axe-core` clean (zero serious/critical) on every route in both themes.
- [ ] Keyboard-only walkthrough of each primary flow with no trap and no lost focus.
- [ ] CI runs lint, typecheck, unit, contrast, and a11y on every PR.

---

**PLAN READY — awaiting approval before implementation.**
