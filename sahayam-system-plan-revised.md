# Sahayam — Unified Production System Plan
## Intelligent Disaster Resilience, Offline Coordination & Signal-Anomaly Triage

> This plan consolidates the existing Sahayam architecture into one implementation-oriented production design. It focuses on **technology stack, data flow, service boundaries, signal processing, synchronization, and operational architecture**. Case studies and example scenarios are intentionally excluded.

---

# 1. System Objective

Sahayam is a disaster-resilience platform designed to maintain useful situational awareness when conventional communication is degraded or absent.

The system has four primary responsibilities:

1. **Maintain a pre-disaster digital resilience layer** containing household, vulnerability, and evacuation information.
2. **Collect and transport signals through intermittent connectivity** using connected devices, offline storage, and store-and-forward transport.
3. **Detect anomalous silence at area level** by comparing what signals are expected from an area against what is actually observed.
4. **Provide an uncertainty-aware command interface** that helps responders prioritize investigation without treating algorithmic output as ground truth.

The production architecture is therefore built around a central principle:

> **Sahayam does not attempt to prove that a person is present or absent. It estimates where the observed signal state is significantly different from the expected signal state and ranks those areas for human investigation.**

---

# 2. Recommended Technology Stack

## 2.1 Frontend / Command Console

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React 18 | Command-console application |
| Language | TypeScript (strict) | Type safety across the frontend |
| Build | Vite | Fast development/build pipeline |
| Styling | Tailwind CSS v4 | Token-driven styling |
| Component primitives | Radix UI | Accessible interaction primitives |
| Routing | React Router v6 Data Router | Application navigation and route data loading |
| Server state | TanStack Query | API state, caching, stale-data handling and synchronization |
| UI state | Zustand | Local UI state only |
| Map | MapLibre GL | Interactive geospatial visualization and offline-capable map rendering |
| Charts | Visx / Recharts | Signal, trend and operational charts |
| Icons | Lucide | Consistent operational iconography |
| Testing | Vitest + Playwright + axe-core | Unit, browser and accessibility testing |

The frontend should communicate exclusively with backend APIs and should never implement disaster scoring, authoritative synchronization, or persistence rules itself.

---

## 2.2 Web / Field Application

The current implementation should be **web-first**. The immediate goal is a responsive, mobile-accessible Progressive Web App that provides the operational workflows and decision-support layer without requiring Kotlin, Swift, Capacitor, BLE, or Wi-Fi Direct.

| Layer | Technology | Purpose |
|---|---|---|
| Application | React + TypeScript | Shared command and field application |
| Build | Vite | Development and production build |
| Styling | Tailwind CSS v4 | Token-driven responsive styling |
| Components | Radix UI | Accessible interaction primitives |
| Routing | React Router | Application navigation |
| Server state | TanStack Query | API state, caching and freshness |
| UI state | Zustand | Local interface state |
| Local persistence | IndexedDB | Offline-first browser storage |
| Offline support | Service Worker / PWA | Cached shell and degraded operation |
| Maps | MapLibre GL | Geospatial visualization |
| Networking | REST + optional WebSocket/SSE | API and live incident updates |

The browser application must explicitly distinguish:
- **local/offline data**
- **queued changes**
- **server-confirmed data**
- **stale data**

The web implementation should not claim continuous background sensor collection or peer-to-peer transport capabilities that browsers cannot reliably provide.

The architecture should nevertheless keep device-signal ingestion behind backend APIs so that native collection can be introduced later without changing the scoring and command-console layers.

---

## 2.3 Backend

Use a service-oriented backend, but keep the initial deployment as a **modular monolith** where possible. The logical boundaries should be explicit even if several services initially share one deployment.

| Layer | Technology | Purpose |
|---|---|---|
| API | FastAPI | REST APIs and operational endpoints |
| Internal service communication | gRPC where justified | Low-latency internal service calls |
| Primary database | PostgreSQL | Authoritative relational data |
| Geospatial extension | PostGIS | Grids, zones, buildings, routes, camps and spatial queries |
| Time-series storage | TimescaleDB extension or PostgreSQL partitioned tables | Sensor aggregates, signal observations and scoring history |
| Cache | Redis | Short-lived operational state, rate limiting, locks and hot data |
| Object storage | S3-compatible storage / Cloudflare R2 | Large files, exported traces and map assets |
| Background jobs | Celery / Dramatiq | Periodic scoring, ingestion and asynchronous processing |
| Message/event bus | NATS or Kafka | Durable event propagation as system scale increases |
| Validation | Pydantic | API and internal data contracts |
| ML | scikit-learn initially | Disambiguation and recalibration models |
| ML model registry | Versioned database/object-store metadata | Reproducible model deployment |
| Observability | OpenTelemetry | Distributed tracing and telemetry |
| Metrics | Prometheus | Service and pipeline metrics |
| Logs | Structured JSON logs | Centralized incident debugging |

For the first production implementation, **FastAPI + PostgreSQL/PostGIS + Redis + a background worker system** is sufficient. A dedicated Kafka deployment should only be introduced when event volume or multi-service fan-out actually requires it.

---

## 2.4 Data and Geospatial Sources

The baseline engine should operate on versioned datasets rather than querying external data directly inside the scoring loop.

Primary data categories:

- OpenStreetMap building and road data
- Population-density datasets
- Administrative boundaries
- Hazard-zone datasets
- Elevation/terrain datasets
- Registered household and vulnerability data
- Connectivity/tower availability data
- Road and route status
- Relief-camp locations and capacity
- Historical observation and clearance records

External datasets should first pass through an **ingestion and normalization pipeline**, receive a dataset version, and then become immutable inputs to the baseline.

---

# 3. High-Level Architecture

```text
                         ┌───────────────────────────────┐
                         │        PRE-DISASTER DATA      │
                         │ households / buildings        │
                         │ population / vulnerability    │
                         │ roads / hazards / camps       │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │      BASELINE ENGINE          │
                         │ expected population           │
                         │ expected signal profile       │
                         │ spatial features              │
                         │ baseline confidence           │
                         └───────────────┬───────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
                 ▼                       ▼                       ▼
        ┌────────────────┐     ┌─────────────────┐     ┌────────────────┐
        │ Household /    │     │ Mobile Devices  │     │ External /     │
        │ ASHA Layer     │     │ motion / beacon │     │ Infrastructure │
        │ QR + registry  │     │ observations    │     │ signals        │
        └───────┬────────┘     └────────┬────────┘     └───────┬────────┘
                │                       │                      │
                └───────────────────────┼──────────────────────┘
                                        ▼
                         ┌───────────────────────────────┐
                         │       LOCAL INGESTION         │
                         │ validation / timestamping     │
                         │ deduplication / encryption    │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │       OFFLINE TRANSPORT       │
                         │ local queue                    │
                         │ Wi-Fi Direct custody transfer  │
                         │ BLE close-range discovery      │
                         └───────────────┬───────────────┘
                                         │
                                  connectivity
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │        CENTRAL INGESTION      │
                         │ API gateway / event bus        │
                         │ verification / dedupe          │
                         └───────────────┬───────────────┘
                                         │
                 ┌───────────────────────┼──────────────────────┐
                 │                       │                      │
                 ▼                       ▼                      ▼
        ┌────────────────┐     ┌─────────────────┐     ┌────────────────┐
        │ Signal Store   │     │ HPCS / Motion   │     │ Household /    │
        │ observations  │     │ Processing      │     │ Evacuation     │
        └───────┬────────┘     └────────┬────────┘     └───────┬────────┘
                │                       │                      │
                └───────────────────────┼──────────────────────┘
                                        ▼
                         ┌───────────────────────────────┐
                         │     SILENCE SCORING ENGINE    │
                         │ expected signals             │
                         │ actual signals               │
                         │ base score                    │
                         │ uncertainty & modifiers       │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │     TRIAGE / PRIORITIZATION   │
                         │ ranked areas                  │
                         │ confidence                    │
                         │ freshness                     │
                         │ explanation                   │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │     INCIDENT COMMAND CONSOLE  │
                         │ map / queue / timeline        │
                         │ contacts / routing / camps    │
                         │ data freshness / audit trail  │
                         └───────────────────────────────┘
```

---

# 4. Core System Flow

## 4.1 Pre-Disaster Data Preparation

Before an incident, Sahayam builds a versioned geographic and population baseline.

### Flow

```text
Source datasets
      ↓
Ingestion
      ↓
Validation
      ↓
Normalization
      ↓
Spatial alignment
      ↓
Feature generation
      ↓
Baseline version
      ↓
PostgreSQL/PostGIS
```

The baseline engine should produce a record for each scoring cell containing:

- estimated population
- expected occupied structures
- vulnerability weighting
- building composition
- normal activity profile
- expected signal sources
- expected report frequency
- expected connectivity state
- baseline confidence
- source dataset versions

A baseline must be versioned. Re-running the incident later should use the same baseline version unless an explicit recalculation is performed.

---

# 5. Signal Model

The most important architectural improvement is to make silence detection **signal-based rather than report-count-only**.

The system should not define silence simply as:

```text
expected_population - reports_received
```

Instead, every area should have an **Expected Signal Profile** and an **Observed Signal Profile**.

## 5.1 Expected Signal Profile

For a spatial cell `g` and time window `t`, define:

```text
E(g,t) = {
    expected_devices,
    expected_reports,
    expected_network_events,
    expected_mobility_activity,
    expected_checkins,
    expected_beacon_activity,
    expected_transport_observations,
    expected_signal_quality
}
```

These expectations are derived from:

- registered households/devices
- population estimates
- building occupancy estimates
- historical temporal patterns
- connectivity characteristics
- vulnerability information
- known reporting channels
- pre-disaster device participation
- previous observations

The expected profile should be normalized for time-of-day and known connectivity conditions.

---

## 5.2 Actual Signal Profile

The ingestion pipeline continuously produces:

```text
A(g,t) = {
    actual_reports,
    actual_device_observations,
    actual_network_events,
    actual_mobility_activity,
    actual_checkins,
    actual_beacon_observations,
    actual_transport_observations,
    actual_signal_quality
}
```

All actual observations must include:

```text
event_id
source_id
cell_id
event_type
event_time
ingest_time
source_confidence
data_freshness
transport_state
```

This makes delayed data distinguishable from absent data.

---

# 6. Silence Scorer — Expected vs Actual Architecture

## 6.1 Step 1 — Calculate Signal Coverage

For each signal dimension `k`:

```text
coverage_k(g,t) =
    actual_k(g,t) / expected_k(g,t)
```

where the result is bounded to the valid range.

The inverse quantity is the **signal deficit**:

```text
deficit_k(g,t) =
    max(0, 1 - coverage_k(g,t))
```

This produces a normalized measurement independent of the absolute population size.

---

## 6.2 Step 2 — Calculate Weighted Base Score

Each signal type receives a configured reliability weight:

```text
BaseScore(g,t) =
    Σ [ w_k × deficit_k(g,t) ]
    --------------------------------
           Σ w_k
```

The score is normalized to:

```text
0 → normal signal activity
1 → complete signal deficit
```

The weights are configuration, not hard-coded business logic.

Example signal categories for the implementation:

```text
population/report signal
network/connectivity signal
mobility signal
device observation signal
check-in signal
mesh/beacon signal
transport signal
```

The scorer should only use signal categories that have a valid baseline for the cell.

---

## 6.3 Step 3 — Baseline Confidence

Expected signals are not equally trustworthy.

Define:

```text
BaselineConfidence(g,t)
```

from the quality of:

- population estimate
- device registration coverage
- historical signal density
- temporal stability
- connectivity baseline
- source completeness

A cell with poor baseline coverage must not receive the same score interpretation as a well-observed cell.

---

## 6.4 Step 4 — Data Freshness

Every signal observation has an event timestamp and ingestion timestamp.

For each signal category:

```text
Freshness_k =
    freshness_function(now - latest_observation_time)
```

Stale data must not be interpreted as confirmed current silence.

The final scoring record should therefore contain:

```text
base_score
baseline_confidence
data_freshness
observation_count
```

as separate fields.

---

## 6.5 Step 5 — Temporal Escalation

A persistent anomaly should become more important over time.

Instead of hiding time inside the base score:

```text
TemporalFactor(g,t)
```

should be applied after the base score.

Conceptually:

```text
EscalatedScore =
    BaseScore
    × TemporalFactor
    × BaselineConfidence
    × DataFreshnessConfidence
```

Temporal escalation must be monotonic and bounded.

The exact function should be configurable and evaluated during validation rather than embedded permanently in application code.

---

## 6.6 Step 6 — Context Modifiers

Context should refine the ranking, not replace the observed signal deficit.

Optional modifiers include:

```text
vulnerability factor
hazard exposure factor
building-risk factor
known evacuation factor
known connectivity-outage factor
resource accessibility factor
```

These modifiers should be transparent and separately stored.

The final score should therefore be explainable as:

```text
FinalScore
    = BaseScore
    × TemporalFactor
    × DataConfidenceFactor
    × ContextFactor
```

Every factor must be exposed in the scoring record.

---

# 7. Silence Scoring Pipeline

The scoring loop should run as a deterministic pipeline.

```text
1. Load active incident
        ↓
2. Select scoring window
        ↓
3. Load baseline version
        ↓
4. Aggregate expected signals
        ↓
5. Aggregate actual signals
        ↓
6. Align signals by spatial cell + time bucket
        ↓
7. Calculate coverage
        ↓
8. Calculate per-signal deficits
        ↓
9. Calculate weighted BaseScore
        ↓
10. Calculate baseline confidence
        ↓
11. Calculate data freshness
        ↓
12. Apply temporal escalation
        ↓
13. Apply transparent context modifiers
        ↓
14. Generate explanation
        ↓
15. Rank cells
        ↓
16. Persist score version
        ↓
17. Publish update event
        ↓
18. Update command console
```

The score engine must be deterministic for a fixed:

```text
baseline_version
model_version
configuration_version
observation_snapshot
timestamp
```

This allows every decision to be reconstructed later.

---

# 8. Silence Scorer Data Model

Recommended PostgreSQL/PostGIS tables:

```text
baseline_versions
baseline_cells
baseline_signal_profiles
incidents
signal_observations
signal_aggregates
silence_scores
score_explanations
score_configurations
model_versions
clearance_events
```

A `silence_scores` record should contain at minimum:

```text
score_id
incident_id
cell_id
window_start
window_end

base_score

expected_signal_vector
actual_signal_vector
deficit_vector
signal_weights

baseline_confidence
freshness_confidence

temporal_factor
context_factor
final_score

baseline_version
configuration_version
model_version

observation_count
generated_at
```

Do not overwrite historical scores. Scores should be append-only or versioned so that the evolution of the incident can be reconstructed.

---

# 9. ML Architecture

ML should be a **secondary disambiguation layer**, not the primary silence detector.

The deterministic scoring engine first establishes:

```text
Observed signal deficit
+
Baseline confidence
+
Data freshness
```

Only then should ML estimate contextual interpretations such as whether an observed anomaly is likely explained by a known evacuation, infrastructure outage, sparse baseline, or other contextual factor.

Recommended initial model:

```text
Logistic Regression
```

or:

```text
Gradient-Boosted Tree
```

Input features should be derived from already stored data.

The ML output must be:

```text
context_probability
model_confidence
model_version
feature_snapshot
```

It must not directly delete or suppress an anomaly.

Model training should begin with synthetic data and transition toward actively recalibrated real observations once verified operational labels exist.

---

# 10. Device-Signal Architecture

Device-level sensing should not be implemented as a browser-only background capability in the current phase.

The web application should instead support **backend-ingested device observations** through a generic signal interface:

```text
Signal-producing device/system
        ↓
HTTPS ingestion API
        ↓
Signal validation
        ↓
Signal normalization
        ↓
Signal store
        ↓
Silence Scorer
```

For the current web-first implementation, the signal engine should support:

- synthetic/replay signals
- manually generated test observations
- backend-provided device observations
- signal fixtures for deterministic testing

The silence scorer should never depend directly on a specific sensor implementation. This keeps the core scoring architecture independent from how an observation is produced.

A future native implementation can later submit the same normalized signal records without requiring changes to the baseline or scoring engine.

# 11. Offline Web Data Architecture

The current implementation should use browser-supported offline mechanisms rather than attempting to implement a peer-to-peer mesh.

```text
User action / observation
        ↓
Local validation
        ↓
IndexedDB
        ↓
Sync queue
        ↓
Network available?
   ┌────┴────┐
   │ No      │ Yes
   ↓         ↓
Keep local  Upload
   │         ↓
   └────→ Server acknowledgement
```

The web application should support:

- cached application shell
- cached incident/baseline data needed for field use
- local creation of supported records
- queued mutations
- retry with exponential backoff
- idempotent server writes
- explicit sync status
- last-known-data timestamps

Peer-to-peer device transport is **out of the current implementation scope**. The backend must expose clean ingestion interfaces so a future transport layer can submit observations without changing the central scoring architecture.

---

# 12. Sync State Machine

All offline-capable objects should use an explicit synchronization state.

```text
LOCAL_ONLY
   ↓
QUEUED
   ↓
TRANSFERRED
   ↓
GATEWAY_RECEIVED
   ↓
SERVER_ACCEPTED
   ↓
SERVER_CONFIRMED
```

Failure states:

```text
TRANSFER_FAILED
UPLOAD_FAILED
EXPIRED
REJECTED
```

No UI should represent `QUEUED` or `TRANSFERRED` as server-confirmed state.

The frontend must expose:

- event time
- last sync time
- current sync state
- data freshness
- source provenance

---

# 13. Household / Resilience Passport Architecture

The household system should separate identity, sensitive information and presentation.

```text
QR
 ↓
opaque household UUID
 ↓
API authorization
 ↓
encrypted household record
```

The QR must contain only an opaque identifier.

Sensitive data should remain encrypted at rest.

Recommended entities:

```text
households
household_members
medical_records
medications
emergency_contacts
resilience_profiles
qr_credentials
camp_checkins
```

The system should never put medical information directly inside the QR payload.

---

# 14. Evacuation & Relief-Camp Architecture

The routing subsystem should consume authoritative spatial data instead of implementing routing logic inside the frontend.

```text
Hazard data
Road network
Elevation
Camp capacity
Road closures
Evacuation constraints
        ↓
Routing service
        ↓
Safe route candidates
        ↓
Camp suitability
        ↓
Route response
        ↓
Mobile / Command Console
```

The backend should provide:

```text
route_id
origin
destination
segments
estimated_duration
hazard_exposure
road_status
camp_capacity_snapshot
data_timestamp
route_version
```

Offline clients should maintain versioned route/map packages that can be refreshed when connectivity returns.

---

# 15. Incident Command Console Flow

The console should be event-driven from the backend while remaining usable with stale data.

```text
Backend event
      ↓
API / WebSocket gateway
      ↓
TanStack Query cache
      ↓
Feature state
      ↓
Map / ranked queue / detail panels
```

Primary console data domains:

```text
Incident
Area score
Signal state
Contact
Household
Route
Camp
Sync state
Clearance
Audit trail
```

The map should consume geospatial aggregates rather than raw high-frequency device data whenever possible.

---

# 16. API Architecture

Recommended API groups:

```text
/api/v1/incidents
/api/v1/areas
/api/v1/scores
/api/v1/signals
/api/v1/contacts
/api/v1/households
/api/v1/checkins
/api/v1/camps
/api/v1/routes
/api/v1/sync
/api/v1/baselines
/api/v1/models
/api/v1/audit
```

Use:

- Pydantic schemas
- versioned APIs
- request IDs
- idempotency keys for ingestion
- cursor pagination
- explicit timestamps
- source metadata
- authorization scopes

Streaming/event delivery should be implemented separately from the request/response APIs.

---

# 17. Event Architecture

Core events:

```text
SignalObserved
SignalAggregated
DeviceContactObserved
ADUReceived
ADUTransferred
ADUDelivered
HouseholdCheckinCreated
CampCapacityUpdated
RoadStatusUpdated
ScoreCalculated
ScoreUpdated
AreaCleared
RouteUpdated
```

Events must be immutable facts.

Derived state such as the current area score should be rebuilt from stored facts plus the appropriate configuration/version.

---

# 18. Security Architecture

Security boundaries should be explicit.

## Device

```text
Secure key storage
        ↓
Encrypted local database
        ↓
Encrypted ADUs
```

## Transport

```text
Authenticated peer
        ↓
Encrypted transfer
        ↓
No plaintext inspection by courier
```

## Backend

```text
TLS
API authentication
Role-based authorization
Encrypted storage
Audit logging
Secret manager
```

## Sensitive information

Medical and household records should be isolated from low-sensitivity operational telemetry through separate tables, access scopes and service-layer authorization.

---

# 19. Reliability and Observability

Every pipeline should be observable.

Metrics should include:

```text
ingestion latency
offline queue depth
ADU delivery latency
duplicate rate
signal freshness
score computation latency
baseline coverage
baseline confidence distribution
API error rate
mobile sync failure rate
battery drain
native plugin crash rate
```

Tracing should follow an event through:

```text
device
→ ADU
→ transport
→ gateway
→ ingestion
→ aggregation
→ scoring
→ console
```

This is especially important because the system deliberately operates under delayed and partial connectivity.

---

# 20. System-of-Record Boundaries

To avoid conflicting sources of truth:

| Domain | System of Record |
|---|---|
| Household | PostgreSQL |
| Sensitive medical information | PostgreSQL encrypted domain |
| Baseline | Versioned PostgreSQL/PostGIS datasets |
| Raw/aggregated signals | Signal store |
| Offline queue | Device SQLite |
| ADU delivery state | Central sync service |
| HPCS current state | Device + latest server observation |
| Silence scores | PostgreSQL score history |
| Routes | Routing service |
| Camp capacity | PostgreSQL operational state |
| Audit events | Append-only audit store |

The frontend is never a system of record.

---

# 21. Recommended Repository Structure

```text
sahayam/
├── apps/
│   ├── command-console/
│   └── field-app/
│
├── services/
│   ├── api/
│   ├── ingestion/
│   ├── signal-engine/
│   ├── silence-scorer/
│   ├── routing/
│   ├── sync/
│   └── ml-disambiguation/
│
├── packages/
│   ├── schemas/
│   ├── scoring/
│   ├── hpcs/
│   ├── crypto/
│   └── geo/
│
├── plugins/
│   ├── motion-sentinel/
│   └── distress-beacon/
│
├── data/
│   ├── ingestion/
│   ├── baseline/
│   └── fixtures/
│
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   └── monitoring/
│
└── tests/
    ├── unit/
    ├── integration/
    ├── replay/
    ├── mobile/
    └── e2e/
```

The scoring library should be isolated from the API so that the core algorithm can be replayed against a frozen observation set without running the complete system.

---

# 22. Processing Layers

The architecture should be organized into the following layers:

```text
Layer 1  — Data Sources
Layer 2  — Device & Field Collection
Layer 3  — Offline Transport
Layer 4  — Central Ingestion
Layer 5  — Signal Normalization
Layer 6  — Baseline & Expected-Signal Engine
Layer 7  — Deterministic Silence Scoring
Layer 8  — ML Contextual Disambiguation
Layer 9  — Triage Prioritization
Layer 10 — Command Console / Field Actions
Layer 11 — Audit, Observability & Model Feedback
```

This separation is preferable to placing intelligence directly inside the UI or data-collection clients.

---

# 23. End-to-End Runtime Flow

The complete production flow should be:

```text
PRE-DISASTER
─────────────
External datasets
      ↓
Data ingestion
      ↓
Spatial normalization
      ↓
Population + vulnerability modelling
      ↓
Expected signal baseline
      ↓
Versioned baseline stored


INCIDENT START
──────────────
Incident configuration activated
      ↓
Relevant baseline version selected
      ↓
Scoring windows created


FIELD / DEVICE
──────────────
Device observations
Household reports
Check-ins
Network/infrastructure observations
      ↓
Local validation
      ↓
SQLite queue
      ↓
Encrypted ADUs
      ↓
Offline custody transfer


CENTRAL INGESTION
─────────────────
Gateway receives ADUs
      ↓
Authentication
      ↓
Deduplication
      ↓
Schema validation
      ↓
Signal normalization
      ↓
Temporal/spatial aggregation


SILENCE ANALYSIS
────────────────
Expected signals
      +
Actual signals
      ↓
Coverage ratios
      ↓
Per-signal deficits
      ↓
Weighted BaseScore
      ↓
Baseline confidence
      ↓
Data freshness
      ↓
Temporal escalation
      ↓
Context modifiers
      ↓
Final ranked score


DECISION SUPPORT
────────────────
Score explanation generated
      ↓
Area ranking updated
      ↓
Map + queue updated
      ↓
Responder investigates
      ↓
Verification / clearance recorded


LEARNING LOOP
─────────────
Clearance and verification events
      ↓
Label/feedback store
      ↓
Baseline recalibration
      ↓
ML recalibration
      ↓
New versioned configuration
```

---

# 24. Architecture Principles

The production implementation should follow these principles:

### 1. Expected vs Actual

Silence is measured as a **deficit relative to expected signals**, not simply as a lack of reports.

### 2. Deterministic Before ML

The base anomaly must be computable without ML. ML refines interpretation rather than creating the primary anomaly.

### 3. Freshness Is Data

A stale observation is not equivalent to a current observation.

### 4. Confidence Is Separate From Score

The system must distinguish:

```text
How anomalous is the area?
```

from:

```text
How confident are we in the measurement?
```

### 5. Version Everything

Baseline, model, scoring configuration and observation snapshots must be versionable.

### 6. Offline First

The field layer must remain functional without continuous connectivity.

### 7. Human Verification Closes the Loop

Algorithmic scores prioritize attention. Physical verification determines clearance.

### 8. Advisory Sensor Signals

HPCS and related device-level signals provide supporting evidence and must never independently suppress an area or contact.

### 9. Explain Every Score

Every ranked area should have a machine-readable and human-readable breakdown of:

```text
expected
actual
deficit
weights
confidence
freshness
modifiers
final score
```

### 10. Auditability

A historical incident must be reproducible from recorded observations and configuration versions.

---

# 25. Recommended Build Order

## Phase 0 — Architecture & Feasibility

- Repository structure
- Shared schemas
- PostgreSQL/PostGIS setup
- Device capability spike
- Signal replay framework
- Baseline prototype
- Silence-scoring mathematical specification

## Phase 1 — Data Foundation

- Household data model
- Geospatial ingestion
- Baseline generation
- Signal observation schema
- Versioning

## Phase 2 — Core Signal Pipeline

- Device/API ingestion
- Offline queue
- ADU protocol
- Server deduplication
- Aggregation pipeline

## Phase 3 — Silence Scorer

- Expected signal engine
- Actual signal aggregation
- Coverage calculation
- Deficit calculation
- Weighted BaseScore
- Confidence/freshness calculations
- Temporal/context factors
- Score history and replay

## Phase 4 — Command Console

- MapLibre
- ranked area queue
- score explanation
- freshness indicators
- incident timeline
- audit view

## Phase 5 — Web Field Application

- responsive mobile-first field workflows
- IndexedDB persistence
- PWA service worker
- offline incident/package caching
- queued mutations and retry
- signal observation/replay interfaces

## Phase 6 — Evacuation & Camps

- Routing service
- offline map packages
- camp registry
- capacity state
- household check-in flow

## Phase 7 — ML Recalibration & Hardening

- contextual classifier
- feedback/labels
- model evaluation
- resilience testing
- observability
- security hardening
- field validation

---

# 26. Final Architecture Decision

The immediate production architecture for Sahayam should be **web-first and backend-centered**:

```text
                    ┌──────────────────────────┐
                    │   React + TypeScript     │
                    │ Command + Field Web App  │
                    │ PWA / IndexedDB / Maps   │
                    └────────────┬─────────────┘
                                 │
                          REST / SSE / WS
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │         FastAPI           │
                    │ API + authorization       │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
       PostgreSQL/PostGIS      Redis          Background Jobs
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │   Signal Ingestion       │
                    │ validation + aggregation │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Expected-Signal Engine   │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Deterministic Silence    │
                    │ Scoring Engine            │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Contextual ML Layer      │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Triage / Ranking / Audit │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Command + Field Web App  │
                    └──────────────────────────┘
```

The web app's offline path is:

```text
Browser
  ↓
Service Worker
  ↓
IndexedDB
  ↓
Sync Queue
  ↓
HTTPS
  ↓
Central API
```

The current system should **not** include Kotlin, Swift, Capacitor, BLE, Wi-Fi Direct, native background sensing, or native peer-to-peer transport in the implementation plan.

Those capabilities can be treated as future signal/transport producers behind stable backend interfaces. The architecture therefore remains extensible without making them a dependency of the initial web implementation.

The immediate development target is the complete loop:

```text
Baseline
   ↓
Expected Signals
   ↓
Actual Signals
   ↓
Signal Deficits
   ↓
BaseScore
   ↓
Confidence + Freshness
   ↓
Temporal / Context Factors
   ↓
Final Area Ranking
   ↓
Web Command Console
   ↓
Human Verification
   ↓
Audit / Feedback
```
