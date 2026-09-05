# Addendum — "Active vs. Passive" Motion Fingerprint (Human Proximity Confidence Score)

Companion to `ics-design-system-plan.md`. Plan-only; nothing implemented.

---

## 0. Executive summary — read this before scoping

Three findings that change the shape of the feature:

1. **The pitch as written is not buildable in a web app.** "Runs in a low-power background loop" and "a beacon signal is detected" both require native background execution and BLE *peripheral* mode. Browsers stop `DeviceMotionEvent` when the tab is backgrounded or the screen locks, and Web Bluetooth has no advertising/peripheral role at all. This forces a **Capacitor shell with two custom native plugins**. That is the single largest cost in this addendum and it must be decided before Phase 1 of the design-system plan is executed.

2. **iOS cannot beacon in the background the way the pitch assumes.** Apple documents that a backgrounded app's advertised service UUIDs are hashed into a proprietary "overflow area" and the local name is dropped entirely — the advertisement carries **no custom payload**, and it is discoverable only by another iOS device explicitly scanning for that exact UUID ([Apple: `startAdvertising(_:)`](https://developer.apple.com/documentation/corebluetooth/cbperipheralmanager/startadvertising(_:))). So the score cannot ride in the advertisement on iOS; the rescuer must **connect and read a GATT characteristic**. Android is unaffected.

3. **The dangerous direction of error is the opposite of the one the pitch optimises for.** The pitch targets false *positives* ("phantom survivor"). But a false "abandoned device" tag on the phone of an **unconscious, non-moving** casualty is a plausible failure mode with a fatal outcome. Design consequence: the flag must be **advisory-only** — it may annotate, it must never auto-sort a contact below unflagged contacts, and clearing a contact must require a two-person confirmation. This is a hard requirement, not a nicety.

A second technical issue worth surfacing early: **environmental vibration is a stronger confound than stillness.** An abandoned phone lying beside a running excavator or generator will show *high* accelerometer variance and score as "human present". Plain rolling variance — the algorithm as pitched — gets this exactly backwards. Section 3 handles it with spectral separation plus cross-device correlation.

---

## 1. Feasibility: what each platform actually permits

| Capability | Web (PWA) | Android (native) | iOS (native) |
| --- | --- | --- | --- |
| Continuous accelerometer while backgrounded | **No** — sensor events stop on tab background / screen lock | **Yes** — foreground service, type `dataSync`, persistent notification | **No by default** — `CMMotionManager` updates stop within seconds of backgrounding |
| Documented workaround | none | n/a | Keep a Core Location session alive (`allowsBackgroundLocationUpdates = true`); motion callbacks then persist. Apple engineering confirms the mechanism is "app is awake in the background", not location per se ([DevForums 841001](https://developer.apple.com/forums/thread/841001)) |
| Retrospective sensor history | No | Buffered via sensor FIFO batching | **`CMSensorRecorder`** — hardware-recorded accelerometer, retained ~3 days, fetched in ≤12h spans, up to ~3 min latency ([Apple docs](https://developer.apple.com/documentation/coremotion/cmsensorrecorder/accelerometerdata(from:to:))) |
| BLE advertise (peripheral) | **No** — Web Bluetooth is central-only | Yes, custom 31-byte payload, background-capable | Foreground: full payload. **Background: no local name, service UUIDs hashed into overflow area, no custom payload** |
| BLE scan (central) | Partial, user-gesture-gated, unusable for continuous search | Yes | Yes, incl. explicit-UUID scanning that matches overflow-area advertisements |

**Consequences:**

* **Android is the primary victim-side platform.** Full-fidelity beaconing and full-fidelity background sensing. Build and demo here first.
* **iOS victim-side is degraded and must be designed for explicitly.** Path: background app hosts a GATT service; rescuer scans explicitly for our service UUID, gets an overflow-area bit match, connects, and reads the score characteristic. Note the overflow bitmask is a 128-bit hash, so **unrelated apps collide onto the same bit** — expect false discovery candidates, resolved by attempting connection and failing the GATT handshake.
* **`CMSensorRecorder` is the iOS ace.** Even if our app was killed hours ago, on wake it can retrieve up to 3 days of hardware-recorded accelerometer history and compute the entire stillness timeline retroactively. For a "has this phone moved in 6 hours?" question, retrospective analysis is as good as real-time — and strictly more reliable, since it cannot drop samples.
* The rescuer-side app is **foreground, screen-on, in-hand** by definition, so it has no background restrictions. All the difficulty is victim-side.

**Recommended shell: Capacitor.** It preserves the entire React/Vite/Tailwind UI and token system from the main plan unchanged, and confines native work to two plugins. React Native would force a rewrite of every component and discard the CSS-custom-property token architecture. Flutter likewise. No off-the-shelf Capacitor plugin covers this: `@capacitor/motion` is a thin `DeviceMotionEvent` wrapper (foreground-only) and the community BLE plugins are central-only. **Both plugins are bespoke.**

---

## 2. Architecture

```text
VICTIM DEVICE (Capacitor app, backgrounded)
  ├── MotionSentinelPlugin (native)
  │     Android: ForegroundService + SensorManager (FIFO batching)
  │     iOS:     CMMotionManager + CoreLocation keepalive, CMSensorRecorder backfill
  │     └── ring buffer of WINDOW FEATURES (never raw samples) in SQLite
  ├── HpcsEngine (TypeScript, shared)
  │     features → state classification → Human Proximity Confidence Score
  └── DistressBeaconPlugin (native)
        Android: BLE advertisement, score in 31-byte manufacturer payload
        iOS:     GATT peripheral, score exposed as a readable characteristic

RESCUER DEVICE (same app, "Search Mode", foreground)
  ├── BLE scanner → contact list, RSSI-ranked
  ├── reads score from payload (Android peer) or GATT read (iOS peer)
  └── renders ContactCard with the confidence tag

ICS DASHBOARD
  └── contacts sync when connectivity allows; offline queue otherwise
```

Note how cleanly this reuses machinery already specified in the main plan: the **offline queue and sync-state language** (P1), the **data-freshness `<Timestamp>`** (P1), and the **confidence/uncertainty visual vocabulary** (P2) were all specified before this feature arrived and are exactly what it needs. The P2 confidence indicators should be promoted to **P1** if this feature ships.

---

## 3. The algorithm

### 3.1 Sampling

* **Rate:** 25 Hz. Sufficient for human postural motion (<10 Hz) and enough headroom to separate machinery bands. 100 Hz buys nothing here and costs battery.
* **Duty cycle:** 8 s of sampling every 60 s in `MONITOR` mode; continuous in `ALERT` mode (score below threshold, or an active search reported nearby).
* **Batching is what makes it "low power":** Android `SensorManager.registerListener(..., maxReportLatencyUs)` lets the sensor hub buffer in its own FIFO so the application processor stays asleep and wakes once per batch. Without batching this feature is a battery fire. iOS gets the equivalent for free via `CMSensorRecorder`'s hardware recording.
* **Budget target:** <2 %/hour additional drain. Must be measured, not assumed — it is a P0 acceptance criterion, because a feature that flattens a trapped victim's battery is net-negative for survival.

### 3.2 Per-window features (8 s @ 25 Hz = 200 samples)

| Feature | Purpose |
| --- | --- |
| `std(‖a‖)` | headline stillness measure |
| `p2p(‖a‖)` | catches single discrete events a variance average would wash out |
| `Δθ_gravity` | angular change of the gravity vector vs. previous window — **the most robust signal in the set**: any postural shift rotates the phone, and this survives even when amplitude is near the noise floor |
| `E[0.1–0.8 Hz]` | respiration band (only meaningful in torso contact — see 3.5) |
| `E[0.8–3 Hz]` | human postural / handling motion |
| `E[>5 Hz]` | machinery, vehicles, drills, generators |
| `spectral_flatness` | human motion is impulsive and broadband; machinery is narrowband and tonal. This is the discriminator that plain variance lacks |
| `temp` (if exposed) | MEMS bias drifts with temperature; needed to avoid reading thermal drift as motion |

Persist **features only**, never raw samples: one row per 8 s window is ~10 k rows/day — trivial storage, and it keeps a continuous multi-day history available even across app restarts.

### 3.3 Per-device noise-floor calibration

MEMS noise floors vary by an order of magnitude across handsets, so a fixed threshold will misclassify on some hardware. On first run — and on every re-entry to `MONITOR` — take the 5th percentile of `std(‖a‖)` over the first 10 minutes as `σ_floor` for that device. All stillness thresholds are expressed as multiples of `σ_floor`, not in absolute g. **Skipping this step is the most likely cause of a demo that works on one phone and fails on another.**

### 3.4 State classification

Rule-based with explicit thresholds — deliberately **not** machine learning. There is no labelled rubble dataset in existence, a model trained on gym-style HAR data would not transfer, and a rescue triage tag must be explainable to the incident commander who acts on it. Revisit only if real field data is ever collected.

```text
CARRY        E[0.8–3Hz] high AND spectral_flatness high        → human, moving
RESTING      std < 4σ_floor BUT Δθ_gravity events present      → human, still but shifting
STATIC       std < 2σ_floor AND Δθ_gravity ≈ 0                 → no human-attributable motion
VIBRATION    E[>5Hz] dominant AND flatness low AND Δθ ≈ 0      → environmental, NOT human
UNKNOWN      insufficient data / sensor unavailable
```

`VIBRATION` is the state the original pitch is missing, and it is the one that would have produced confident false "survivor detected" readings all over a live rescue site.

### 3.5 Honest limits of the respiration claim

The pitch states that breathing registers as detectable vibration. Calibrated position: **accelerometer respiration detection is documented in the literature but only with the phone in firm contact with the torso** (chest/abdomen, subject supine). A phone in a trouser pocket, in a bag, or wedged beside an immobile casualty will very likely have chest-coupled motion **below the MEMS noise floor**. Treat this as a hypothesis to validate on real hardware in a spike (Section 6), not as a shipped capability.

What the system *can* claim confidently is the discrimination the pitch actually needs: **"this device has experienced zero orientation change and zero above-noise-floor motion for N hours"** versus "this device has been handled or has shifted". That is a genuinely useful triage signal and it is defensible.

### 3.6 The score

`HPCS` ∈ [0, 100], decaying from the last human-attributable event (`CARRY` or `RESTING`), never from `VIBRATION`:

```text
HPCS = 100 · exp(−hours_since_human_event / τ),  τ = 3h
```

Reported bands, both in the UI and in the beacon payload:

| Band | HPCS | Tag |
| --- | --- | --- |
| Likely occupied | ≥ 60 | recent human-attributable motion |
| Uncertain | 20–59 | no human motion for several hours |
| Possibly abandoned | < 20 | none for >6 h (matches the pitch's threshold) |
| Indeterminate | — | sensor unavailable, or calibration incomplete |

**`Indeterminate` must be a first-class state, visually distinct from "abandoned".** A phone whose sensors were unreadable is not the same as a phone that has been proven still, and collapsing the two is precisely how a live casualty gets deprioritised.

### 3.7 Cross-device correlation (the environmental-vibration killer)

When a rescuer device and a victim device observe **the same vibration signature in the same time window**, that vibration is environmental. The rescuer app timestamps its own feature windows, and on contact compares them against the victim's recent history. Correlated energy is subtracted before scoring. Cheap to implement, and it removes the single largest false-liveness source on an active site with heavy machinery running. **Recommended, not essential** — but it is what separates a demo from a tool.

---

## 4. Beacon payload

Android advertisement, 31-byte limit — manufacturer-data field, 12 bytes used:

```text
[0]     protocol version
[1..4]  ephemeral device ID (rotating, see §5)
[5]     HPCS 0–100
[6..7]  minutes since last human event (uint16, saturating)
[8]     battery %
[9]     state enum (CARRY/RESTING/STATIC/VIBRATION/UNKNOWN)
[10]    flags (calibrated, sensor-fault, user-triggered-SOS)
[11]    CRC8
```

iOS background: this payload **cannot be advertised**. Same 12 bytes are exposed as a GATT characteristic; the rescuer connects to read them. Expect ~1–3 s extra per contact and plan the search UI around that latency.

**Range reality check:** BLE through rubble, concrete, and rebar is heavily attenuated — assume **metres, not tens of metres**, and highly anisotropic. This is a close-search aid for a team already working a specific void, not an area-survey tool. The UI must not imply otherwise; presenting RSSI as a distance in metres would be actively misleading, so show a coarse near/mid/far ring instead.

---

## 5. Privacy, consent, ethics

Continuous motion sensing plus a rotating BLE identifier is a person-tracking system. Non-negotiables:

* **Explicit opt-in** with plain-language explanation; off by default.
* **Incident-scoped and auto-expiring** — beaconing enables only in an active declared incident or on manual SOS, and disables automatically when the incident closes.
* **Rotating ephemeral IDs** (~15 min) so the beacon is not a persistent tracker; resolvable to an identity only by the incident's authorised responders.
* **Raw sensor data never leaves the device.** Only window features stay local; only the 12-byte summary is transmitted.
* **No location in the payload.** Position comes from the rescuer's own GPS at contact time.
* **Advisory-only enforcement, in code:** the "possibly abandoned" tag must not feed any auto-sort, auto-dismiss, or de-prioritisation path. Clearing a contact requires two-person confirmation and is written to the audit log.
* Android's foreground-service notification is **mandatory and non-dismissible** — the user always knows sensing is active. Treat as a feature.

Also note Android 14+ requires declaring a foreground service **type** and matching permission ([Android docs](https://developer.android.com/about/versions/14/changes/fgs-types-required)); `dataSync` is the correct type here. `health` would require `BODY_SENSORS`, which is subject to while-in-use restrictions and would break background operation — do not use it.

---

## 6. Phased implementation

Sequenced so the riskiest unknowns are answered before the expensive work starts.

### Phase M0 — Feasibility spike (P0, ~1 session) — **gate**
Bare Android app: 25 Hz sampling in a foreground service with FIFO batching; log features for 12 h across a set of physical scenarios (§7). Measure battery. **Then decide whether to proceed.** Answers: is `σ_floor` separation real on target hardware, is the respiration claim survivable, is the power budget met. Everything downstream is wasted if this fails.

### Phase M1 — Capacitor shell (P0)
Add Capacitor to the Vite app; verify the token system and UI render unchanged on-device (safe-area insets, 44px targets from the main plan matter more on real hardware than in the browser). No feature logic yet.

### Phase M2 — `MotionSentinelPlugin`, Android (P0)
Foreground service (`dataSync`), batched sampling, feature extraction, SQLite ring buffer, calibration routine, boot-restart handling, doze/battery-optimisation exemption request.

### Phase M3 — `HpcsEngine` in TypeScript (P0)
Pure functions, shared across platforms, **fully unit-testable off-device against recorded traces.** Keeping the scoring logic in TS rather than duplicating it in Kotlin and Swift is what makes this feature testable at all.

### Phase M4 — `DistressBeaconPlugin`, Android (P0)
Advertise the payload; rescuer-side scanner; Search Mode UI with the near/mid/far ring.

### Phase M5 — iOS support (P1)
`CMMotionManager` + CoreLocation keepalive; `CMSensorRecorder` backfill on launch; GATT peripheral with the score characteristic; explicit-UUID scanning on the rescuer side plus overflow-collision rejection. **Budget generously — this is the hardest phase and the one most likely to hit an undocumented platform behaviour.**

### Phase M6 — Dashboard integration (P1)
`ContactCard` and `ConfidenceTag` built from main-plan primitives; contacts flow through the existing offline queue; `<Timestamp>` shows both contact time and last-motion time.

### Phase M7 — Cross-device vibration correlation (P2)
Section 3.7.

### Phase M8 — Hardening (P1)
Sensor-fault handling, thermal drift, clock skew between devices, plugin crash recovery, degraded-mode behaviour when a sensor is missing entirely.

---

## 7. Testing

Field conditions cannot be reproduced, so **the trace-replay harness is the deliverable that makes this feature verifiable** — build it in M0, not later. The sensor interface is abstracted so recorded traces can be injected in place of live hardware; every scoring change then re-runs against the whole corpus in CI.

**Golden trace corpus** (record once on real devices, commit as fixtures):

| Trace | Expected |
| --- | --- |
| Phone on table, 12 h | `STATIC`, HPCS → <20 |
| Phone in pocket, person walking | `CARRY`, HPCS 100 |
| Phone in pocket, person seated still 3 h | `RESTING` — occasional `Δθ` events must keep score up |
| **Phone on chest, supine, deliberately motionless 1 h** | **the critical case — must NOT read `STATIC`** |
| Phone on table beside running machinery | `VIBRATION`, must **not** raise HPCS |
| Phone in bag on a moving vehicle | `VIBRATION`, must not read as human |
| Phone dropped, then untouched 8 h | high → decays to `possibly abandoned` |
| Phone under 30 cm of rubble beside a still person | discrimination probably marginal — **record the ground truth honestly** |

**Other verification:** battery drain over 12 h on 3+ handsets; BLE range through concrete/rubble mock-ups, documented as measured; overflow-area collision rate for the iOS path; permission-denial and sensor-absent paths; app-kill and device-reboot recovery; clock-skew tolerance between rescuer and victim; and an adversarial review of the false-"abandoned" path — deliberately attempt to get a live-casualty trace tagged as abandoned, and confirm the UI still surfaces it at full priority.

---

## 8. File-level change plan

All newly created. Additive to the main plan's table.

| Priority | File | Change | Reason | Risk |
| --- | --- | --- | --- | --- |
| P0 | `capacitor.config.ts` | Create | Native shell | Low |
| P0 | `android/` (Capacitor project) | Create | Android host | Medium |
| P0 | `plugins/motion-sentinel/` (TS API + Kotlin) | Create; foreground service, batching, features, SQLite | Core sensing | **High** — OEM battery-optimisation behaviour varies wildly; Xiaomi/Huawei/Samsung kill services aggressively |
| P0 | `src/features/hpcs/engine.ts` | Create; pure scoring functions | Shared, testable core | Medium — thresholds need real-data calibration |
| P0 | `src/features/hpcs/features.ts` | Create; window feature extraction | Signal processing | Medium |
| P0 | `src/features/hpcs/calibration.ts` | Create; per-device `σ_floor` | Cross-hardware correctness | Medium |
| P0 | `plugins/distress-beacon/` (TS API + Kotlin) | Create; BLE advertise + scan | Detection channel | **High** — Android BLE stack fragmentation |
| P0 | `tests/fixtures/traces/*.json` | Create; golden traces | Only way to test this | Low |
| P0 | `tests/hpcs.spec.ts` | Create; replay corpus | Regression safety | Low |
| P1 | `ios/` + Swift plugin halves | Create; CoreMotion, CMSensorRecorder, GATT peripheral | iOS support | **High** — background execution is fragile and partly undocumented |
| P1 | `src/features/hpcs/ConfidenceTag.tsx` | Create; uses main-plan uncertainty tokens | Consistent display | Low |
| P1 | `src/features/search/SearchMode.tsx` | Create; contact list, RSSI ring | Rescuer UI | Medium |
| P1 | `src/features/search/ContactCard.tsx` | Create | Contact display | Low |
| P1 | `src/features/hpcs/consent.ts` + consent UI | Create; opt-in, scope, expiry | Legal/ethical requirement | Medium |
| P2 | `src/features/hpcs/correlation.ts` | Create; cross-device vibration rejection | False-liveness rejection | Medium |
| P0 | `docs/hpcs-limitations.md` | Create; documented failure modes | **Operators must know what this cannot do** | Low |

---

## 9. Design-system impact

* Promote **confidence/uncertainty indicators** from P2 to **P1** — this feature is their primary consumer.
* Add a `confidence` token family (`--conf-high/medium/low/unknown`) **namespaced separately from both semantic status and categorical colors**. Reusing `--critical` for "possibly abandoned" would collide two meanings in exactly the way the main plan's Section 4 forbids.
* `ConfidenceTag` follows the same icon + text + color rule as `StatusBadge`; "possibly abandoned" must never be conveyed by hue alone.
* Search Mode is a **gloved, outdoor, one-handed, high-stress** surface: it is the strongest argument yet for the light/high-contrast themes and the 44px minimum target size, and its controls should sit in the bottom third of the screen.

---

## 10. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| **False "abandoned" on an unconscious casualty** | **Fatal** | Advisory-only, never auto-deprioritise; two-person dismissal; `Indeterminate` kept distinct; documented limits |
| Environmental vibration reads as human | High | Spectral flatness + `VIBRATION` state + cross-device correlation |
| iOS background beaconing carries no payload | High | GATT-read fallback; accept added latency; Android-first |
| OEM battery optimisation kills the service | High | Exemption request, boot receiver, watchdog, per-OEM guidance doc |
| Battery drain harms a trapped victim | High | Batching, duty cycling, measured <2 %/h gate in M0 |
| BLE range through rubble far shorter than hoped | High | Measure in M0; position as close-search aid; never display metres |
| Thresholds don't transfer across handsets | Medium | Per-device `σ_floor` calibration |
| No real training/validation data exists | Medium | Rule-based and explainable; no ML until field data exists |
| Native plugin work dwarfs the design-system work | Medium | M0 gate before committing; Android-first; iOS as a separate phase |
| Privacy/regulatory exposure | Medium | Opt-in, incident-scoped, rotating IDs, no raw data off-device |

---

## 11. Recommendation

Build it, with three conditions: **run the M0 spike before committing** to the Capacitor shell; **ship Android first** and treat iOS as a separately-budgeted phase; and **enforce advisory-only semantics in code**, not in policy documentation.

Also recommend softening the external pitch. "Solving the false-positive rescue problem using purely software heuristics" overstates what a rolling-variance heuristic can do, and the claim will not survive scrutiny from anyone who has run a collapsed-structure search. The defensible version is narrower and still compelling:

> *Uses the phone's own accelerometer to distinguish devices that have been handled or have shifted from devices that have been perfectly static for hours — giving searchers an additional prioritisation signal at zero hardware cost, as an advisory input that never overrides human judgement.*

---

**ADDENDUM READY — awaiting approval before implementation.**
