# Sahayam — Unified System Plan
### Intelligent Disaster Resilience & Digital Silence Anomaly Detection System
*Consolidating: original system brief · DESIGN.md · system-plan.md · motion-fingerprint-plan.md · SAHAYAM.md*

---

## 0. What this document does

Four source documents were written at different times, at different levels of rigor, and — importantly — they **disagree with each other** on scope and stack. This plan doesn't paper over that; it resolves it explicitly in §1.3, then gives one coherent spec, architecture, and phased build for everything downstream. Every hard finding your own documents already surfaced (the motion-flag failure mode, the iOS beaconing wall, the WiFi-Direct latency ceiling) is preserved verbatim in intent, not softened.

---

## 1. Problem, Scope, and the Stack Contradiction

### 1.1 The actual problem (from `SAHAYAM.md`'s Dark Zone Scorer narrative)

Every existing disaster coordination system — ICS, OCHA tools, state DEOC dashboards — is a **signal aggregator**: it shows commanders where people who *can* communicate are asking for help. It is structurally blind to **Area B**: the physically trapped, the elderly living alone, language-isolated migrant workers, and anyone in a tower-outage blackout zone. These are exactly the people least able to self-report and most likely to need urgent help — a correlation, not a coincidence.

Two real cases ground this, both already documented in your materials:
- **Wayanad, Kerala (30 Jul 2024):** Mundakkai — a Tamil migrant plantation settlement with no local network, no local-administration contacts, and destroyed towers — was invisible to every dashboard for ~6 hours while nearby Chooralmala (partial connectivity survived) correctly received the first response. The silence *was* the emergency; nothing read it as one.
- **Antakya, Turkey (6 Feb 2023):** entire apartment blocks went unsearched for 48–96 hours not because they weren't mapped, but because they produced zero distress signal.

**Reframe, stated precisely:** the deliverable is not a "detector." It is a **ranked, uncertainty-aware triage queue** that has to work under partial, systematically biased, and possibly zero signal. Every module below is judged against whether it improves that ranking.

### 1.2 What Sahayam actually consists of (merged scope across all four docs)

1. **Pre-disaster resilience passport** — ASHA-worker household registration + QR (SAHAYAM.md "Sahayam" description + original brief Module 1)
2. **DDD offline mesh** — Wi-Fi Direct store-and-forward DTN carrying alerts out of dead zones (SAHAYAM.md "DDD" section — this is a real cited architecture: *"A Mobile-First Disconnected Data Distribution Network"*, IEEE/Computer Society)
3. **Evacuation routing + relief-camp "Who's Where?" registry** — routing engine using hazard zones/elevation/road networks/camp capacity, online/SMS/offline-preloaded tri-mode guidance, QR check-in at camps (SAHAYAM.md "Sahayam" description — **this module did not exist in the original brief or the two engineering plans; it is new and needs its own build track**, see §3.5)
4. **Motion fingerprinting / Human Proximity Confidence Score (HPCS)** — distinguishes carried phones from abandoned ones (motion-fingerprint-plan.md, full spec retained)
5. **Silence Anomaly Detection / Dark Zone Scorer** — grid baseline, 15-min scoring loop, dispatcher heatmap, ML disambiguation (original brief Module 4 + SAHAYAM.md narrative)
6. **Incident Command Console** — the operator-facing UI, with a complete design system (DESIGN.md) and a production frontend architecture (system-plan.md)

### 1.3 The contradiction, resolved

| | Original brief | `system-plan.md` / `motion-fingerprint-plan.md` |
|---|---|---|
| Stack | Python/Streamlit, SQLite, Folium | React 18 + Vite + TypeScript, TanStack Query, MapLibre GL, **Capacitor + native Kotlin/Swift plugins** |
| Scope | Hackathon demo, days | Production system, phased over months, with its own feasibility-spike gate |
| Motion sensing | "low-power background loop… purely software heuristics" | **Proven impossible as a web app** — browsers kill `DeviceMotionEvent` when backgrounded; Web Bluetooth cannot advertise. Requires a native shell. |

These are not competing proposals to pick between — they're two different projects at two different maturity levels, and conflating them is the single most likely way this plan fails. **This document keeps them as two explicit tracks:**

- **Demo Track** (§4): what you can build and present in days, using the original brief's stack, honestly labeled as a simulation of the mesh/motion behavior rather than a claim that it's running on real hardware.
- **Production Track** (§5–§7): the real system, using the architecture `system-plan.md` and `motion-fingerprint-plan.md` already scoped in detail — including their own M0 feasibility gate, which **must run before any Capacitor/native work is committed to**.

Never present Demo Track output as if it were Production Track capability. The distinction is not pedantic — the original brief's own claim ("solving the false-positive rescue problem using purely software heuristics") is exactly the overclaim `motion-fingerprint-plan.md` flags in its own §11 and asks you to soften. Use its suggested honest framing:

> *"Uses the phone's own accelerometer to distinguish devices that have been handled or have shifted from devices that have been perfectly static for hours — giving searchers an additional prioritisation signal at zero hardware cost, as an advisory input that never overrides human judgement."*

---

## 2. System Architecture (Production Track, full picture)

```
┌──────────────────────────┐        ┌───────────────────────────┐
│  PRE-DISASTER LAYER       │        │   BASELINE LAYER           │
│  ASHA Registration UI     │──────▶ │  500m Grid + Pop Baseline   │
│  QR "Resilience Passport" │        │  (OSM footprints, WorldPop, │
│  households.db (encrypted)│        │   vulnerability weights)    │
└──────────────────────────┘        └────────────┬────────────────┘
                                                   │
┌──────────────────────────┐                      ▼
│  VICTIM DEVICE            │        ┌───────────────────────────┐
│  (Capacitor app,          │        │  INCIDENT COMMAND CONSOLE  │
│   backgrounded)           │        │  Silence Scorer (15-min)   │
│  ├─ ADU Encapsulation     │───┐    │  Priority Queue            │
│  ├─ MotionSentinelPlugin  │   │    │  ML Disambiguator          │
│  │   → HpcsEngine → HPCS  │   ├───▶│  Dispatcher Heatmap        │
│  └─ DistressBeaconPlugin  │   │    │  Wayanad Timeline Scrubber │
│      (BLE advertise)      │   │    │  Evacuation Route Panel    │
└──────────────────────────┘   │    │  Camp "Who's Where?" Feed  │
┌──────────────────────────┐   │    └───────────────────────────┘
│  TRANSPORT NODE            │  │
│  (volunteer/vehicle/drone) │◀─┘
│  ├─ Wi-Fi Direct discovery │
│  ├─ Custody-transfer store │
│  └─ Cloud gateway sync     │────────────────────────▶ Central Server
└──────────────────────────┘
```

Separation principle, unchanged from the original brief: everything on the client side is **agent/hardware layer**; everything in the Console is the **decision-support deliverable** that sits unchanged whether it's fed by a real DDD mesh or a simulation of one.

---

## 3. Module Specifications

### 3.1 Pre-Disaster: ASHA Registration & Resilience Passport
- Household intake: demographics, critical medical history, medications, emergency contacts.
- QR encodes a **household UUID pointer only, never raw medical data** — a lost or photographed QR must not leak PHI. This constraint is carried over unchanged from the earlier version of this plan and applies regardless of which track you're building.
- SQLite `households` table, `medical_json` / `medications_json` / `contacts_json` **encrypted at rest** (Fernet in the demo track; platform keystore in production).
- Design constraint: registration UX should mirror ASHA workers' *existing* reporting formats rather than introduce a new form — adoption is a workflow problem, not a technical one (this is worth treating as a P0 UX research task, not an afterthought).

### 3.1 Users: Registration, Vulnerability Profile & QR Generator

The Web App should contain a dedicated **Users** section for registering and managing individual users/household members. This module is the primary source for structured identity, vulnerability, medical, medication, and emergency-contact information used by the rest of Sahayam. The source plan already defines the resilience passport as an ASHA-worker registration flow and requires medical history, medications, emergency contacts, and a QR pointer rather than raw medical data inside the QR. fileciteturn0file0L27-L31 fileciteturn0file0L88-L92

#### User fields

| Field | Representation |
|---|---|
| Name | String |
| Age | Integer |
| Gender | Controlled enum |
| Blood Group | Controlled enum |
| Medical Conditions | Structured list / text |
| Medication | Structured records |
| Medication dosage | Per-medication dosage |
| Dosage schedule | Structured schedule |
| Disability | Structured list / text |
| Elderly | Quick flag |
| Pregnant | Quick flag |
| Infant | Quick flag |
| Bedridden | Quick flag |
| Emergency Contact Number | Phone number |

Medication should be stored as structured data rather than one free-text field:

```text
medication_name
dosage
unit
schedule
frequency
notes
```

Quick flags should be explicit attributes:

```text
is_elderly
is_pregnant
is_infant
is_bedridden
```

This allows vulnerability information to be consumed consistently by the baseline, triage, responder, and reporting layers without parsing free text.

#### QR Code Generator

Every user/household profile should expose a **Generate QR Code** action. The QR must contain only a non-guessable opaque identity reference or signed lookup token. It must never contain medical conditions, medication information, dosage schedules, disability information, emergency contacts, or other sensitive profile data.

```text
User Profile
    ↓
Generate QR
    ↓
Opaque User / Household ID
    ↓
Signed QR credential
    ↓
QR rendered in browser
    ↓
Print / save / share
    ↓
Authorized scan
    ↓
Protected profile lookup
```

The QR credential lifecycle should support:

```text
ACTIVE → REVOKED
       ↘
        REPLACED
```

QR generation, replacement, and revocation must be audited. The API, not the browser, should generate/sign credentials so that identity creation and credential lifecycle remain authoritative on the server.

Recommended entities:

```text
users
user_medical_conditions
user_medications
user_quick_flags
user_emergency_contacts
qr_credentials
qr_events
households
household_members
```

Recommended web routes:

```text
/users
/users/new
/users/:id
/users/:id/edit
/users/:id/qr
/households
/households/:id
```

Recommended API routes:

```text
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/{user_id}
PATCH  /api/v1/users/{user_id}

POST   /api/v1/users/{user_id}/qr
GET    /api/v1/users/{user_id}/qr
POST   /api/v1/users/{user_id}/qr/revoke
```

Sensitive fields should be encrypted at rest and protected by role-based authorization. The QR acts as a **pointer to protected data**, preserving the privacy constraint already present in the source architecture. fileciteturn0file0L88-L92

### 3.2 DDD Offline Mesh Protocol
Source: `SAHAYAM.md`'s DDD brief, citing *"A Mobile-First Disconnected Data Distribution Network"* (IEEE/Computer Society). Retained architecture, exactly as specified:

1. **Data Encapsulation (Client/Victim Node):** emergency payloads wrapped into encrypted, atomic **Application Data Units (ADUs)**, saved to local SQLite tagged `PENDING_SYNC`.
2. **Proximity Discovery (Wi-Fi Direct):** at 10–20m range, victim and transport nodes auto-discover and form a local socket connection — no cellular, no internet.
3. **Store-and-Forward Custody Transfer:** transport node pulls `PENDING_SYNC` ADUs into its own local store; the human/vehicle/drone physically carries the data out of the dead zone.
4. **Cloud Gateway Sync:** the instant a transport node detects internet/satellite coverage, it flushes accumulated bundles via HTTP/REST or gRPC to the central server.
5. **Security:** end-to-end encryption so the human/drone carrying an ADU cannot inspect it — a courier is not a reader.
6. **Framing point, correctly identified in your own materials:** this is **Delay-Tolerant Networking (DTN)** — the pitch to defend is *"delayed data delivery saves lives better than no data delivery,"* not "real-time messaging." Don't oversell latency.

**Critical unresolved risk (from the earlier version of this plan, still applies):** the entire value proposition depends on transport-node density and routing frequency relative to injury survival time. Crush syndrome kills in 4–6 hours; a sparse rural transport network may deliver an ADU technically successfully but too late to matter. **The demo must visualize the latency distribution, not just show "ADU delivered ✓."**

> **Current scope:** HPCS/native motion sensing is not part of the initial Web App implementation. Retain this section as a future ingestion source and extension point; the core scoring architecture must not depend on it.

### 3.3 Motion Fingerprinting / HPCS — Deferred Extension
Source: `motion-fingerprint-plan.md` in full — this is the most rigorously worked-out module in your materials and should be treated as authoritative over the original brief's simpler pitch.

**Three findings that gate everything else:**
1. **Not buildable as a web app.** Browsers stop `DeviceMotionEvent` on backgrounding/lock; Web Bluetooth has no peripheral/advertising role at all. Requires a **Capacitor shell with two bespoke native plugins** (`MotionSentinelPlugin`, `DistressBeaconPlugin`) — no off-the-shelf plugin covers this.
2. **iOS cannot beacon a custom payload in the background.** Apple hashes advertised service UUIDs into an overflow area with no local name and no custom payload when backgrounded. Workaround: the rescuer must **connect and read a GATT characteristic** instead of passively scanning. `CMSensorRecorder` partially compensates — it retrospectively retrieves up to 3 days of hardware-recorded accelerometer history even after the app was killed, so "has this moved in 6 hours?" can be answered on wake without continuous foreground execution.
3. **The dangerous failure direction is the opposite of the one the original pitch optimized for.** A false "abandoned device" tag on an *unconscious, non-moving* casualty is a plausible, fatal failure mode. **The flag must be advisory-only, code-enforced (not policy-enforced): it may annotate, it must never auto-sort a contact below unflagged contacts, and clearing a contact requires two-person confirmation.** This is a hard requirement, not a nicety — and it directly resolves the same contradiction flagged independently in the earlier revision of this plan (an unconscious trapped victim also produces zero motion for 6+ hours; the two flagship features must not cancel each other out).

**Additional confound not in the original pitch:** environmental vibration (a generator, an idling excavator) reads as *high* variance and would score as "human present" under plain rolling-variance — backwards from what's needed. Addressed via spectral separation (§3.3.2) and cross-device correlation (§3.3.4).

**3.3.1 Platform capability matrix**

| Capability | Web (PWA) | Android (native) | iOS (native) |
|---|---|---|---|
| Continuous accelerometer while backgrounded | No | Yes (foreground service, `dataSync` type) | No by default; requires CoreLocation keepalive workaround |
| Retrospective sensor history | No | Buffered FIFO | `CMSensorRecorder`, ~3 days, ≤12h fetch spans |
| BLE advertise (peripheral) | No | Yes, 31-byte payload | Foreground only; background = overflow-area hash, no payload |
| BLE scan (central) | Partial, gesture-gated | Yes | Yes, incl. overflow-hash matching |

Consequence: **Android is the primary victim-side platform; ship and demo there first.** iOS victim-side is a separately budgeted, harder phase (M5).

**3.3.2 Algorithm**
- Sampling: 25 Hz, 8s windows every 60s in `MONITOR` mode, continuous in `ALERT` mode. Battery batching via `SensorManager.registerListener(..., maxReportLatencyUs)` is what makes this "low power" — **<2%/hour drain is a P0 acceptance criterion**, not an aspiration, because a feature that flattens a trapped victim's battery is net-negative for survival.
- Per-window features: `std(‖a‖)`, `p2p(‖a‖)`, `Δθ_gravity` (angular gravity-vector change — the single most robust signal; survives even near the noise floor), energy in 0.1–0.8Hz (respiration band, torso-contact only), 0.8–3Hz (human handling), >5Hz (machinery), `spectral_flatness` (human motion is impulsive/broadband; machinery is narrowband/tonal — this is what plain variance lacks and gets backwards).
- **Per-device calibration is mandatory**: take the 5th percentile of `std(‖a‖)` over the first 10 minutes as `σ_floor`; express all thresholds as multiples of it. Skipping this is the most likely cause of a demo working on one phone and failing on another.
- State classification — rule-based, deliberately **not ML** (no labelled rubble dataset exists; a triage tag must be explainable to the commander acting on it):

  ```
  CARRY       high 0.8–3Hz energy AND high spectral flatness   → human, moving
  RESTING     std < 4σ_floor BUT Δθ events present             → human, still but shifting
  STATIC      std < 2σ_floor AND Δθ ≈ 0                        → no human-attributable motion
  VIBRATION   >5Hz dominant, low flatness, Δθ ≈ 0              → environmental, NOT human
  UNKNOWN     insufficient data / sensor unavailable
  ```

  `VIBRATION` is the state the original pitch was missing, and is exactly what would otherwise generate confident false "survivor detected" readings near running machinery on a live site.

- Respiration claim, stated honestly: documented in literature **only with firm torso contact**; a phone in a pocket or bag will likely sit below the noise floor. Treat as a hypothesis to validate in the M0 spike, not a shipped capability.
- Score: `HPCS = 100 · exp(−hours_since_human_event / τ), τ = 3h`, decaying only from `CARRY`/`RESTING`, **never from `VIBRATION`**.

  | Band | HPCS | Meaning |
  |---|---|---|
  | Likely occupied | ≥60 | recent human-attributable motion |
  | Uncertain | 20–59 | no human motion for several hours |
  | Possibly abandoned | <20 | none for >6h |
  | **Indeterminate** | — | sensor unavailable / uncalibrated — **first-class state, visually distinct from "abandoned"; collapsing the two is precisely how a live casualty gets deprioritised** |

**3.3.3 Beacon payload** — Android: 12-byte manufacturer-data field (version, rotating device ID, HPCS, minutes-since-event, battery%, state enum, flags, CRC8). iOS background: same 12 bytes exposed as a GATT characteristic, ~1–3s extra latency per contact.

**Range reality check:** BLE through rubble/concrete/rebar is heavily attenuated — assume metres, not tens of metres, highly anisotropic. **This is a close-search aid for a team already working a specific void, never an area-survey tool.** Never present RSSI as a distance in metres; show a coarse near/mid/far ring.

**3.3.4 Cross-device correlation** — when a rescuer and victim device observe the same vibration signature in the same window, it's environmental; subtract before scoring. Cheap, and it's what separates a demo from a field tool.

**3.3.5 Privacy/ethics (non-negotiable)** — explicit opt-in, off by default; incident-scoped, auto-expiring; rotating ephemeral IDs (~15 min); raw sensor data never leaves device, only window features + 12-byte summary; no location in payload; **advisory-only enforcement in code, not policy**; Android's foreground-service notification is mandatory and non-dismissible — treat as a feature, not friction. Android 14+ requires the `dataSync` foreground-service type specifically — `health` requires `BODY_SENSORS` and would break background operation.

**3.3.6 Testing — the trace-replay harness is the actual deliverable that makes this feature verifiable**, built in M0, not later:

| Trace | Expected |
|---|---|
| Phone on table, 12h | `STATIC`, HPCS <20 |
| Phone in pocket, walking | `CARRY`, HPCS 100 |
| Phone in pocket, seated still 3h | `RESTING` — occasional Δθ keeps score up |
| **Phone on chest, supine, motionless 1h** | **critical case — must NOT read `STATIC`** |
| Phone on table beside running machinery | `VIBRATION`, must not raise HPCS |
| Phone in bag, moving vehicle | `VIBRATION`, must not read as human |
| Phone dropped, untouched 8h | decays to "possibly abandoned" |
| Phone under rubble beside a still person | marginal — **record the ground truth honestly** |

Plus: battery drain over 12h on 3+ handsets; BLE range through rubble mock-ups (measured, documented); overflow-area collision rate (iOS); permission-denial/sensor-absent paths; app-kill/reboot recovery; clock-skew tolerance; and an **adversarial test that deliberately tries to get a live-casualty trace tagged as abandoned**, confirming the UI still surfaces it at full priority.

### 3.4 Silence Anomaly Detection / Dark Zone Scorer
Source: original brief Module 4, grounded by `SAHAYAM.md`'s case studies (§1.1).

- **Pre-disaster baseline:** 500m grid over the target region (Shapely fishnet), populated from OSM building footprints, WorldPop density (100m resolution, freely available for India), and manually-assigned vulnerability weights (elderly care homes ×1.8, migrant hostels ×1.6, concrete apartment blocks ×1.3 — from `SAHAYAM.md`'s own numbers). **This baseline, not the scoring loop, is the hard part** — the populations most vulnerable to being "Area B" are exactly the ones least likely to have clean pre-disaster census data (informal settlements, undocumented migrant workers).
- **Silence Scorer:** 15-minute backend loop based on **expected-vs-actual signals**, rather than population-minus-reports alone. For each spatial cell and scoring window, first compute an expected signal profile and an actual signal profile. For each signal dimension `k`, calculate `coverage_k = actual_k / expected_k` and `deficit_k = max(0, 1 - coverage_k)`. The initial **BaseScore** is the weighted normalized deficit across all signal types for which a valid baseline exists: `BaseScore = Σ(w_k × deficit_k) / Σw_k`.
- The scorer then calculates **baseline confidence** and **data freshness** separately, followed by bounded temporal escalation and transparent context modifiers. The resulting record must preserve `expected`, `actual`, `deficit`, `weights`, `BaseScore`, confidence, freshness, factors, and final score so every ranking is explainable and reproducible.
- Physical verification/clearance remains the mechanism that retires an operational alert; scoring should not silently infer clearance from absence of data.
- **Dispatcher Heatmap:** Leaflet/Folium (demo) or MapLibre GL (production) choropleth over the grid, ranked priority sidebar showing population estimate, vulnerability profile, time-since-last-report, silence score, and a plain-language interpretation understandable by a non-technical coordinator.
- **ML Disambiguation:** logistic regression or gradient-boosted tree distinguishing "nobody there" (pre-disaster evacuation, empty industrial zone, known tower outage) from "people there but silent," trained on features like building type, time-of-day, tower status, historical mobility. **Legitimately trainable on synthetic data for a demo; in production this should be an actively-recalibrated prior**, using the first real confirmed clearances as labels, not a finished model — there is no real ground-truth training set at this fidelity, full stop.
- **Institutional framing worth keeping in the pitch, from `SAHAYAM.md`:** agencies are structurally incentivized toward reactive, report-based dispatch because a wrong response to a real report is forgivable, while diverting resources to an unreported zone based on a model and finding it empty is harder to defend. Counter this by making the score **transparent and auditable**, not a black box: *"this zone had 340 registered residents, 0 reports in 9 hours, 60% multi-storey concrete, and its tower went offline at 2:17 AM — silence score: 94/100."*

### 3.5 Evacuation Routing & Relief-Camp Registry — *new module, needs its own design pass*
Source: `SAHAYAM.md`'s "Sahayam" description only — **this is not covered by either engineering plan and has essentially zero design detail yet.** Flagging explicitly rather than inventing detail that wasn't in your source material:

- A routing engine recommending safer relief camps based on hazard zones, elevation, road networks, and live camp capacity — **explicitly not nearest-camp routing**, since the nearest camp may be past a hazard or already full.
- Tri-mode guidance for degraded connectivity: full online routing, SMS-based turn instructions, and fully offline navigation on preloaded maps/data.
- At camps, volunteers scan the household QR to instantly pull the resilience-passport data (medical history, medications) without manual re-entry.
- Check-ins sync via the same store-and-forward pattern as §3.2, building a real-time **"Who's Where?"** registry for responders and separated families.
- **Open questions this plan cannot resolve for you:** what "hazard zone" data source feeds the router pre-disaster vs. updates live during one; how camp capacity is reported and kept current without becoming its own Area-B problem; how the offline preloaded-map mode is kept in sync with live road-closure data. Treat this as its own Phase-0 design spike before committing to an architecture.

### 3.6 Incident Command Console — Design System & Frontend Architecture
Source: `DESIGN.md` (visual spec) + `system-plan.md` (audit, tokens, implementation plan) — these two documents are already internally consistent and well worked-out; summarized here rather than fully reproduced.

**Visual direction:** calm, operational, high-contrast, restrained saturation, dark mode primary / light mode for field/outdoor use. Semantic color is fixed and never reused for a second meaning (`safe`=green, `watch`=amber, `warning`=orange, `critical`=red, `info`=blue, `accent`=sky) and is **structurally separate from the categorical palette** used for team/agency/resource identity — this separation is enforced by lint, not convention, because "Team Green rendered in `--safe` green" is flagged as the single most damaging likely failure mode in `system-plan.md`'s own audit.

**Production stack** (repo is currently empty — confirmed by `system-plan.md`'s own `git log`/`git ls-remote` audit): React 18 + Vite + TypeScript (strict), Tailwind v4 driven entirely by CSS custom properties (default palette/spacing scales disabled so nothing can bypass tokens), Radix UI primitives for free keyboard/focus/ARIA semantics, React Router v6 data routers, TanStack Query for server state and the connectivity/freshness indicators this system depends on, Zustand for UI-only state, MapLibre GL (open, offline-capable, no license key), Visx/Recharts for token-driven charts, Lucide icons, Vitest + Playwright + axe-core for testing.

**Non-negotiable design constraints, carried forward exactly:**
- Color is never the only channel — every status renders as icon + text + color as an indivisible unit (~1 in 12 men has a CVD; direct-sunlight legibility depends on this too).
- The supplied dark palette is tuned for a command-center screen and is **actively unsafe for a field responder's phone outdoors** — a light/high-contrast theme is P0, not a stretch goal, and it is specifically the *field* theme.
- 44px minimum touch targets; mobile increases minimum type size and target size rather than shrinking to fit more data — "for emergency operations, readability is more valuable than maximum information density."
- Motion is capped at 350ms and is informational only; `prefers-reduced-motion` disables all non-essential animation, because animated transitions on incident-status changes delay information and can trigger vestibular symptoms under stress.
- `ConnectionStatus`/sync-state/data-freshness (`<Timestamp>`) components are P1 in the base plan but should be **promoted to P0** given this system's entire premise is operating on degraded, delayed, and partially-stale data — an operator must never mistake stale local data for confirmed shared state.

**Phased build** (Phases 1–7, detailed in §6): tokens and lint rules land *before* the first feature component, because the one project-ending mistake identified in `system-plan.md`'s own audit is feature-first ordering, which turns the design system into an expensive refactor instead of a foundation.

---

## 4. Demo Track — buildable in days

This is the original brief's scope, explicitly re-labeled as a simulation and stripped of the overclaim flagged in §1.3.

- **Stack:** Python, Streamlit, SQLite, Folium/GeoPandas/Shapely, `cryptography.fernet`, `qrcode`, scikit-learn.
- **Modules 1, 4** (registration/QR, silence scorer + heatmap) build essentially as originally specified — nothing here required native hardware.
- **Modules 2, 3** (DDD mesh, motion fingerprinting) are **agent-based simulations**: synthetic victim/transport agents moving on a 2D map, synthetic accelerometer traces (two classes: carried vs. stationary), simulated custody transfer and latency logging. State this explicitly in the demo UI — do not let a judge mistake a Streamlit simulation for a working native mesh.
- **Demo moment:** replay the Wayanad timeline (clearly labeled `SOURCE: SYNTHETIC/ILLUSTRATIVE` — do not present fabricated timestamps as real casualty records) and show the score-vs-physical-discovery-time gap as a visualized number, not an assertion.
- **Phases:** (1) core data + map, (2) silence scorer, (3) agent simulation + latency distribution chart, (4) ML + demo timeline, (5) hardening — explicit synthetic-data labeling everywhere, advisory-only framing for the motion flag in the UI copy itself, not just in a doc nobody reads during the demo.

---

## 5. Production Track — Phased Roadmap (merged)

This merges `system-plan.md`'s Phases 1–7 (frontend/design-system) with `motion-fingerprint-plan.md`'s Phases M0–M8 (native motion/mesh), run as parallel tracks that converge at the dashboard.

**Frontend/Console track:**
1. **Foundation (P0)** — Vite scaffold, directory structure, Tailwind `@theme` restricted to tokens, ESLint bans on hex literals/arbitrary values/raw controls, viewport meta + safe-area insets, Storybook as visual-review surface. *Exit criterion: a hex literal in a component fails lint.*
2. **Semantic Design Tokens (P0)** — `tokens.css` (dark, verbatim from spec) + derived status triplets, `themes.css` light theme with **re-derived, contrast-verified** status hues (the given palette fails AA on white and must not be reused as-is), `categorical.ts` (12-color, CVD-checked, lint-separated from semantic tokens), `status.ts` single source of truth.
3. **Typography & Spacing (P0)** — self-hosted Inter + JetBrains Mono (no CDN — a command center may be air-gapped), type scale, tabular-nums for all counts/coordinates/timestamps, 4px spacing rhythm, motion tokens.
4. **Responsive/Mobile (P0)** — 320px floor, mobile-first fluid type (16px mobile body, *not* shrinking on mobile), tables→stacked cards below `md`, map as full-bleed + bottom sheet, dialogs→full-height sheets on mobile, bottom tab nav.
5. **Accessibility (P0)** — global focus-visible ring, 44px targets everywhere, color-never-alone enforcement in `StatusBadge`, reduced-motion global override, Radix keyboard semantics, live regions for incoming incidents.
6. **Component Migration (P0/P1)** — Tier 1 primitives → Tier 2 composed (`IncidentCard`, `ConnectionStatus`, `FreshnessDot`, `MapLegend`) → feature screens assembled only from those, never ad hoc.
7. **Validation (P0)** — full checklist in §8.

**Current Web-first track:**
- **W0 — Foundation.** React/Vite/TypeScript project, design tokens, API client, authentication, IndexedDB, PWA shell, CI, and shared schemas.
- **W1 — Users.** User registration, structured medical/medication data, quick flags, emergency contact, household relationships, and QR generation/revocation.
- **W2 — Data & Signals.** Baseline ingestion, expected-signal generation, actual-signal ingestion, normalization, aggregation, and deterministic replay.
- **W3 — Silence Scorer.** Expected-vs-actual comparison, BaseScore, confidence, freshness, temporal factors, context modifiers, score history, and explanation.
- **W4 — Command Console.** MapLibre map, ranked areas, score details, signal freshness, incident timeline, and audit trail.
- **W5 — Evacuation & Camps.** Routing, camp registry, capacity, check-in, and offline-capable field workflows.
- **W6 — Hardening.** Security, accessibility, offline recovery, load testing, observability, and replay-based validation.
- **M1 — Capacitor shell (P0).** Verify the token system/UI render unchanged on-device; no feature logic yet.
- **M2 — `MotionSentinelPlugin`, Android (P0).** Foreground service, batched sampling, feature extraction, SQLite ring buffer, calibration, boot-restart handling, battery-optimization exemption.
- **M3 — `HpcsEngine` in TypeScript (P0).** Pure, shared, fully unit-testable off-device against recorded traces — this is what makes the scoring logic testable at all, instead of duplicating untestable logic in Kotlin and Swift separately.
- **M4 — `DistressBeaconPlugin`, Android (P0).** Advertise payload, rescuer scanner, Search Mode UI with near/mid/far ring.
- **M5 — iOS support (P1).** CoreMotion + CoreLocation keepalive, `CMSensorRecorder` backfill, GATT peripheral, overflow-collision rejection. **Budget generously — hardest phase, most likely to hit undocumented platform behavior.**
- **M6 — Dashboard integration (P1).** `ContactCard`/`ConfidenceTag` from Console primitives; contacts flow through the offline sync queue; `<Timestamp>` shows both contact time and last-motion time.
- **M7 — Cross-device correlation (P2).**
- **M8 — Hardening (P1).** Sensor faults, thermal drift, clock skew, plugin crash recovery, graceful degradation with sensor missing.

**DDD mesh and evacuation-routing tracks** are not yet specified to this depth in your source materials (see the open questions in §3.5) — recommend a dedicated design pass for each before assigning phase numbers, rather than forcing them into this numbering prematurely.

---

## 6. File-Level Change Plan (frontend, from `system-plan.md`, condensed)

Repo is currently empty, so every row below is a creation, not a modification.

| Priority | Path | Risk |
|---|---|---|
| P0 | `src/styles/tokens.css` | **High** — every other file depends on it; naming must be settled before Phase 6 |
| P0 | `src/styles/themes.css` | Medium — light-theme status hues must be contrast-*verified*, not eyeballed |
| P0 | `src/design/{tokens.ts, status.ts, categorical.ts}` | Medium — categorical palette must be CVD-checked and hue-separated from semantics |
| P0 | `.eslintrc` (no-hex, no-arbitrary-values, no-raw-controls) | Low — but this is what makes the whole system mechanically enforced rather than aspirational |
| P0 | `src/ui/*` (~24 primitives) | Medium — API churn if built after features |
| P1 | `src/design/mapStyle.ts` (MapLibre style generated from tokens) | Medium — restyling later is expensive |
| P1 | `src/components/ConnectionStatus.tsx`, `src/ui/Timestamp.tsx` | Low, but functionally P0-critical given §3.6 |
| P0 | `.github/workflows/ci.yml` (lint, typecheck, test, contrast, axe) | Low |

(Native-side file plan is in `motion-fingerprint-plan.md` §8 — `plugins/motion-sentinel/`, `plugins/distress-beacon/`, `src/features/hpcs/*`, `tests/fixtures/traces/*.json` — retained as specified there.)

---

## 7. Consolidated Risk Register

| Risk | Severity | Where it comes from | Mitigation |
|---|---|---|---|
| False "abandoned" tag on unconscious casualty | **Fatal** | §3.3, independently confirmed twice in your own source material | Advisory-only, code-enforced; two-person dismissal; `Indeterminate` kept distinct |
| WiFi-Direct latency exceeds survival window in sparse rural terrain | High | §3.2 | Measure and visualize latency distribution; don't hide behind "delivered ✓" |
| No defensible pre-disaster population baseline for exactly the most vulnerable populations | High | §3.4 | Treat baseline sourcing as harder than the scoring loop; budget accordingly |
| iOS can't beacon a payload in background | High | §3.3.1 | GATT-read fallback; Android-first; iOS separately budgeted (M5) |
| Environmental vibration reads as "human present" | High | §3.3 | `VIBRATION` state + spectral flatness + cross-device correlation |
| OEM battery optimization kills the foreground service | High | motion-fingerprint-plan.md §10 | Exemption request, boot receiver, watchdog, per-OEM guidance doc |
| Evacuation/routing/camp module has near-zero design detail | Medium | §3.5 | Dedicated design spike before assigning build phases |
| Semantic/categorical color collision (e.g. "Team Green" read as "status: safe") | High | DESIGN.md / system-plan.md's own audit | Two disjoint palettes, separate namespaces, lint-enforced |
| Feature screens built before design tokens exist | High | system-plan.md's own audit | Phases 1–3 gate all feature work, no exceptions |
| Dark palette unsafe in direct sunlight for field responders | High | DESIGN.md / system-plan.md | Light/high-contrast theme is P0, is the *field* theme, not a P2 nicety |
| No real training data for the silence-disambiguation classifier | Medium | §3.4 | Rule-based + synthetic for demo; active recalibration on real clearances in production, not a finished model |
| ASHA registration adds to workers' existing burden and gets skipped | Medium | §3.1 | Design UX around existing reporting formats, not a new form |
| Household QR leaks medical data if lost/photographed | Medium | §3.1 | QR is a UUID pointer only, never a payload |

---

## 8. Validation Checklist (frontend, from `system-plan.md`)

- **Desktop:** all primitives render correctly at 1440/1920px, both themes; Storybook shows every status × variant with no fallback color; no layout shift on live updates (tabular numerals verified).
- **Mobile:** real-device/emulator check at 375×667 and 390×844; every interactive element ≥44×44px (Playwright bounding-box assertion); safe-area insets applied; map bottom sheet usable one-handed; tables render as cards below `md`.
- **Narrow viewport:** no horizontal overflow at 320px on any route; no text below 13px below `md`; dialogs fully reachable/dismissible at 320×568.
- **Theme:** every token defined in all themes; no component reads a raw hex (lint-enforced); no flash on switch; `system` preference respected and persisted.
- **Contrast:** `check-contrast.ts` passes ≥4.5:1 normal text, ≥3:1 large text/UI graphics in **all** themes, including map symbols/chart strokes against real backdrops (including over satellite imagery).
- **Color-blindness:** deuteranopia/protanopia/tritanopia simulation of the status set — distinguishable by icon/label alone; grayscale screenshot test still readable.
- **Reduced motion:** Playwright with `reducedMotion: 'reduce'` — no animation exceeds 1ms, no pulses, no auto-scroll.
- **Component consistency:** zero hex/rgb literals outside `src/styles/**`; zero arbitrary Tailwind values; zero raw `<button>`/`<input>` outside `src/ui/**`; no `--cat-*` token in a status context or vice versa.
- **Regression:** Storybook snapshots across theme × viewport matrix gating CI; `axe-core` clean on every route/theme; keyboard-only walkthrough with no trap; CI runs lint/typecheck/unit/contrast/a11y on every PR.

(Motion-module testing checklist is §3.3.6 above, kept separate because it requires physical devices and cannot run in CI.)

---

## 9. What's genuinely new vs. what's already well-specified

To be direct about where effort is actually needed next:

- **Already rigorously specified, ready to build from as-is:** design system (DESIGN.md + system-plan.md Phases 1–3, 5), motion fingerprinting (motion-fingerprint-plan.md in full — this is the most mature document you have).
- **Specified but with an open, unresolved risk that needs a decision, not more writing:** DDD mesh latency-vs-survival-time tradeoff (§3.2); silence-scorer population baseline sourcing (§3.4).
- **Named but essentially undesigned:** evacuation routing + relief-camp registry (§3.5) — this needs its own spike before it can be phased.
- **Needs an explicit choice, not a merge:** which track (§4 demo vs §5 production) you're actually resourcing for the next milestone, since they imply different teams, timelines, and — critically — different claims you're allowed to make in front of a judge or a real incident commander.

---

# 10. Web-first Implementation Boundary

For the current milestone, Sahayam should be implemented as a complete **Web App + Backend** system. The primary deliverable is a working end-to-end flow from registration and QR generation through baseline creation, signal ingestion, silence scoring, and responder triage.

```text
React / TypeScript PWA
        │
        ├── Users + QR
        ├── Incident Console
        ├── Area Ranking
        ├── Map / Routes / Camps
        └── Offline Queue
                │
                ▼
             FastAPI
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
 PostgreSQL   Redis   Background Jobs
 + PostGIS
       │
       ▼
 Signal Aggregation
       │
       ▼
 Expected Signal Engine
       │
       ▼
 Deterministic Silence Scorer
       │
       ▼
 Triage / Audit
```

Kotlin, Swift, Capacitor, BLE, Wi-Fi Direct, and native background sensing are **not required for the current milestone**. They should only be added later as producers of normalized signal observations or transport data behind stable APIs.
