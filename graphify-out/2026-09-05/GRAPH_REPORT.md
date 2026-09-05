# Graph Report - sahayam  (2026-09-05)

## Corpus Check
- 26 files · ~26,922 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 169 nodes · 207 edges · 18 communities (12 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b726a3d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FieldPages.tsx
- devDependencies
- CommandPage.tsx
- compilerOptions
- package.json
- compilerOptions
- App
- tsconfig.json
- High-Contrast WCAG Operational Display Standard
- Active vs Passive Motion Fingerprinting
- Disaster Distress Detection (DDD) Core
- Sahayam Unified Production Architecture
- Web Digital Silence Anomaly Triage

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `SilenceMap()` - 7 edges
3. `scripts` - 6 edges
4. `AppShell()` - 5 edges
5. `Button()` - 5 edges
6. `compilerOptions` - 5 edges
7. `App()` - 4 edges
8. `cssColor()` - 4 edges
9. `StatusBadge()` - 4 edges
10. `silentZones` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Dark Neutral & Semantic Accent Color System` --references--> `SilenceMap()`  [INFERRED]
  DESIGN.md → src/components/SilenceMap.tsx
- `Incident Command Visual Design Specification` --references--> `Button()`  [INFERRED]
  DESIGN.md → src/components/ui.tsx
- `Sahayam System Plan & Architecture Blueprint` --references--> `App()`  [INFERRED]
  system-plan.md → src/App.tsx
- `Dark Zone Silence Anomaly Scorer` --implements--> `SilenceMap()`  [INFERRED]
  SAHAYAM.md → src/components/SilenceMap.tsx
- `Store-and-Forward Local Synchronization Database` --implements--> `SyncQueue()`  [INFERRED]
  SAHAYAM.md → src/components/ui.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Disaster Resilience & Dark Zone Triage Pipeline** — sahayam_dark_zone_scorer, src_components_silencemap_silencemap, src_pages_commandpage_commandpage, src_data_fixtures_silentzones [INFERRED 0.95]
- **Offline Field & Responder Coordination Flow** — sahayam_p2p_mesh, sahayam_store_forward, src_pages_fieldpages_scannerpage, src_components_ui_syncqueue [INFERRED 0.95]

## Communities (18 total, 6 thin omitted)

### Community 0 - "FieldPages.tsx"
Cohesion: 0.10
Nodes (25): Incident Command Visual Design Specification, P2P Offline Mesh & Wi-Fi Direct Relay, Store-and-Forward Local Synchronization Database, CommandPage, AppShell(), roles, Button(), ButtonProps (+17 more)

### Community 1 - "devDependencies"
Cohesion: 0.06
Nodes (33): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies, eslint (+25 more)

### Community 2 - "CommandPage.tsx"
Cohesion: 0.12
Nodes (24): Dark Neutral & Semantic Accent Color System, Human Proximity Confidence Score (HPCS), Dark Zone Silence Anomaly Scorer, Incident Command Live Triage Console, cellColorExpression(), cellFeatures, cellGeoJson, cssColor() (+16 more)

### Community 3 - "compilerOptions"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2022, src, @testing-library/jest-dom, vitest/globals, compilerOptions, allowJs (+16 more)

### Community 4 - "package.json"
Cohesion: 0.09
Nodes (21): lucide-react, maplibre-gl, dependencies, lucide-react, maplibre-gl, react, react-dom, react-router-dom (+13 more)

### Community 5 - "compilerOptions"
Cohesion: 0.20
Nodes (9): eslint.config.js, vite.config.ts, vitest.config.ts, compilerOptions, composite, module, moduleResolution, skipLibCheck (+1 more)

### Community 6 - "App"
Cohesion: 0.33
Nodes (3): Application HTML Shell & Viewport Entry, App(), Sahayam System Plan & Architecture Blueprint

## Knowledge Gaps
- **85 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `SilenceMap()` (e.g. with `Dark Neutral & Semantic Accent Color System` and `Dark Zone Silence Anomaly Scorer`) actually correct?**
  _`SilenceMap()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FieldPages.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10416666666666667 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `CommandPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1225071225071225 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._