from pathlib import Path
import pandas as pd
import pytest
from app.scoring import score_cell, SCORER_VERSION, DEFAULT_SIGNAL_WEIGHTS

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "dataset" / "data"


class TestScoring:
    def test_scorer_version(self):
        assert SCORER_VERSION == "wd-1.0"

    def test_deterministic_exact_match(self):
        # Case 1: When actual == expected, deficit is 0.0 for all valid dimensions
        rows = [
            {"signal_type_id": "sos_reports", "expected_value": 10.0, "actual_value": 10.0, "baseline_valid": True, "data_available": True},
            {"signal_type_id": "incident_reports", "expected_value": 5.0, "actual_value": 5.0, "baseline_valid": True, "data_available": True},
            {"signal_type_id": "medical_requests", "expected_value": 8.0, "actual_value": 8.0, "baseline_valid": True, "data_available": True},
        ]
        result = score_cell(rows)
        assert result["score"] == 0.0
        assert result["score_pct"] == 0
        assert result["confidence"] > 0.0
        for b in result["breakdown"].values():
            assert b["deficit_pct"] == 0
            assert b["status"] == "active"

    def test_complete_signal_loss(self):
        # Case 2: When actual == 0, deficit is 1.0
        rows = [
            {"signal_type_id": "sos_reports", "expected_value": 20.0, "actual_value": 0.0, "baseline_valid": True, "data_available": True},
            {"signal_type_id": "incident_reports", "expected_value": 10.0, "actual_value": 0.0, "baseline_valid": True, "data_available": True},
        ]
        result = score_cell(rows)
        assert result["score"] == 1.0
        assert result["score_pct"] == 100
        for b in result["breakdown"].values():
            assert b["deficit_pct"] == 100
            assert b["status"] == "active"

    def test_partial_deficit(self):
        # Case 3: 50% signal reduction -> score ~ 0.50
        rows = [
            {"signal_type_id": "sos_reports", "expected_value": 10.0, "actual_value": 5.0, "baseline_valid": True, "data_available": True},
            {"signal_type_id": "incident_reports", "expected_value": 10.0, "actual_value": 5.0, "baseline_valid": True, "data_available": True},
        ]
        result = score_cell(rows)
        assert abs(result["score"] - 0.50) < 1e-4
        assert result["score_pct"] == 50

    def test_low_baseline_exclusion(self):
        # Case 4: Low baseline (<0.05 or baseline_valid=False) is excluded from scoring
        rows = [
            {"signal_type_id": "sos_reports", "expected_value": 0.01, "actual_value": 0.0, "baseline_valid": False, "data_available": True},
            {"signal_type_id": "incident_reports", "expected_value": 0.02, "actual_value": 0.0, "baseline_valid": True, "data_available": True},
            {"signal_type_id": "medical_requests", "expected_value": 10.0, "actual_value": 10.0, "baseline_valid": True, "data_available": True},
        ]
        result = score_cell(rows)
        # sos_reports and incident_reports excluded due to low baseline, only medical_requests scored
        assert result["score"] == 0.0
        assert result["breakdown"]["sos_reports"]["status"] == "low_baseline"
        assert result["breakdown"]["incident_reports"]["status"] == "low_baseline"
        assert result["breakdown"]["medical_requests"]["status"] == "active"

    def test_increased_activity_excess(self):
        # Case 5: Actual > Expected gives deficit = 0 (capped at 0)
        rows = [
            {"signal_type_id": "sos_reports", "expected_value": 10.0, "actual_value": 25.0, "baseline_valid": True, "data_available": True},
            {"signal_type_id": "incident_reports", "expected_value": 5.0, "actual_value": 12.0, "baseline_valid": True, "data_available": True},
        ]
        result = score_cell(rows)
        assert result["score"] == 0.0
        assert result["score_pct"] == 0
        for b in result["breakdown"].values():
            assert b["deficit_pct"] == 0

    def test_data_unavailable_exclusion(self):
        # When data was not collected, status is 'unavailable' and excluded from scoring
        rows = [
            {"signal_type_id": "sos_reports", "expected_value": 10.0, "actual_value": 0.0, "baseline_valid": True, "data_available": False},
            {"signal_type_id": "medical_requests", "expected_value": 10.0, "actual_value": 10.0, "baseline_valid": True, "data_available": True},
        ]
        result = score_cell(rows)
        assert result["score"] == 0.0
        assert result["breakdown"]["sos_reports"]["status"] == "unavailable"

    def test_dataset_known_cases_execution(self):
        # Verify execution against actual database / CSV profiles
        exp_df = pd.read_csv(DATA_DIR / "expected_signal_profile.csv")
        act_df = pd.read_csv(DATA_DIR / "actual_signal_profile.csv")
        weights_df = pd.read_csv(DATA_DIR / "signal_types.csv")
        weights = weights_df.set_index("signal_type_id")["default_weight"].to_dict()

        cases_df = pd.read_csv(DATA_DIR / "known_scoring_cases.csv")
        for _, c in cases_df.iterrows():
            cid = c["test_cell_id"]
            win = c["test_window_start"]
            exp_sub = exp_df[(exp_df["cell_id"] == cid) & (exp_df["window_start"] == win)]
            act_sub = act_df[(act_df["cell_id"] == cid) & (act_df["window_start"] == win)]
            merged = pd.merge(exp_sub, act_sub, on=["cell_id", "window_start", "signal_type_id"])
            res = score_cell(merged.to_dict("records"), weights)
            assert 0.0 <= res["score"] <= 1.0
            assert 0.0 <= res["confidence"] <= 1.0
            assert len(res["breakdown"]) == len(weights)
