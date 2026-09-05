# Graph Report - sahayam  (2026-09-06)

## Corpus Check
- 40 files · ~110,836 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 387 nodes · 528 edges · 27 communities (21 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `10e4f59a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CivilianPages.tsx
- devDependencies
- CommandPage.tsx
- compilerOptions
- dependencies
- compilerOptions
- Sahayam Silence Dataset
- tsconfig.json
- High-Contrast WCAG Operational Display Standard
- Active vs Passive Motion Fingerprinting
- Disaster Distress Detection (DDD) Core
- Sahayam Unified Production Architecture
- Web Digital Silence Anomaly Triage
- SahayamStore
- Sahayam Silence Dataset — Complete Summary
- Sahayam Silence Scorer — Implementation Guide
- generate_dataset.py
- Tables
- DtnStore
- SAHAYAM (സഹായം)
- Scenarios: Testing Silence Detection

## God Nodes (most connected - your core abstractions)
1. `SahayamStore` - 20 edges
2. `DtnStore` - 17 edges
3. `useSahayamStore()` - 17 edges
4. `compilerOptions` - 17 edges
5. `Sahayam Silence Dataset` - 15 edges
6. `SAHAYAM (സഹായം)` - 13 edges
7. `Sahayam Silence Dataset — Complete Summary` - 11 edges
8. `useDtnMesh()` - 10 edges
9. `Scenarios: Testing Silence Detection` - 10 edges
10. `Tables` - 9 edges

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

## Communities (27 total, 6 thin omitted)

### Community 0 - "CivilianPages.tsx"
Cohesion: 0.08
Nodes (31): Incident Command Visual Design Specification, Application HTML Shell & Viewport Entry, P2P Offline Mesh & Wi-Fi Direct Relay, Store-and-Forward Local Synchronization Database, App(), CommandPage, AppShell(), Button() (+23 more)

### Community 1 - "devDependencies"
Cohesion: 0.06
Nodes (33): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies, eslint (+25 more)

### Community 2 - "CommandPage.tsx"
Cohesion: 0.10
Nodes (29): Dark Neutral & Semantic Accent Color System, Human Proximity Confidence Score (HPCS), Dark Zone Silence Anomaly Scorer, Incident Command Live Triage Console, CampsMap(), CampsMapProps, getRouteCoordinates(), TILE_STYLES (+21 more)

### Community 3 - "compilerOptions"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2022, src, @testing-library/jest-dom, vitest/globals, compilerOptions, allowJs (+16 more)

### Community 4 - "dependencies"
Cohesion: 0.08
Nodes (23): lucide-react, maplibre-gl, dependencies, lucide-react, maplibre-gl, react, react-dom, react-router-dom (+15 more)

### Community 5 - "compilerOptions"
Cohesion: 0.20
Nodes (9): eslint.config.js, vite.config.ts, vitest.config.ts, compilerOptions, composite, module, moduleResolution, skipLibCheck (+1 more)

### Community 6 - "Sahayam Silence Dataset"
Cohesion: 0.06
Nodes (32): 1. Prerequisites, 2. Create Database, 3. Generate Dataset, 4. Load into PostgreSQL, 5. Verify Data, Add New Cell Types or Scenarios, Adjust Signal Weights, Cell-Type Specific Adjustments (+24 more)

### Community 18 - "SahayamStore"
Cohesion: 0.24
Nodes (5): qrcode, qrcode, PROTOTYPE_CREDENTIALS, SahayamStore, HomePage()

### Community 19 - "Sahayam Silence Dataset — Complete Summary"
Cohesion: 0.06
Nodes (30): 1. Algorithm Development, 1. Generate the Dataset (Already Done), 1. Realistic Heterogeneity, 2. Create PostgreSQL Database, 2. Edge Case Validation, 2. Meaningful Time Variation, 3. Deterministic but Noisy, 3. Performance Testing (+22 more)

### Community 20 - "Sahayam Silence Scorer — Implementation Guide"
Cohesion: 0.07
Nodes (26): 1. Real-Time Scoring Loop, 2. Severity Classification, 3. Spatial Analysis, 4. Time-Series Analysis, Baseline Validity Analysis, BaseScore Formula, Check a Specific Window, Common Pitfalls (+18 more)

### Community 21 - "generate_dataset.py"
Cohesion: 0.19
Nodes (18): DataFrame, generate_actual_signal_profile(), generate_expected_signal_profile(), generate_ground_truth(), generate_known_test_cases(), generate_scenarios(), generate_spatial_cells(), get_day_of_week_multiplier() (+10 more)

### Community 22 - "Tables"
Cohesion: 0.18
Nodes (11): `actual_signal_profile`, Database Schema, `expected_signal_profile`, Indexes, `known_scoring_cases`, `scenario_cells`, `scenarios`, `signal_types` (+3 more)

### Community 24 - "DtnStore"
Cohesion: 0.17
Nodes (7): ADUBundle, CustodyReceipt, DtnStore, playEmergencyChime(), SEED_BUNDLES, useDtnMesh(), DtnRelayPage()

### Community 25 - "SAHAYAM (സഹായം)"
Cohesion: 0.08
Nodes (24): 1. Clone & Install Dependencies, 1. Dark Zone Silence Anomaly Scorer, 2. Disconnected Data Distribution (DDD) Offline Mesh, 2. Start Development Server, 3. Digital Household Resilience Passport & QR Triage, 3. Testing on Multiple Devices, 4. Hazard-Aware Evacuation Routing, ⚡ Core Capabilities & Innovation (+16 more)

### Community 26 - "Scenarios: Testing Silence Detection"
Cohesion: 0.20
Nodes (10): Scenario A: Normal Operations, Scenario B: Partial Silence, Scenario C: Severe Silence, Scenario D: Complete Silence, Scenario E: False Silence / Low Baseline, Scenario F: Communication Outage, Scenario G: Network/Data Collection Failure, Scenario H: Increased Activity (+2 more)

## Knowledge Gaps
- **199 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+194 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `SahayamStore`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `qrcode` connect `SahayamStore` to `dependencies`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _199 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CivilianPages.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0782312925170068 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `CommandPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09659090909090909 - nodes in this community are weakly interconnected._