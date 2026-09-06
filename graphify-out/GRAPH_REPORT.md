# Graph Report - sahayam  (2026-09-06)

## Corpus Check
- 81 files · ~130,205 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 680 nodes · 1042 edges · 47 communities (37 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c28bf707`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FieldPages.tsx
- devDependencies
- CommandPage.tsx
- compilerOptions
- dependencies
- compilerOptions
- Scenarios: Testing Silence Detection
- tsconfig.json
- High-Contrast WCAG Operational Display Standard
- Active vs Passive Motion Fingerprinting
- Disaster Distress Detection (DDD) Core
- Sahayam Unified Production Architecture
- Web Digital Silence Anomaly Triage
- DtnRelayServer
- Sahayam — Implementation Plan
- Sahayam Silence Dataset — Complete Summary
- Sahayam Silence Scorer — Implementation Guide
- generate_dataset.py
- Tables
- score_cell
- DtnStore
- SAHAYAM (സഹായം)
- client.ts
- Sahayam — Market Model & Deployment Strategy
- db.py
- UserProfile
- dtn.py
- get_db
- auth.py
- Sahayam Silence Dataset
- SseManager
- Setup Instructions
- Dataset Contents
- Customization
- Sahayam — Scorer Validation Report
- canonical_hash_bundle
- load_dataset.py
- Performance Characteristics
- Testing the Silence Scorer
- __init__.py
- backend/README.md
- sw.js
- sahayam-backend

## God Nodes (most connected - your core abstractions)
1. `get_db()` - 26 edges
2. `SahayamStore` - 20 edges
3. `DtnStore` - 19 edges
4. `useSahayamStore()` - 17 edges
5. `compilerOptions` - 17 edges
6. `Sahayam Silence Dataset` - 15 edges
7. `UserProfile` - 14 edges
8. `score_cell()` - 14 edges
9. `DtnRelayServer` - 14 edges
10. `SAHAYAM (സഹായം)` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Incident Command Visual Design Specification` --references--> `Button()`  [INFERRED]
  DESIGN.md → src/components/ui.tsx
- `Incident Command Live Triage Console` --implements--> `CommandPage()`  [INFERRED]
  sahayam-system-plan-revised.md → src/pages/CommandPage.tsx
- `P2P Offline Mesh & Wi-Fi Direct Relay` --references--> `ScannerPage()`  [INFERRED]
  SAHAYAM.md → src/pages/FieldPages.tsx
- `Sahayam System Plan & Architecture Blueprint` --references--> `App()`  [INFERRED]
  system-plan.md → src/App.tsx
- `Dark Neutral & Semantic Accent Color System` --references--> `SilenceMap()`  [INFERRED]
  DESIGN.md → src/components/SilenceMap.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Disaster Resilience & Dark Zone Triage Pipeline** — sahayam_dark_zone_scorer, src_components_silencemap_silencemap, src_pages_commandpage_commandpage, src_data_fixtures_silentzones [INFERRED 0.95]
- **Offline Field & Responder Coordination Flow** — sahayam_p2p_mesh, sahayam_store_forward, src_pages_fieldpages_scannerpage, src_components_ui_syncqueue [INFERRED 0.95]

## Communities (47 total, 10 thin omitted)

### Community 0 - "FieldPages.tsx"
Cohesion: 0.05
Nodes (54): Incident Command Visual Design Specification, Application HTML Shell & Viewport Entry, qrcode, qrcode, P2P Offline Mesh & Wi-Fi Direct Relay, Store-and-Forward Local Synchronization Database, apiLogin(), setAuthToken() (+46 more)

### Community 1 - "devDependencies"
Cohesion: 0.05
Nodes (39): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, fake-indexeddb, globals, jsdom, devDependencies (+31 more)

### Community 2 - "CommandPage.tsx"
Cohesion: 0.11
Nodes (26): Dark Neutral & Semantic Accent Color System, Human Proximity Confidence Score (HPCS), Dark Zone Silence Anomaly Scorer, CampsMap(), CampsMapProps, getRouteCoordinates(), TILE_STYLES, USER_ORIGIN (+18 more)

### Community 3 - "compilerOptions"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, src, @testing-library/jest-dom, vitest/globals, compilerOptions, allowJs, allowSyntheticDefaultImports (+16 more)

### Community 4 - "dependencies"
Cohesion: 0.07
Nodes (26): jsqr, lucide-react, maplibre-gl, dependencies, jsqr, lucide-react, maplibre-gl, react (+18 more)

### Community 5 - "compilerOptions"
Cohesion: 0.12
Nodes (15): eslint.config.js, src/data/canonical.ts, vite.config.ts, vite-plugins, vitest.config.ts, compilerOptions, composite, lib (+7 more)

### Community 6 - "Scenarios: Testing Silence Detection"
Cohesion: 0.20
Nodes (10): Scenario A: Normal Operations, Scenario B: Partial Silence, Scenario C: Severe Silence, Scenario D: Complete Silence, Scenario E: False Silence / Low Baseline, Scenario F: Communication Outage, Scenario G: Network/Data Collection Failure, Scenario H: Increased Activity (+2 more)

### Community 15 - "DtnRelayServer"
Cohesion: 0.11
Nodes (10): canonicalize(), extractImmutableBundlePayload(), hashBundlePayload(), IMMUTABLE_BUNDLE_FIELDS, ImmutableBundleField, dtnRelayPlugin(), DtnRelayServer, RelayBundle (+2 more)

### Community 18 - "Sahayam — Implementation Plan"
Cohesion: 0.05
Nodes (40): 2a. README corrections (`README.md`), 2b. `MARKET.md` (new), API contract summary, Behaviour, Definition of done (per phase), Design, Dev workflow, Files (+32 more)

### Community 19 - "Sahayam Silence Dataset — Complete Summary"
Cohesion: 0.06
Nodes (30): 1. Algorithm Development, 1. Generate the Dataset (Already Done), 1. Realistic Heterogeneity, 2. Create PostgreSQL Database, 2. Edge Case Validation, 2. Meaningful Time Variation, 3. Deterministic but Noisy, 3. Performance Testing (+22 more)

### Community 20 - "Sahayam Silence Scorer — Implementation Guide"
Cohesion: 0.07
Nodes (26): 1. Real-Time Scoring Loop, 2. Severity Classification, 3. Spatial Analysis, 4. Time-Series Analysis, Baseline Validity Analysis, BaseScore Formula, Check a Specific Window, Common Pitfalls (+18 more)

### Community 21 - "generate_dataset.py"
Cohesion: 0.19
Nodes (19): DataFrame, generate_actual_signal_profile(), generate_expected_signal_profile(), generate_ground_truth(), generate_known_test_cases(), generate_scenarios(), generate_spatial_cells(), get_day_of_week_multiplier() (+11 more)

### Community 22 - "Tables"
Cohesion: 0.18
Nodes (11): `actual_signal_profile`, Database Schema, `expected_signal_profile`, Indexes, `known_scoring_cases`, `scenario_cells`, `scenarios`, `signal_types` (+3 more)

### Community 23 - "score_cell"
Cohesion: 0.11
Nodes (13): CellScore, Any, Authoritative weighted-deficit silence scorer for Sahayam. Pure functions, zero…, Computes weighted silence deficit across multiple signal dimensions for a…, score_cell(), SignalBreakdown, Precomputes silence_scores for all scenarios and spatial cells. Idempotent and…, score_all() (+5 more)

### Community 24 - "DtnStore"
Cohesion: 0.17
Nodes (10): Incident Command Live Triage Console, ADUBundle, CustodyReceipt, DtnStore, playEmergencyChime(), SEED_BUNDLES, useDtnMesh(), CommandPage() (+2 more)

### Community 25 - "SAHAYAM (സഹായം)"
Cohesion: 0.08
Nodes (25): 1. Clone & Install Dependencies, 1. Dark Zone Silence Anomaly Scorer, 2. Disconnected Data Distribution (DDD) Offline Mesh, 2. Start Development Server, 3. Digital Household Resilience Passport & QR Triage, 3. Testing on Multiple Devices, 4. Hazard-Aware Evacuation Routing, ⚡ Core Capabilities & Innovation (+17 more)

### Community 27 - "client.ts"
Cohesion: 0.10
Nodes (27): apiAddMember(), apiCreateHousehold(), ApiError, apiFetch(), apiGetCells(), apiGetMemberByQr(), apiGetScenarios(), apiGetScores() (+19 more)

### Community 28 - "Sahayam — Market Model & Deployment Strategy"
Cohesion: 0.22
Nodes (8): 1. Stakeholder Architecture: Users, Buyers & Channels, 2. Pilot District Strategy: Wayanad (100 Grid Sectors), 3. Cost Model (Yearly, Order-of-Magnitude), 4. Funding Routes, 5. Grassroots Distribution Pipeline, 6. Open-Source Sustainability & Public Good Model, 7. Risks & Mitigations, Sahayam — Market Model & Deployment Strategy

### Community 29 - "db.py"
Cohesion: 0.16
Nodes (12): close_pool(), init_pool(), lifespan(), get, root(), health_check(), get, Settings (+4 more)

### Community 30 - "UserProfile"
Cohesion: 0.20
Nodes (16): require_role(), UserProfile, add_household_member(), create_household(), CreateHouseholdPayload, CreateMemberPayload, get_households(), BaseModel (+8 more)

### Community 31 - "dtn.py"
Cohesion: 0.25
Nodes (14): accept_custody(), CustodyPayload, fetch_all_bundles(), fetch_full_bundle(), get_bundles(), publish_sos(), Any, BaseModel (+6 more)

### Community 32 - "get_db"
Cohesion: 0.21
Nodes (11): get_db(), get_cells(), get, reset_bundles(), get_scenarios(), get, get_cell_breakdown(), get_scores() (+3 more)

### Community 33 - "auth.py"
Cohesion: 0.26
Nodes (11): create_access_token(), get_current_user(), get_me(), login(), LoginRequest, LoginResponse, BaseModel, get (+3 more)

### Community 37 - "Sahayam Silence Dataset"
Cohesion: 0.22
Nodes (8): Citation, Future Extensions, Known Limitations, Overview, Questions & Support, Reproducibility, Sahayam Silence Dataset, The Scoring Model

### Community 38 - "SseManager"
Cohesion: 0.29
Nodes (3): Any, SseManager, Queue

### Community 40 - "Setup Instructions"
Cohesion: 0.33
Nodes (6): 1. Prerequisites, 2. Create Database, 3. Generate Dataset, 4. Load into PostgreSQL, 5. Verify Data, Setup Instructions

### Community 41 - "Dataset Contents"
Cohesion: 0.33
Nodes (6): Cell-Type Specific Adjustments, Dataset Contents, Signal Dimensions: 8 Independent Types, Spatial Layer: 100 Realistic Cells, Temporal Layer: 7 Days × 96 Windows/Day, Time-of-Day Behavior

### Community 44 - "Customization"
Cohesion: 0.40
Nodes (5): Add New Cell Types or Scenarios, Adjust Signal Weights, Customization, Generate Different Dataset Size, Modify Time-of-Day Patterns

### Community 45 - "Sahayam — Scorer Validation Report"
Cohesion: 0.40
Nodes (4): 1. Precision-Recall & Confounder Sweep, 2. Confounder Suppression & Robustness, 3. Operational Deployment Recommendation, Sahayam — Scorer Validation Report

### Community 46 - "canonical_hash_bundle"
Cohesion: 0.67
Nodes (3): canonical_hash_bundle(), asyncio, test_dtn_sos_and_lifecycle()

### Community 47 - "load_dataset.py"
Cohesion: 0.67
Nodes (3): hash_password(), load_dataset(), Fast dataset and seed loader for Sahayam. Uses COPY ... FROM STDIN via psycopg…

### Community 48 - "Performance Characteristics"
Cohesion: 0.50
Nodes (4): Dataset Size, Indexes, Performance Characteristics, Query Performance

### Community 49 - "Testing the Silence Scorer"
Cohesion: 0.67
Nodes (3): Querying Scenarios, Testing the Silence Scorer, Using Known Test Cases

## Knowledge Gaps
- **265 isolated node(s):** `sahayam-backend`, `name`, `private`, `version`, `type` (+260 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `FieldPages.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `qrcode` connect `FieldPages.tsx` to `dependencies`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `sahayam-backend`, `name`, `private` to the rest of the system?**
  _265 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FieldPages.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05067920585161965 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `CommandPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10804597701149425 - nodes in this community are weakly interconnected._