# Sahayam — Implementation Plan

Scope: close the gap between what the README claims and what the code does, then add a real backend so the frontend's scoring, passport, and DTN features stop depending on `localStorage` and a dead `/api/dtn/*` path.

Grounded in the repository as of commit `c28bf70`:

- Frontend: React 19 / TS 5.9 / Vite 8 / MapLibre 6 / Vitest 3. 10 tests passing.
- `src/data/dtn.ts` already calls `GET /api/dtn/events` (SSE), `GET /api/dtn/bundles`, `POST /api/dtn/sos`, `POST /api/dtn/custody`, `POST /api/dtn/uplink`. **Nothing serves them.**
- `src/data/store.ts` holds households/members/auth in `localStorage`; QR token is `sahayam:user:<id>`.
- `dataset/schema.sql` already defines PostGIS tables for cells, signal types, expected/actual profiles, scenarios, scenario cells. `dataset/data/*.csv` has 100 cells, 537k expected + 537k actual rows, 67k ground-truth rows, 5 known scoring cases.
- `src/data/generate_geo_silence.py` implements the scorer (weighted deficit) and writes `geographicSilenceData.json`.
- Toolchain present: Python 3.14, `uv`, `psql`, `docker`. FastAPI not yet installed.

Every phase is independently shippable. Phases 0–2 need no Python. Phase 3 introduces the backend; Phase 4 wires the frontend to it while keeping the offline-only demo path working.

---

## Guiding decisions

| Decision | Choice | Why |
|---|---|---|
| API contract | Freeze the five `/api/dtn/*` routes as they exist in `dtn.ts`; the Vite plugin (Phase 0) and FastAPI (Phase 3) both implement the **same** contract | Frontend does not change between the two; backend can be swapped in by proxy alone |
| Backend stack | FastAPI + `psycopg[binary]` 3 + raw SQL against PostgreSQL/PostGIS (docker-compose), managed with `uv` | Schema already exists as SQL; ORM adds nothing for a hackathon; `uv` is on the machine |
| Scorer | One Python module `backend/app/scoring.py`, imported by both the API and the dataset scripts | Single source of truth; validation script tests the exact code the API runs |
| Integrity hash | `crypto.subtle.digest('SHA-256')` over canonical JSON (client) and `hashlib.sha256` over the same canonicalisation (server) | Tamper-evidence, not encryption. Rename field `encryptedHash` → `integrityHash`, add `hashAlgo: 'SHA-256'` |
| Offline shell | `vite-plugin-pwa` (Workbox) | Precache app shell; runtime-cache tiles; never cache `/api` |
| QR camera | `BarcodeDetector` when available, `jsqr` fallback on a `<canvas>` | Native path on Android Chrome, JS path everywhere else |
| i18n | Tiny typed dictionary + React context (`en`, `ml`), no library | ~150 strings, no plural/ICU needs; avoids a dependency |
| Frontend/backend switch | `VITE_API_URL` env var. Unset → current localStorage-only behaviour; set → API with local queue | Demo keeps working with no backend running |

---

## Phase 0 — Make the DTN relay real (Vite dev-server plugin)

**Goal:** two browsers / two phones on the same LAN see each other's SOS bundles live.

### Files
- `vite-plugins/dtnRelay.ts` (new)
- `vite.config.ts` (register plugin, `server.host: true` so phones can reach it)

### Design
In-memory `Map<bundleId, ADUBundle>` + `Set<ServerResponse>` of SSE clients inside `configureServer(server)`. Use `server.middlewares.use('/api/dtn', handler)`.

| Route | Behaviour |
|---|---|
| `GET /api/dtn/events` | Set `text/event-stream`, send `event: init` with all bundles, keep socket, heartbeat comment every 25 s, remove on `close` |
| `GET /api/dtn/bundles` | JSON array of all bundles |
| `POST /api/dtn/sos` | Validate minimal shape (`bundleId`, `originNodeId`, `cellId`, `emergencyType`, `integrityHash`), upsert, broadcast `event: new_bundle` |
| `POST /api/dtn/custody` | Find bundle, set `status=IN_TRANSIT`, `custodian`, push `CUSTODY_ACQUIRED` receipt, broadcast `event: custody_updated` |
| `POST /api/dtn/uplink` | Set `status=DELIVERED_COMMAND`, `deliveredAt`, push `GATEWAY_UPLINKED` receipt, broadcast `event: bundle_delivered` |
| `DELETE /api/dtn/bundles` | Reset (used by demo reset button) |

Event names must match the listeners already registered in `dtn.ts` (`init`, `new_bundle`, `custody_updated`, `bundle_delivered`).

### Frontend touch-ups
- `dtn.ts`: on `onerror`, reconnect with backoff (EventSource auto-reconnects, but `connectedToRelay` should flip back to `true` on next `init`).
- `resetDemo()` also calls `DELETE /api/dtn/bundles`.
- Show relay connection state in `DtnRelayPage` (already has `isRelayConnected`).

### Verify
- `npm run dev -- --host`; open the civilian SOS page on a phone and the DTN relay page on a laptop; publish SOS → laptop chimes and shows bundle within a second.
- Unit test: `vite-plugins/dtnRelay.test.ts` spins the handler with mocked `req/res` and asserts state transitions and SSE payloads.

Size: **S**

---

## Phase 1 — Real integrity hashing + verification

**Goal:** `integrityHash` is a genuine SHA-256 over a canonical payload, verified at every custody step.

### Files
- `src/data/canonical.ts` (new): `canonicalize(obj)` — recursively sort keys, drop `undefined`, `JSON.stringify`; `hashBundlePayload(bundle)` — hash over the **immutable** fields only: `bundleId, originNodeId, originName, householdName, cellId, emergencyType, coordinates, medicalSummary, bloodGroup, conditions, medication, isBedridden, priority, createdAt`. Mutable fields (`status`, `custodian`, `custodyReceipts`, `deliveredAt`) are excluded so the hash stays stable through the chain.
- `src/data/dtn.ts`: replace random hex with `await hashBundlePayload(...)`; add `verifyBundle(bundle): Promise<boolean>`; `acceptCustody` and `uplinkToGateway` refuse (return `{ ok:false, reason:'HASH_MISMATCH' }`) when verification fails; SSE handlers verify incoming bundles and mark `tampered: true` instead of silently upserting.
- `vite-plugins/dtnRelay.ts`: verify hash on `POST /sos` with Node `crypto.createHash('sha256')` over the same canonicalisation; reject 400 on mismatch.
- `src/pages/FieldPages.tsx` (DtnRelayPage): show a "Verified SHA-256" / "Tampered" badge per bundle.

### Tests
- `canonical.test.ts`: key order independence; `undefined` dropped; known vector matches a precomputed digest.
- `dtn.test.ts`: publish → hash is 64 hex and equals recomputed hash; mutate `medication` → `verifyBundle` false → `acceptCustody` refused. Existing test `expect(bundle.encryptedHash).toHaveLength(64)` updated to `integrityHash`.

Note: `crypto.subtle` exists in jsdom/Node ≥ 20 via `globalThis.crypto`; no polyfill needed.

Size: **S**

---

## Phase 2 — Documentation honesty + market model

### 2a. README corrections (`README.md`)
| Line | Current claim | Replace with |
|---|---|---|
| 8 | `Tests-9 passed` badge | Read from actual count (10 now); or drop the hard-coded number |
| 45, 71, 92 | Wi-Fi Direct DTN / proximity radar | "Proximity transport is **simulated** in the web prototype via `BroadcastChannel` (same device) and an SSE relay (same LAN). Wi-Fi Direct / BLE requires the native shell scoped in `motion-fingerprint-plan.md`." |
| 70, 166 | "encrypted, SHA-256" | "tamper-evident bundles (SHA-256 integrity hash over a canonical payload; **not encrypted** in the prototype)" — true after Phase 1 |
| 76–79 | QR "encodes critical medical indicators" | "QR encodes only an opaque token `sahayam:user:<id>`. Medical data is resolved on the authorised volunteer's device; a photographed QR leaks nothing." |
| 80 | "scan in under 1 second" | Keep only after Phase 6 lands; until then "token entry / sample picker; camera scanning planned" |

Add a short **"What is real vs. simulated"** table near the top. Judges reward this.

### 2b. `MARKET.md` (new)
Sections, each ≤ 1 page:
1. **Users & buyers** — DEOC/SDMA (buyer), ASHA workers & volunteers (field users), households (end users), NGOs (channel).
2. **Pilot** — one district (Wayanad), 100 cells already modelled, 3 relief camps already in fixtures; success metrics: time-to-first-verification for top-10 silent cells; % households with passports.
3. **Cost model (yearly, order-of-magnitude)** — 1 managed Postgres/PostGIS, 1 small API host, CDN for static PWA, map tiles (CARTO free tier / self-hosted OpenMapTiles), on-call maintenance. Present as a table with low/likely/high columns.
4. **Funding route** — SDMA/NDMA procurement, State Disaster Response Fund capacity-building line, CSR, and NGO co-funding for field devices.
5. **Distribution** — passports issued during ASHA household visits; volunteers onboarded through existing Civil Defence / Aapda Mitra training.
6. **Sustainability** — open-source core (MIT), state hosts its own instance; no per-seat licensing.
7. **Risks** — data-sharing agreements with telcos for mobility/communication signals; privacy (DPDP Act) — mitigated by opaque QR + on-device medical data.

Size: **S**

---

## Phase 3 — FastAPI backend + PostGIS

**Goal:** authoritative scoring, persistence, and the DTN relay move server-side; the frontend becomes a client.

### Layout
```
backend/
  pyproject.toml            # uv-managed; fastapi, uvicorn[standard], psycopg[binary,pool], pydantic-settings, python-jose, pandas (scripts only)
  app/
    main.py                 # app factory, CORS, routers, lifespan (pool)
    settings.py             # DATABASE_URL, JWT_SECRET, CORS_ORIGINS
    db.py                   # psycopg connection pool helpers
    scoring.py              # weighted-deficit scorer (pure functions, no I/O)
    routers/
      health.py
      auth.py               # POST /api/auth/login → JWT (prototype users seeded)
      cells.py              # GET /api/cells?bbox=  → GeoJSON polygons + points
      scores.py             # GET /api/scores?scenario=&window=  ; GET /api/scores/{cell_id}/breakdown
      scenarios.py          # GET /api/scenarios
      households.py         # GET/POST /api/households ; POST /api/households/{id}/members
      members.py            # GET /api/members/by-qr/{token} ; PATCH /api/members/{id}/status
      dtn.py                # same 5 routes + DELETE, SSE via StreamingResponse; in-process pub/sub
    sse.py                  # asyncio.Queue fan-out for SSE clients
  scripts/
    load_dataset.py         # COPY dataset/data/*.csv into schema tables
    score_all.py            # compute silence_scores for every (cell, window); idempotent, append-only
    validate_scorer.py      # Phase 7
  sql/
    001_dataset.sql         # = dataset/schema.sql (symlink or copy)
    002_app.sql             # households, members, users, dtn_bundles, custody_receipts, silence_scores
  tests/
    test_scoring.py         # known_scoring_cases.csv drives parametrised tests
    test_dtn.py             # httpx AsyncClient: sos→custody→uplink; hash rejection
    test_members.py
docker-compose.yml          # postgis/postgis:16-3.4 + backend
```

### New tables (`002_app.sql`)
```sql
users(id, email UNIQUE, password_hash, role CHECK (role IN ('user','volunteer','admin')), name, member_id NULL)
households(id, name, head, ward, cell_id REFERENCES spatial_cells, contact, registered_at)
members(id, household_id, name, age, gender, blood_group, conditions, medication, disability,
        is_elderly, is_pregnant, is_infant, is_bedridden, emergency_contact, qr_token UNIQUE,
        status, camp_name, registered_at)
dtn_bundles(bundle_id PK, origin_node_id, origin_name, household_name, cell_id, emergency_type,
            coordinates GEOMETRY(Point,4326), medical_summary, blood_group, conditions, medication,
            is_bedridden, priority, integrity_hash, hash_algo, status, created_at, delivered_at,
            custodian JSONB)
custody_receipts(id BIGSERIAL, bundle_id REFERENCES dtn_bundles, custodian_id, custodian_name,
                 ts, location, action)
silence_scores(id BIGSERIAL, cell_id, window_start, scenario_id, score NUMERIC(5,4),
               confidence NUMERIC(4,3), breakdown JSONB, scorer_version TEXT, computed_at)
  UNIQUE(cell_id, window_start, scenario_id, scorer_version)   -- append-only per version
```

### Scorer (`scoring.py`) — port of `generate_geo_silence.py` lines 71–110
```python
def score_cell(rows: list[SignalRow], weights: dict[str, float]) -> CellScore:
    # rows: expected, actual, baseline_valid, data_available per signal_type
    # deficit = clamp(1 - actual/expected) when baseline_valid and data_available and expected >= 0.05
    # score = Σ(w·deficit)/Σw over valid signals; breakdown per signal with status active|unavailable|low_baseline
    # confidence = Σw_valid / Σw_all  (new: separates "how sure" from "how bad")
```
Return both `score` and `confidence`; the UI already shows them as separate numbers. Add a `scorer_version` constant (`"wd-1.0"`).

### API contract summary
| Method & path | Notes |
|---|---|
| `POST /api/auth/login` | `{email, password}` → `{token, role, name}`; seed 3 prototype users |
| `GET /api/scenarios` | id, label, description, window |
| `GET /api/cells?bbox=w,s,e,n` | `{polygons: FeatureCollection, points: FeatureCollection}` — same shape as `geographicSilenceData.json` so `SilenceMap` needs no change |
| `GET /api/scores?scenario=severe_silence` | `[{cellId, score, confidence, reportsExpected, reportsObserved, lastSignal}]` |
| `GET /api/scores/{cellId}/breakdown?scenario=` | per-signal breakdown |
| `GET /api/households`, `POST /api/households/{id}/members` | auth: volunteer/admin |
| `GET /api/members/by-qr/{token}` | auth: volunteer/admin; returns full medical record |
| `PATCH /api/members/{id}/status` | check-in |
| `GET /api/dtn/events` (SSE), `GET /api/dtn/bundles`, `POST /api/dtn/sos`, `POST /api/dtn/custody`, `POST /api/dtn/uplink`, `DELETE /api/dtn/bundles` | identical to Phase 0; server recomputes SHA-256 and rejects mismatch |

### Dev workflow
```
docker compose up -d db
cd backend && uv sync
uv run python scripts/load_dataset.py     # ~1M rows via COPY, tens of seconds
uv run python scripts/score_all.py        # writes silence_scores
uv run uvicorn app.main:app --reload --port 8000
```
Vite: `server.proxy = { '/api': process.env.VITE_API_URL ?? 'http://localhost:8000' }` when the env var is set; otherwise the Phase 0 plugin serves `/api/dtn` only.

### Tests
- `test_scoring.py` parametrised over `known_scoring_cases.csv` (`expected_base_score ± score_tolerance`) — this is the single most convincing test in the repo.
- `test_dtn.py`: full lifecycle; tampered payload → 400.
- `test_members.py`: QR lookup requires volunteer/admin token; user token → 403.

Size: **L**

---

## Phase 4 — Frontend API client + sync queue

**Goal:** the stores talk to the backend when available, queue when not, and never lose the offline-only demo.

### Files
- `src/api/client.ts` (new): `apiFetch<T>(path, init)` with JWT header, `VITE_API_URL` base, typed error. `isApiEnabled()`.
- `src/api/types.ts`: DTOs mirrored from Pydantic models (hand-written; keep small).
- `src/data/syncQueue.ts` (new): IndexedDB (via a 60-line wrapper, no library) table `outbox {id, method, path, body, createdAt, attempts, state}`. States exactly as the system plan: `LOCAL_ONLY → QUEUED → TRANSFERRED → SERVER_ACCEPTED | FAILED`. Flush on `online` event and on interval.
- `src/data/store.ts`: `addMemberToHousehold` → write locally (LOCAL_ONLY), enqueue `POST /households/{id}/members`, mark SERVER_ACCEPTED on 2xx. `getMemberByQr` → try API, fall back to local cache. `login` → API when enabled.
- `src/data/dtn.ts`: replace direct `fetch` calls with queue entries so an SOS raised offline is delivered on reconnect (this is the actual DTN story).
- `src/pages/CommandPage.tsx`: load scenarios/scores/cells from API when enabled; else import JSON as today.
- `ui.tsx` `SyncQueue`: read real counts from the outbox instead of a prop.

### Tests
- `syncQueue.test.ts` with fake IndexedDB (`fake-indexeddb` dev dep) — enqueue offline, flush online, failure retry.
- Existing App tests continue to run with `VITE_API_URL` unset.

Size: **M**

---

## Phase 5 — PWA: service worker + manifest

### Files
- `vite.config.ts`: `VitePWA({ registerType: 'autoUpdate', manifest: {...}, workbox: {...} })`
- `public/icons/` 192/512 px + maskable
- `src/main.tsx`: `registerSW({ onNeedRefresh, onOfflineReady })` → toast via existing `notice` styles
- `index.html`: `<link rel="manifest">`, iOS meta tags

### Workbox strategy
| Pattern | Strategy |
|---|---|
| App shell (`index.html`, JS/CSS chunks) | Precache. Set `maximumFileSizeToCacheInBytes: 3_000_000` because the command chunk is ~970 kB |
| Raster tiles (`basemaps.cartocdn.com`, `server.arcgisonline.com`) | `CacheFirst`, `ExpirationPlugin({ maxEntries: 600, maxAgeSeconds: 7d })` |
| `/api/scores`, `/api/cells`, `/api/scenarios` | `StaleWhileRevalidate` (stale scores are labelled as such in the UI already) |
| `/api/dtn/*`, `/api/auth/*`, `/api/members/*` | `NetworkOnly` (writes go through the sync queue, not the SW) |

Manifest: `display: standalone`, `theme_color` `#073b33` (matches `index.html`), start URL `/`, shortcuts for `/civilian/sos` and `/field/scanner`.

### Verify
- Lighthouse PWA installable.
- DevTools → Network Offline → reload `/civilian/passport` renders with cached QR.
- Phone: Add to Home Screen; airplane mode; open → shell loads.

Size: **M**

---

## Phase 6 — Camera QR scanning

### Files
- `src/components/QrScanner.tsx` (new)
- `src/pages/FieldPages.tsx` (ScannerPage): replace the simulated frame with `<QrScanner onDetect={handleScanToken} />`; keep the sample picker and manual token input as fallbacks.
- `package.json`: add `jsqr` (mature, no deps).

### Behaviour
1. `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` → `<video autoplay playsinline muted>`.
2. If `'BarcodeDetector' in window` → `new BarcodeDetector({ formats: ['qr_code'] })`, poll `detect(video)` every ~150 ms with `requestAnimationFrame` throttle.
3. Else draw frame to hidden `<canvas>`, run `jsQR(imageData, w, h)`.
4. On match: debounce (same token within 2 s ignored), vibrate 50 ms if `navigator.vibrate`, call `onDetect(token)`, show the existing green `notice--safe` state.
5. Stop tracks on unmount, on route change, and on `visibilitychange` hidden.
6. Permission denied / no camera → render manual entry with a plain explanation, no red error.

HTTPS is required for camera on phones: add `@vitejs/plugin-basic-ssl` in dev (or run behind the PWA's production HTTPS host). Document in README "Run on a phone".

### Tests
- Component test with `getUserMedia` mocked to reject → manual fallback rendered.
- `BarcodeDetector` mocked to resolve `[{ rawValue: 'sahayam:user:usr-kuru-1' }]` → `onDetect` called once despite repeated detections.

Size: **M**

---

## Phase 7 — Scorer validation (precision / recall)

### Files
- `backend/scripts/validate_scorer.py`
- `dataset/VALIDATION.md` (generated)
- README: "Scorer validation" section with the table and a badge

### Method
1. Load expected/actual/signal_types; compute `score`, `confidence` for every `(cell, window)` with `app.scoring` (same code the API runs).
2. **Known cases**: assert each of the 5 rows in `known_scoring_cases.csv` within tolerance; print PASS/FAIL table.
3. **Ground truth**: join to `silence_ground_truth.csv`. Positive class = `expected_state ∈ {PARTIAL_SILENCE, SEVERE_SILENCE, COMPLETE_SILENCE}`; negative = `NORMAL`. Exclude `false_silence`, `communication_outage`, `network_failure` from the positive class but **report them separately** — they are exactly the cases the `unavailable`/`low_baseline` handling is supposed to suppress, so a low false-positive rate there is a headline result.
4. Sweep threshold 0.30–0.90 step 0.05; report precision, recall, F1, and false-positive rate on the confounder scenarios; pick the threshold that maximises F1 with FPR on confounders ≤ 5 % and write it back as the default `warning` band in `tokens`/UI (currently 65).
5. Emit `VALIDATION.md` with the table, chosen threshold, scorer version, and dataset hash.

Also wire `generate_geo_silence.py` to import `app.scoring` so the JSON fixture and the API can never drift.

Size: **M**

---

## Phase 8 — Malayalam localisation (civilian + field tiers)

### Files
- `src/i18n/index.tsx`: `I18nProvider`, `useT()`, `Lang = 'en' | 'ml'`, persisted in `localStorage('sahayam-lang')`, sets `document.documentElement.lang`.
- `src/i18n/en.ts`, `src/i18n/ml.ts`: `const en = { sos: { title: 'Emergency SOS', ... } } as const`; `ml` typed as `typeof en` so a missing key is a compile error.
- `AppShell.tsx`: language toggle next to the theme toggle (44 px target).
- `CivilianPages.tsx`, `FieldPages.tsx`, `HomePage.tsx`, `ui.tsx`: replace literals with `t('...')`. Command center stays English (operators) unless time permits.
- `tokens.css`: add `"Noto Sans Malayalam"` to `--font-sans` fallback list; bump line-height for `[lang="ml"]` (Malayalam glyphs are taller).
- `index.html`: preload the Malayalam font subset or rely on system fonts.

### Tests
- Render `/civilian/sos` inside `I18nProvider lang="ml"` → heading text equals `ml.sos.title`.
- Type-level: `ml` satisfies `typeof en` (compile-time only).

Size: **M**

---

## Recommended order

```
0 DTN relay plugin  ──► 1 SHA-256  ──► 2 README + MARKET.md      (demo-ready, honest, no Python)
                                    └─► 3 FastAPI + PostGIS ──► 4 API client + sync queue
                                    └─► 7 Scorer validation      (depends only on scoring.py from 3)
5 PWA  ──► 6 Camera QR  ──► 8 Malayalam                          (UX track; independent of backend)
```

Two people can run the backend track (3, 4, 7) and the UX track (5, 6, 8) in parallel after Phase 1.

---

## Definition of done (per phase)

- `npm run build && npm run lint && npm test` green; `cd backend && uv run pytest` green from Phase 3.
- No `console.error` in the happy path.
- README "real vs simulated" table updated in the same commit as the feature.
- One screenshot or short screen recording per user-visible change in the PR description.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Loading 1M CSV rows is slow on a laptop | Use `COPY … FROM STDIN` (psycopg `cursor.copy`), not row inserts; ~1M rows should take tens of seconds |
| Judges' phones can't reach the dev server | `--host` + same Wi-Fi; fall back to a laptop hotspot; Phase 0 works with zero cloud |
| Camera blocked on `http://` | `@vitejs/plugin-basic-ssl` in dev; accept the self-signed cert once per phone |
| Workbox refuses to precache the 970 kB chunk | Raise `maximumFileSizeToCacheInBytes`; longer term split MapLibre worker |
| `crypto.subtle` unavailable on insecure origins | Same fix as camera: serve over HTTPS; Node/jsdom tests unaffected |
| Scorer validation exposes weak recall | Report it honestly and use it to motivate the change-point / separate-confidence work in `sahayam-system-plan-revised.md` |
| Backend and JSON fixture drift | `generate_geo_silence.py` imports `app.scoring`; CI runs it and fails on diff |
