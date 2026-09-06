"""
Authoritative weighted-deficit silence scorer for Sahayam.
Pure functions, zero database or network I/O.
"""

from typing import Any, TypedDict

SCORER_VERSION = "wd-1.0"

# Fallback default weights from dataset/data/signal_types.csv
DEFAULT_SIGNAL_WEIGHTS = {
    "sos_reports": 0.25,
    "incident_reports": 0.15,
    "volunteer_reports": 0.10,
    "medical_requests": 0.20,
    "shelter_checkins": 0.10,
    "infrastructure_reports": 0.08,
    "mobility_signal": 0.07,
    "communication_signal": 0.05,
}


class SignalBreakdown(TypedDict):
    expected: float
    actual: float
    deficit_pct: int
    status: str  # 'active' | 'unavailable' | 'low_baseline'


class CellScore(TypedDict):
    score: float       # 0.0000 - 1.0000
    score_pct: int     # 0 - 100
    confidence: float  # 0.000 - 1.000
    breakdown: dict[str, SignalBreakdown]
    scorer_version: str


def score_cell(
    rows: list[dict[str, Any]],
    weights: dict[str, float] | None = None,
) -> CellScore:
    """
    Computes weighted silence deficit across multiple signal dimensions for a single cell and window.

    rows item structure:
      - signal_type_id: str
      - expected_value: float
      - actual_value: float
      - baseline_valid: bool
      - data_available: bool
      - weight: float (optional, uses weights map if missing)
    """
    effective_weights = weights or DEFAULT_SIGNAL_WEIGHTS

    valid_deficits: list[float] = []
    valid_weights: list[float] = []
    all_weights: list[float] = []
    breakdown: dict[str, SignalBreakdown] = {}

    for row in rows:
        stype = str(row["signal_type_id"])
        exp = float(row.get("expected_value", 0.0))
        act = float(row.get("actual_value", 0.0))
        b_valid = bool(row.get("baseline_valid", True))
        d_avail = bool(row.get("data_available", True))
        w = float(row.get("weight", effective_weights.get(stype, 0.1)))

        all_weights.append(w)

        if not b_valid or exp < 0.05 or not d_avail:
            breakdown[stype] = {
                "expected": round(exp, 1),
                "actual": round(act, 1),
                "deficit_pct": 0,
                "status": "unavailable" if not d_avail else "low_baseline",
            }
            continue

        cov = act / exp if exp > 0 else 0.0
        deficit = max(0.0, min(1.0, 1.0 - cov))
        valid_deficits.append(deficit)
        valid_weights.append(w)
        breakdown[stype] = {
            "expected": round(exp, 1),
            "actual": round(act, 1),
            "deficit_pct": int(round(deficit * 100)),
            "status": "active",
        }

    sum_valid = sum(valid_weights)
    sum_all = sum(all_weights)

    if valid_weights and sum_valid > 0:
        score = sum(d * w for d, w in zip(valid_deficits, valid_weights)) / sum_valid
    else:
        score = 0.0

    confidence = (sum_valid / sum_all) if sum_all > 0 else 0.0
    clamped_score = max(0.0, min(1.0, score))

    return {
        "score": round(clamped_score, 4),
        "score_pct": int(round(clamped_score * 100)),
        "confidence": round(max(0.0, min(1.0, confidence)), 3),
        "breakdown": breakdown,
        "scorer_version": SCORER_VERSION,
    }
