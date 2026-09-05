# Sahayam Silence Scorer — Implementation Guide

This guide explains how to implement and validate the **Silence Scorer** using the generated dataset.

## Core Algorithm

The Silence Scorer computes a single metric per cell-window indicating how "silent" (signal-deprived) a geographic area has become.

### BaseScore Formula

For a given cell during a 15-minute scoring window:

```python
def compute_base_score(
    cell_id: str,
    window_start: datetime,
    expected_profile: Dict[str, float],  # {signal_type: expected_value}
    actual_profile: Dict[str, float],    # {signal_type: actual_value}
    baseline_valid: Dict[str, bool],     # {signal_type: is_valid}
    data_available: Dict[str, bool],     # {signal_type: was_collected}
    weights: Dict[str, float],           # {signal_type: weight}
    min_baseline_threshold: float = 0.05,
) -> float:
    """
    Compute silence score for a cell during a window.
    
    Returns:
        score: float in [0.0, 1.0]
        0.0 = no silence (normal operation)
        1.0 = complete silence (all signals lost)
    """
    
    valid_deficits = []
    valid_weights = []
    
    for signal_type in expected_profile.keys():
        expected = expected_profile[signal_type]
        actual = actual_profile.get(signal_type, 0.0)
        
        # Check baseline validity
        is_valid = baseline_valid.get(signal_type, False)
        
        if not is_valid or expected < min_baseline_threshold:
            # Cannot score this dimension; skip it
            continue
        
        # Check data availability
        if not data_available.get(signal_type, False):
            # Signal was not collected; skip it
            continue
        
        # Compute coverage and deficit
        if expected > 0:
            coverage = actual / expected
        else:
            coverage = 0.0
        
        # Deficit: how much coverage is missing (capped at 0)
        deficit = max(0.0, 1.0 - coverage)
        
        valid_deficits.append(deficit)
        valid_weights.append(weights[signal_type])
    
    # Weighted average of valid deficits
    if len(valid_weights) == 0:
        # No valid dimensions; cannot score
        return 0.0  # or raise exception
    
    total_weight = sum(valid_weights)
    if total_weight == 0:
        return 0.0
    
    weighted_sum = sum(d * w for d, w in zip(valid_deficits, valid_weights))
    base_score = weighted_sum / total_weight
    
    return min(1.0, max(0.0, base_score))
```

### Key Implementation Details

**1. Baseline Validity**

Not all signal dimensions have a meaningful baseline at all times.

- If `expected_value < 0.05`, the signal is too rare to be meaningful
- The `baseline_valid` column indicates whether a baseline exists
- Dimensions without valid baselines are excluded from the denominator

```python
# CORRECT: Only sum weights for valid dimensions
total_weight = sum(w for s, w in weights.items() if baseline_valid[s])

# WRONG: This causes artificially low scores when some signals are missing
total_weight = sum(weights.values())
```

**2. Data Availability**

Distinguish between "no signal collected" and "signal is zero".

```python
# Case A: Signal was not collected (e.g., network outage)
data_available = False
# → Exclude from scoring entirely
# → Do NOT treat as actual_value = 0

# Case B: Signal was collected and is zero
data_available = True
actual_value = 0.0
# → Include in deficit calculation
# → deficit = max(0, 1 - 0/expected) = 1.0
```

**3. Excess Activity**

When actual > expected, deficit is capped at 0.

```python
expected = 10
actual = 15
coverage = 15 / 10 = 1.5
deficit = max(0, 1 - 1.5) = max(0, -0.5) = 0.0
# High activity does NOT increase silence score
```

**4. Weight Normalization**

Weights are stored as raw values (not probabilities), so normalize:

```python
# CORRECT
total_weight = sum(valid_weights)
base_score = sum(deficit * weight for ...) / total_weight

# WRONG (assumes weights sum to 1)
base_score = sum(deficit * weight for ...)
```

## Testing Implementation

### Test Case 1: Deterministic Match

**Scenario:** All actual values equal expected values.

**Expected:** BaseScore = 0.0

**Cell:** C002  
**Window:** 2026-08-01 00:00 UTC

```sql
-- Verify test data
SELECT 
    e.signal_type_id,
    e.expected_value,
    a.actual_value,
    e.baseline_valid,
    a.data_available
FROM expected_signal_profile e
JOIN actual_signal_profile a 
    ON e.cell_id = a.cell_id 
    AND e.window_start = a.window_start 
    AND e.signal_type_id = a.signal_type_id
WHERE e.cell_id = 'C002'
  AND e.window_start = '2026-08-01 00:00:00'
ORDER BY e.signal_type_id;
```

**Calculation:**

```
For all signals: coverage = actual / expected = 1.0
                 deficit = max(0, 1 - 1.0) = 0.0

BaseScore = Σ(weight × 0.0) / Σ(weight) = 0.0
```

### Test Case 2: Complete Signal Loss

**Scenario:** All actual values are zero during a disaster.

**Expected:** BaseScore ≈ 1.0

**Cell:** C001  
**Window:** 2026-08-04 10:00 UTC (during complete_silence scenario)

```sql
-- Verify test data
SELECT 
    e.signal_type_id,
    e.expected_value,
    a.actual_value,
    e.baseline_valid,
    a.data_available,
    st.default_weight
FROM expected_signal_profile e
JOIN actual_signal_profile a 
    ON e.cell_id = a.cell_id 
    AND e.window_start = a.window_start 
    AND e.signal_type_id = a.signal_type_id
JOIN signal_types st ON e.signal_type_id = st.signal_type_id
WHERE e.cell_id = 'C001'
  AND e.window_start = '2026-08-04 10:00:00'
  AND e.baseline_valid = true
ORDER BY e.signal_type_id;
```

**Calculation:**

```
For all signals with valid baseline:
    actual = 0, expected > 0
    coverage = 0 / expected = 0.0
    deficit = max(0, 1 - 0.0) = 1.0

BaseScore = Σ(weight × 1.0) / Σ(weight) = 1.0
```

### Test Case 3: Partial Deficit

**Scenario:** 40% reduction in actual signals (severity_factor = 0.4).

**Expected:** BaseScore ≈ 0.4-0.5

**Cell:** C001  
**Window:** 2026-08-02 12:00 UTC (during partial_silence scenario)

```
Coverage ≈ 0.4 (since actual ≈ 0.4 × expected)
Deficit ≈ max(0, 1 - 0.4) = 0.6

BaseScore ≈ 0.6, but with variance due to signal-specific noise
Expected range: [0.4, 0.5]
```

### Test Case 4: Low Baseline Handling

**Scenario:** Rural cell with naturally low expected signals.

**Expected:** BaseScore ≈ 0.0 (not flagged as silent)

**Cell:** C029  
**Window:** 2026-08-03 03:00 UTC

```python
# Many signals will have baseline_valid = False because:
# expected_value < 0.05 during low-activity window

# Only dimensions with baseline_valid = True are scored
# If most dimensions are invalid, base_score stays low
# → No false alarm for naturally low-activity areas
```

### Test Case 5: Increased Activity

**Scenario:** Actual signals exceed expected (80% increase).

**Expected:** BaseScore = 0.0 (high activity not penalized)

**Cell:** C001  
**Window:** 2026-08-07 11:00 UTC (during increased_activity scenario)

```
For signals: actual > expected
            coverage > 1.0
            deficit = max(0, 1 - coverage) = max(0, negative) = 0.0

BaseScore = Σ(weight × 0.0) / Σ(weight) = 0.0
```

## Integration with Sahayam

### 1. Real-Time Scoring Loop

Every 15 minutes:

```python
def run_silence_scorer(window_start: datetime, db_conn):
    """
    Execute silence scoring for all cells in a window.
    """
    
    cells = db_conn.query("SELECT cell_id FROM spatial_cells")
    signals = db_conn.query("SELECT signal_type_id, default_weight FROM signal_types")
    
    results = []
    
    for cell_id in cells:
        # Query expected profiles
        expected_row = db_conn.query("""
        SELECT signal_type_id, expected_value, baseline_valid
        FROM expected_signal_profile
        WHERE cell_id = %s AND window_start = %s
        """, (cell_id, window_start))
        
        # Query actual profiles
        actual_row = db_conn.query("""
        SELECT signal_type_id, actual_value, data_available
        FROM actual_signal_profile
        WHERE cell_id = %s AND window_start = %s
        """, (cell_id, window_start))
        
        # Compute BaseScore
        base_score = compute_base_score(
            expected=dict(expected_row),
            actual=dict(actual_row),
            weights=dict(signals),
        )
        
        results.append({
            'cell_id': cell_id,
            'window_start': window_start,
            'base_score': base_score,
            'severity': classify_severity(base_score),
        })
    
    return results
```

### 2. Severity Classification

```python
def classify_severity(base_score: float) -> str:
    """
    Convert BaseScore to human-readable severity level.
    """
    if base_score < 0.15:
        return 'NORMAL'
    elif base_score < 0.30:
        return 'MINOR'
    elif base_score < 0.50:
        return 'MODERATE'
    elif base_score < 0.75:
        return 'SEVERE'
    else:
        return 'CRITICAL'
```

### 3. Spatial Analysis

Detect geographic clusters:

```python
def detect_silence_clusters(
    window_start: datetime,
    base_scores: Dict[str, float],
    severity_threshold: float = 0.50,
    proximity_threshold_km: float = 5.0,
) -> List[Cluster]:
    """
    Find spatially adjacent cells with high silence scores.
    """
    
    # Find high-score cells
    affected = [
        cell_id for cell_id, score in base_scores.items()
        if score >= severity_threshold
    ]
    
    if not affected:
        return []
    
    # Cluster by proximity
    clusters = []
    visited = set()
    
    for seed_cell in affected:
        if seed_cell in visited:
            continue
        
        # BFS to find connected cells
        cluster = set()
        queue = [seed_cell]
        
        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            
            visited.add(current)
            cluster.add(current)
            
            # Find neighbors within threshold
            neighbors = get_nearby_cells(current, proximity_threshold_km)
            for neighbor in neighbors:
                if neighbor not in visited and neighbor in affected:
                    queue.append(neighbor)
        
        if len(cluster) > 1:
            clusters.append({
                'cells': list(cluster),
                'severity': max(base_scores[c] for c in cluster),
                'window_start': window_start,
            })
    
    return clusters
```

### 4. Time-Series Analysis

Detect escalation:

```python
def detect_escalation(
    cell_id: str,
    scores: List[float],
    window_size: int = 12,  # 3 hours (12 × 15 min)
    escalation_threshold: float = 0.30,
) -> bool:
    """
    Detect if silence is increasing over time.
    """
    
    if len(scores) < window_size:
        return False
    
    # Compare recent to baseline
    baseline = np.median(scores[:-window_size])
    recent = np.median(scores[-window_size:])
    
    escalation = recent - baseline
    
    return escalation > escalation_threshold
```

## Validation Queries

### Ground Truth Comparison

```sql
-- Compare computed scores to ground truth
SELECT 
    gt.cell_id,
    gt.window_start,
    gt.expected_state,
    gt.expected_severity_factor,
    -- Assume scores computed in a scores_result table
    sr.computed_base_score,
    (sr.computed_base_score - gt.expected_severity_factor) as error
FROM silence_ground_truth gt
LEFT JOIN scores_result sr 
    ON gt.cell_id = sr.cell_id 
    AND gt.window_start = sr.window_start
WHERE ABS(sr.computed_base_score - gt.expected_severity_factor) > 0.1
ORDER BY ABS(sr.computed_base_score - gt.expected_severity_factor) DESC
LIMIT 100;
```

### Scenario Coverage

```sql
-- Verify all scenarios are represented
SELECT 
    s.scenario_id,
    s.category,
    COUNT(DISTINCT sc.cell_id) as affected_cells,
    COUNT(DISTINCT gt.window_start) as windows,
    COUNT(*) as records
FROM scenarios s
LEFT JOIN scenario_cells sc ON s.scenario_id = sc.scenario_id
LEFT JOIN silence_ground_truth gt 
    ON gt.scenario_id = s.scenario_id
GROUP BY s.scenario_id, s.category
ORDER BY s.scenario_id;
```

### Baseline Validity Analysis

```sql
-- Check how many dimensions are valid at different times
SELECT 
    EXTRACT(HOUR FROM window_start) as hour_of_day,
    COUNT(DISTINCT cell_id) as cells,
    COUNT(*) FILTER (WHERE baseline_valid = true) as valid_records,
    ROUND(100.0 * COUNT(*) FILTER (WHERE baseline_valid = true) / NULLIF(COUNT(*), 0), 1) as pct_valid
FROM expected_signal_profile
GROUP BY EXTRACT(HOUR FROM window_start)
ORDER BY hour_of_day;
```

## Performance Optimization

### Index Strategy

```sql
-- Critical indexes for scoring loop
CREATE INDEX idx_expected_score_query 
ON expected_signal_profile(cell_id, window_start)
INCLUDE (signal_type_id, expected_value, baseline_valid);

CREATE INDEX idx_actual_score_query 
ON actual_signal_profile(cell_id, window_start)
INCLUDE (signal_type_id, actual_value, data_available);

-- For batch processing
CREATE INDEX idx_window_window_start 
ON expected_signal_profile(window_start, cell_id);
```

### Materialized Views

Pre-compute scores if data is available after window close:

```sql
CREATE MATERIALIZED VIEW silence_scores AS
WITH scored_windows AS (
    SELECT 
        e.cell_id,
        e.window_start,
        -- (Computed BaseScore inserted here)
        base_score,
        CASE 
            WHEN base_score < 0.15 THEN 'NORMAL'
            WHEN base_score < 0.30 THEN 'MINOR'
            WHEN base_score < 0.50 THEN 'MODERATE'
            WHEN base_score < 0.75 THEN 'SEVERE'
            ELSE 'CRITICAL'
        END as severity
    FROM expected_signal_profile e
    -- (Joining with actual, computing...)
)
SELECT * FROM scored_windows;

REFRESH MATERIALIZED VIEW silence_scores;
```

## Debugging & Validation

### Check a Specific Window

```sql
-- Debug a specific cell-window combination
SELECT 
    s.signal_type_id,
    s.default_weight,
    e.expected_value,
    a.actual_value,
    e.baseline_valid,
    a.data_available,
    CASE 
        WHEN NOT e.baseline_valid THEN 'invalid_baseline'
        WHEN NOT a.data_available THEN 'no_data'
        ELSE ROUND(a.actual_value::numeric / NULLIF(e.expected_value, 0), 3)::text
    END as coverage,
    CASE 
        WHEN NOT e.baseline_valid THEN 0.0
        WHEN NOT a.data_available THEN 0.0
        ELSE ROUND(MAX(0, 1 - a.actual_value::numeric / NULLIF(e.expected_value, 1))::numeric, 3)
    END as deficit
FROM signal_types s
FULL OUTER JOIN expected_signal_profile e 
    ON e.signal_type_id = s.signal_type_id
    AND e.cell_id = 'C001'
    AND e.window_start = '2026-08-01 00:00:00'
FULL OUTER JOIN actual_signal_profile a 
    ON a.signal_type_id = s.signal_type_id
    AND a.cell_id = 'C001'
    AND a.window_start = '2026-08-01 00:00:00'
ORDER BY s.signal_type_id;
```

### Validate Known Test Cases

```python
import json
import pandas as pd

# Load test cases
with open('data/known_scoring_cases.json') as f:
    test_cases = json.load(f)

# Load expected profiles
expected = pd.read_csv('data/expected_signal_profile.csv')
actual = pd.read_csv('data/actual_signal_profile.csv')

for test in test_cases:
    cell = test['test_cell_id']
    window = pd.Timestamp(test['test_window_start'])
    
    exp_data = expected[(expected['cell_id'] == cell) & 
                        (expected['window_start'] == str(window))]
    act_data = actual[(actual['cell_id'] == cell) & 
                      (actual['window_start'] == str(window))]
    
    # Compute score
    computed = compute_base_score(exp_data, act_data)
    expected_score = test['expected_base_score']
    tolerance = test['score_tolerance']
    
    error = abs(computed - expected_score)
    status = '✓' if error <= tolerance else '✗'
    
    print(f"{status} {test['case_id']}: {computed:.4f} "
          f"(expected {expected_score:.4f} ±{tolerance:.4f})")
```

## Common Pitfalls

| Mistake | Impact | Fix |
|---------|--------|-----|
| Treating missing data as zero | False positives in system failures | Check `data_available` flag first |
| Not excluding low baselines | False alarms in naturally quiet areas | Validate `baseline_valid` before scoring |
| Using all signal weights in denominator | Artificially low scores when data missing | Sum only valid signal weights |
| Not capping deficit at zero | Penalizing high activity | Use `max(0, 1 - coverage)` |
| Using static expected profiles | Score drift over time | Update baselines regularly |
| Ignoring spatial correlation | Missing disaster clusters | Implement spatial analysis |
| Single-window decisions | Noise artifacts | Use time-series smoothing |

---

**Next Steps:**

1. Implement `compute_base_score()` using this formula
2. Test against known test cases (data/known_scoring_cases.json)
3. Validate against ground truth (silence_ground_truth.csv)
4. Integrate real expected/actual data sources
5. Deploy scoring loop every 15 minutes
6. Monitor for false positives/negatives
7. Iterate on weights and thresholds
