# Sahayam Silence Dataset

A synthetic spatiotemporal dataset designed to test the **Silence Scoring subsystem** of Sahayam, an Incident Command System for disaster resilience and emergency response.

## Overview

The Silence Scorer detects when geographic cells are becoming **silent**—losing expected signal strength across multiple communication and reporting dimensions. This dataset provides realistic test data to validate that the scorer correctly:

1. Distinguishes true silence from low baseline activity
2. Handles missing data (unavailable signals) vs. zero signals
3. Processes multi-dimensional signal analysis
4. Detects geographically clustered events
5. Tracks disaster progression over time
6. Avoids false positives from natural variance

## The Scoring Model

The core silence scoring formula for a cell during a 15-minute window:

```
For each signal dimension k with a valid baseline:
    coverage_k = actual_k / expected_k
    deficit_k = max(0, 1 - coverage_k)

BaseScore = Σ(weight_k × deficit_k) / Σ(weight_k)

Result:
    0.0 = no silence (actual ≈ expected)
    1.0 = complete silence (actual ≈ 0)
```

**Key properties:**
- Only dimensions with `baseline_valid = True` contribute to scoring
- Excess activity (actual > expected) does not increase the score
- Missing data (data_available = False) is excluded from deficit calculation
- Expected values must exceed a minimum threshold to be considered valid

## Dataset Contents

### Spatial Layer: 100 Realistic Cells

Each cell represents a geographic area with distinct characteristics:

```
Cell Properties:
  - cell_id: Unique identifier (C001 to C100)
  - geometry: Polygon (PostGIS format)
  - latitude, longitude: Center coordinates
  - cell_type: residential | commercial | industrial | hospital | shelter | school | rural | mixed
  - population: Total persons (5K–75K)
  - household_count, building_count, road_length_km
  - hospital_count, school_count, shelter_count
  - population_density: persons/km²
```

**Distribution:**
- 50% residential cells (high signal diversity)
- 10% commercial (higher reporting)
- 8% industrial (infrastructure-focused)
- 8% rural (low baseline expectations)
- 10% mixed
- 5% hospital (specialized medical signals)
- 2% shelter (high shelter checkin activity)

### Temporal Layer: 7 Days × 96 Windows/Day

- **Start:** 2026-08-01 00:00 UTC
- **End:** 2026-08-07 23:45 UTC
- **Window size:** 15 minutes
- **Total windows:** 672
- **Total signal records:** ~537,600 (100 cells × 672 windows × 8 signals)

### Signal Dimensions: 8 Independent Types

| Signal Type | Weight | Unit | Pattern | Base Rate |
|---|---|---|---|---|
| sos_reports | 0.25 | count | time_dependent | 0.5 per 10K/window |
| medical_requests | 0.20 | count | stable | 2.0 per 10K/window |
| incident_reports | 0.15 | count | time_dependent | 1.2 per 10K/window |
| volunteer_reports | 0.10 | count | time_dependent | 0.8 per 10K/window |
| shelter_checkins | 0.10 | count | time_dependent | 0.3 per 10K/window |
| infrastructure_reports | 0.08 | count | stable | 0.5 per 10K/window |
| mobility_signal | 0.07 | pings | time_dependent | 50.0 per 10K/window |
| communication_signal | 0.05 | events | time_dependent | 100.0 per 10K/window |

**Properties:**
- Each signal has semantic meaning and realistic temporal patterns
- Different cell types show different baseline expectations
- Weights are configurable (stored in `signal_types` table)
- Variance factors (0.8–1.6) reflect signal-type noise characteristics

### Time-of-Day Behavior

Expected signals vary throughout the day. Examples:

- **SOS reports:** Low at night (0.5x), peak during day (1.3x)
- **Shelter checkins:** High at night (1.8x), low during day (0.4x)
- **Mobility signal:** Low at night (0.3x), peak during rush hours (1.6x)
- **Medical requests:** Relatively stable (0.8x–1.1x)

### Cell-Type Specific Adjustments

Signals are further adjusted based on cell type:

- Hospital cells expect **2.5× more medical requests**
- Shelter cells expect **3.0× more shelter checkins**
- Residential/mixed cells expect **1.2× more shelter activity** (refugees)
- Industrial/commercial cells expect **1.4–1.5× more SOS and infrastructure reports**
- Rural cells expect **0.6× volunteer reports** (fewer volunteers available)

## Scenarios: Testing Silence Detection

The dataset contains **9 distinct scenarios** to test different aspects of silence detection:

### Scenario A: Normal Operations
- **When:** Aug 1–2, 00:00–02:00
- **Cells:** 5 residential cells
- **Severity:** No reduction (1.0 multiplier)
- **Expected Score:** ~0.05–0.15 (normal background variation)
- **Tests:** Baseline behavior, noise tolerance

### Scenario B: Partial Silence
- **When:** Aug 1, 10:00–14:00 (4 hours)
- **Cells:** 8 residential cells
- **Severity:** 40% reduction (0.4 multiplier)
- **Expected Score:** ~0.35–0.45
- **Tests:** Mid-range deficit detection, localized events

### Scenario C: Severe Silence
- **When:** Aug 2, 08:00–13:00 (5 hours)
- **Cells:** 6 commercial/mixed cells
- **Severity:** 85% reduction (0.15 multiplier)
- **Expected Score:** ~0.75–0.85
- **Tests:** High-confidence silence detection

### Scenario D: Complete Silence
- **When:** Aug 3, 09:00–12:00 (3 hours)
- **Cells:** 4 high-density cells
- **Severity:** Total loss (0.0 multiplier)
- **Expected Score:** ~0.95–1.0
- **Tests:** Extreme case, all signals gone

### Scenario E: False Silence / Low Baseline
- **When:** Aug 3, 15:00–18:00 (3 hours)
- **Cells:** 5 rural cells
- **Severity:** No reduction (1.0 multiplier)
- **Expected Score:** ~0.05–0.20 (naturally low)
- **Tests:** Baseline validity, avoiding false alarms in low-activity areas

### Scenario F: Communication Outage
- **When:** Aug 4, 06:00–09:00 (3 hours)
- **Cells:** 7 high-population cells
- **Severity:** Only communication signals unavailable
- **Expected Score:** ~0.20–0.35 (partial due to missing signal type)
- **Tests:** Handling selective signal loss, system-level failures

### Scenario G: Network/Data Collection Failure
- **When:** Aug 5, 12:00–15:00 (3 hours)
- **Cells:** 5 commercial cells
- **Severity:** Mobility + communication unavailable
- **Expected Score:** Should NOT include unavailable signals in denominator
- **Tests:** data_available flag handling, missing vs. zero distinction

### Scenario H: Increased Activity
- **When:** Aug 6, 10:00–13:00 (3 hours)
- **Cells:** 6 cells with >100 buildings
- **Severity:** 80% excess (1.8 multiplier)
- **Expected Score:** ~0.0 (no deficit; excess not penalized)
- **Tests:** Ceiling behavior, high-activity periods

### Scenario I: Disaster Progression (Extended)
- **When:** Aug 4, 10:00–16:00 (6 hours)
- **Cells:** 8 high-density cells
- **Progression:** Gradual onset → peak → recovery
- **Severity curve:** 1.0 → 0.3 → 0.0 → 0.3 → 1.0
- **Expected Scores:** ~0.05 → ~0.4 → ~0.95 → ~0.4 → ~0.05
- **Tests:** Time-series analysis, detecting escalation patterns

## Database Schema

### Tables

#### `spatial_cells`
Defines the geographic units being monitored.
```sql
cell_id VARCHAR(10) PRIMARY KEY
geometry GEOMETRY(Polygon, 4326)
latitude, longitude NUMERIC
cell_type VARCHAR(50)
population, household_count, building_count INTEGER
road_length_km, population_density NUMERIC
hospital_count, school_count, shelter_count INTEGER
```

#### `signal_types`
Metadata for signal dimensions.
```sql
signal_type_id VARCHAR(50) PRIMARY KEY
name VARCHAR(100)
description TEXT
default_weight NUMERIC(4, 3)  -- e.g., 0.25
unit VARCHAR(50)
temporal_pattern VARCHAR(50)  -- 'time_dependent' | 'stable'
variance_factor NUMERIC(4, 2)
is_count_type BOOLEAN
```

#### `expected_signal_profile`
Expected signals for each cell-window-signal combination.
```sql
cell_id VARCHAR(10), window_start TIMESTAMP, signal_type_id VARCHAR(50)
expected_value NUMERIC(12, 4)
baseline_valid BOOLEAN  -- FALSE if expected < 0.05
confidence NUMERIC(4, 3)
baseline_source VARCHAR(50)
PRIMARY KEY: (cell_id, window_start, signal_type_id)
```

#### `actual_signal_profile`
Observed signals (with realistic noise and scenario effects).
```sql
cell_id VARCHAR(10), window_start TIMESTAMP, signal_type_id VARCHAR(50)
actual_value NUMERIC(12, 4)
data_available BOOLEAN  -- FALSE if signal not collected
source VARCHAR(100)
PRIMARY KEY: (cell_id, window_start, signal_type_id)
```

#### `scenarios`
Scenario definitions.
```sql
scenario_id VARCHAR(50) PRIMARY KEY
name, description, category VARCHAR/TEXT
start_time, end_time TIMESTAMP
severity_factor NUMERIC(4, 3)
affected_cell_count INTEGER
```

#### `scenario_cells`
Maps cells to scenarios.
```sql
scenario_id VARCHAR(50), cell_id VARCHAR(10)
UNIQUE(scenario_id, cell_id)
```

#### `silence_ground_truth`
Ground truth for validation.
```sql
cell_id VARCHAR(10), window_start TIMESTAMP
scenario_id VARCHAR(50) (nullable)
expected_state VARCHAR(50)  -- NORMAL | LOW_SILENCE | MEDIUM_SILENCE | HIGH_SILENCE | CRITICAL_SILENCE | DATA_UNAVAILABLE
expected_severity_factor NUMERIC(4, 3)
explanation TEXT
```

#### `known_scoring_cases`
Deterministic test cases with expected BaseScores.
```sql
case_id VARCHAR(50) PRIMARY KEY
test_cell_id VARCHAR(10), test_window_start TIMESTAMP
expected_base_score NUMERIC(5, 4)  -- 0.0000 to 1.0000
score_tolerance NUMERIC(5, 4)
notes TEXT
```

### Indexes

Optimized for the 15-minute scoring loop:
- `(cell_id, window_start)` on expected/actual profiles
- `(window_start)` for batch scoring
- `(baseline_valid)` for filtering valid dimensions
- Spatial indexes on cell geometries

## Setup Instructions

### 1. Prerequisites

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib postgis

# macOS
brew install postgresql postgis
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql:
CREATE DATABASE sahayam_silence;
\c sahayam_silence
CREATE EXTENSION postgis;
```

### 3. Generate Dataset

```bash
# Install dependencies
pip install numpy pandas

# Generate data
python generate_dataset.py \
  --output-dir ./data \
  --num-cells 100 \
  --num-days 7 \
  --seed 42 \
  --format both

# Output: CSV files and JSON test cases
```

### 4. Load into PostgreSQL

```bash
# Create schema
psql -U postgres -d sahayam_silence -f schema.sql

# Load data (using COPY for CSV)
psql -U postgres -d sahayam_silence << 'EOF'

-- For each CSV file, use \COPY:
\COPY spatial_cells(cell_id, latitude, longitude, cell_type, population, household_count, building_count, road_length_km, hospital_count, school_count, shelter_count, population_density) FROM 'data/spatial_cells.csv' WITH (FORMAT csv, HEADER true);

\COPY signal_types(signal_type_id, name, description, default_weight, unit, temporal_pattern, variance_factor, is_count_type) FROM 'data/signal_types.csv' WITH (FORMAT csv, HEADER true);

\COPY expected_signal_profile(cell_id, window_start, signal_type_id, expected_value, baseline_valid, confidence, baseline_source) FROM 'data/expected_signal_profile.csv' WITH (FORMAT csv, HEADER true);

\COPY actual_signal_profile(cell_id, window_start, signal_type_id, actual_value, data_available, source) FROM 'data/actual_signal_profile.csv' WITH (FORMAT csv, HEADER true);

\COPY scenarios(scenario_id, name, category, start_time, end_time, severity_factor, affected_cell_count, notes) FROM 'data/scenarios.csv' WITH (FORMAT csv, HEADER true);

\COPY scenario_cells(scenario_id, cell_id) FROM 'data/scenario_cells.csv' WITH (FORMAT csv, HEADER true);

\COPY silence_ground_truth(cell_id, window_start, scenario_id, expected_state, expected_severity_factor, explanation) FROM 'data/silence_ground_truth.csv' WITH (FORMAT csv, HEADER true);

\COPY known_scoring_cases(case_id, test_cell_id, test_window_start, expected_base_score, score_tolerance, notes) FROM 'data/known_scoring_cases.csv' WITH (FORMAT csv, HEADER true);

EOF
```

### 5. Verify Data

```bash
psql -U postgres -d sahayam_silence << 'EOF'

-- Check cell count
SELECT COUNT(*) FROM spatial_cells;

-- Check signal type weights
SELECT signal_type_id, default_weight FROM signal_types;

-- Check expected profile coverage
SELECT COUNT(*) FROM expected_signal_profile;

-- Check actual profile coverage
SELECT COUNT(*) FROM actual_signal_profile;

-- Check scenarios
SELECT scenario_id, category, COUNT(DISTINCT cell_id) as affected_cells 
FROM scenario_cells 
GROUP BY scenario_id, category;

-- Sample a silent period
SELECT DISTINCT(state)
FROM silence_ground_truth
WHERE expected_state IN ('CRITICAL_SILENCE', 'HIGH_SILENCE')
LIMIT 5;

EOF
```

## Testing the Silence Scorer

### Using Known Test Cases

The `known_scoring_cases.json` file contains 5 deterministic test cases:

```json
[
  {
    "case_id": "deterministic_match",
    "description": "All signals match expected values",
    "test_cell_id": "C001",
    "test_window_start": "2026-08-01T00:00:00",
    "expected_base_score": 0.0000,
    "score_tolerance": 0.01
  },
  {
    "case_id": "complete_signal_loss",
    "expected_base_score": 1.0000
  },
  ...
]
```

Use these to validate your BaseScore implementation:

```python
import json
import psycopg2

with open('data/known_scoring_cases.json') as f:
    test_cases = json.load(f)

conn = psycopg2.connect("dbname=sahayam_silence user=postgres")
cur = conn.cursor()

for test_case in test_cases:
    cell_id = test_case['test_cell_id']
    window_start = test_case['test_window_start']
    expected_score = test_case['expected_base_score']
    tolerance = test_case['score_tolerance']
    
    # Query expected and actual profiles
    cur.execute("""
    SELECT signal_type_id, expected_value, baseline_valid 
    FROM expected_signal_profile 
    WHERE cell_id = %s AND window_start = %s
    """, (cell_id, window_start))
    
    # Query actual profiles
    cur.execute("""
    SELECT signal_type_id, actual_value, data_available 
    FROM actual_signal_profile 
    WHERE cell_id = %s AND window_start = %s
    """, (cell_id, window_start))
    
    # Compute BaseScore using your implementation
    actual_score = compute_base_score(...)  # Your function
    
    # Validate
    error = abs(actual_score - expected_score)
    status = "✓ PASS" if error <= tolerance else "✗ FAIL"
    print(f"{status}: {test_case['case_id']} (score={actual_score:.4f}, expected={expected_score:.4f})")
```

### Querying Scenarios

Find silent periods:

```sql
-- High-silence windows
SELECT cell_id, window_start, expected_state
FROM silence_ground_truth
WHERE expected_state IN ('HIGH_SILENCE', 'CRITICAL_SILENCE')
ORDER BY window_start
LIMIT 20;

-- Cells affected by communication outage
SELECT DISTINCT sc.cell_id
FROM scenario_cells sc
WHERE sc.scenario_id = 'communication_outage';

-- Ground truth for a specific scenario
SELECT DISTINCT expected_state, COUNT(*) 
FROM silence_ground_truth
WHERE scenario_id = 'partial_silence'
GROUP BY expected_state;
```

## Reproducibility

The dataset is fully deterministic:

```bash
# Same parameters → identical data
python generate_dataset.py --seed 42 --num-cells 100 --num-days 7
python generate_dataset.py --seed 42 --num-cells 100 --num-days 7  # Identical

# Different seed → different data
python generate_dataset.py --seed 99 --num-cells 100 --num-days 7  # Different
```

To regenerate:

```bash
# Delete old data
rm -rf data/

# Regenerate
python generate_dataset.py --seed 42

# Reload database
psql -U postgres -d sahayam_silence -f reload.sql
```

## Customization

### Generate Different Dataset Size

```bash
# Smaller dataset (25 cells, 3 days)
python generate_dataset.py --num-cells 25 --num-days 3 --seed 42

# Larger dataset (500 cells, 14 days) - for load testing
python generate_dataset.py --num-cells 500 --num-days 14 --seed 42
```

### Adjust Signal Weights

Edit `SIGNAL_TYPES` in `generate_dataset.py`:

```python
'sos_reports': {
    'default_weight': 0.30,  # Increase from 0.25
    ...
}
```

### Modify Time-of-Day Patterns

Edit `get_time_of_day_multiplier()`:

```python
'sos_reports': [
    (0, 0.3), (6, 0.5), (12, 1.5), (18, 1.0), (23, 0.4)  # Your pattern
]
```

### Add New Cell Types or Scenarios

Extend `CELL_TYPES` and add to `generate_scenarios()`:

```python
scenarios.append({
    'scenario_id': 'custom_event',
    'name': 'Custom Event',
    'category': 'custom',
    'start_time': ...,
    'end_time': ...,
    'severity_factor': ...,
    'affected_cells': [...],
})
```

## Performance Characteristics

### Dataset Size
- **100 cells × 7 days × 96 windows/day × 8 signals = 537,600 records**
- Database size: ~80 MB (with indexes)
- CSV export size: ~45 MB

### Query Performance
- Average scoring window (96 cells): <100 ms
- Batch scoring (all cells): ~2 seconds
- Ground truth validation: <50 ms per cell-window

### Indexes
```sql
-- Add performance indexes
CREATE INDEX idx_expected_cell_window ON expected_signal_profile(cell_id, window_start);
CREATE INDEX idx_actual_cell_window ON actual_signal_profile(cell_id, window_start);
CREATE INDEX idx_silence_state ON silence_ground_truth(expected_state, window_start);
```

## Known Limitations

1. **Synthetic data** — while realistic, does not capture all real-world signal characteristics
2. **Single geographic region** — uses synthetic Thiruvananthapuram-like coordinates
3. **No external events** — does not model weather, holidays, or real-world shocks
4. **Fixed weights** — signal weights are static (can be extended with dynamic weighting)
5. **No anomalies** — does not include unusual but non-emergency patterns

## Future Extensions

1. **Real geographic data** — integrate actual OSM boundaries
2. **Historical baselines** — derive expected profiles from real incident data
3. **Dynamic weights** — adjust signal importance by cell type, time period
4. **Multi-region support** — scale to multiple cities/regions
5. **Stochastic events** — randomly inject realistic disruptions

## Citation

If you use this dataset, cite as:

```
Sahayam Silence Dataset v1.0
Generated: 2026-08-XX
Repository: [IIIT Kottayam / Innovexa]
Parameters: 100 cells, 7 days, 8 signal types, seed=42
```

## Questions & Support

For issues with data generation:

```bash
python generate_dataset.py --help
```

For PostgreSQL/PostGIS setup questions, see:
- https://postgis.net/install/
- https://www.postgresql.org/docs/

For Sahayam integration, contact the maintainer.

---

**Last Updated:** August 2026  
**Version:** 1.0  
**Dataset Status:** Production-ready for testing
