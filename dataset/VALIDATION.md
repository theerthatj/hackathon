# Sahayam — Scorer Validation Report

> **Empirical Validation of the Weighted-Deficit Silence Scorer**  
> Evaluated on 100 Wayanad spatial cells, 537k telemetry profiles, and 67k ground-truth records.

- **Scorer Version**: `wd-1.0`
- **Dataset Hash**: `187a900738bb375a`
- **Selected Optimal Alert Band**: **`0.75` (75%)** with F1 = `0.476`

---

## 1. Precision-Recall & Confounder Sweep

The scorer must distinguish genuine disaster dark zones from infrastructure outages and low-population night baselines. Below is the empirical threshold sweep:

| Score Threshold | Precision | Recall | F1 Score | Confounder False-Alarm Rate |
|---|---|---|---|---|
| `0.30` (30%) | 0.113 | 0.781 | **0.197** | 33.3% |
| `0.35` (35%) | 0.131 | 0.750 | **0.223** | 20.0% |
| `0.40` (40%) | 0.162 | 0.719 | **0.264** | 13.3% |
| `0.45` (45%) | 0.165 | 0.656 | **0.264** | 13.3% |
| `0.50` (50%) | 0.200 | 0.625 | **0.303** | 13.3% |
| `0.55` (55%) | 0.232 | 0.500 | **0.317** | 6.7% |
| `0.60` (60%) | 0.349 | 0.469 | **0.400** | 6.7% |
| `0.65` (65%) | 0.433 | 0.406 | **0.419** | 6.7% |
| `0.70` (70%) | 0.550 | 0.344 | **0.423** | 6.7% |
| `0.75` (75%) | 1.000 | 0.312 | **0.476** | 0.0% 🎯 (Selected) |
| `0.80` (80%) | 1.000 | 0.312 | **0.476** | 0.0% |
| `0.85` (85%) | 1.000 | 0.312 | **0.476** | 0.0% |
| `0.90` (90%) | 1.000 | 0.250 | **0.400** | 0.0% |

---

## 2. Confounder Suppression & Robustness

A critical vulnerability in disaster telemetry is raising false alarms during scheduled cellular maintenance or tower power cuts. Sahayam handles this via multi-signal baseline validity checks:

1. **Tower Outage Suppression**: In pure communication and network outages, missing telemetry is labeled as `unavailable` rather than a population dark zone, keeping the false-positive rate on confounders below 5%.
2. **Rural Off-Peak Suppression**: When baseline expected activity is low ($< 0.05$), the dimension is labeled as `low_baseline` and excluded from deficit scoring to prevent false alarms in remote forest reaches.

---

## 3. Operational Deployment Recommendation

- **Routine Operations**: Deficit $< 60\%$
- **Advisory / Warning Band**: $60\% - 75\%$
- **Incident Critical Action**: $\ge 75\%$ (triggers immediate volunteer courier dispatch)
