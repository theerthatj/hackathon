import json
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.db import get_db

router = APIRouter(prefix="/api/scores", tags=["scores"])


@router.get("")
def get_scores(
    scenario: str = Query("severe_silence", description="Scenario ID"),
    window: Optional[str] = Query(None, description="Optional window timestamp"),
):
    with get_db() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT 
                    s.cell_id as "cellId",
                    s.score,
                    ROUND(s.score * 100) as "scorePct",
                    s.confidence,
                    s.breakdown,
                    s.window_start as "windowStart",
                    c.population
                FROM silence_scores s
                JOIN spatial_cells c ON s.cell_id = c.cell_id
                WHERE s.scenario_id = %s
            """
            params = [scenario]
            if window:
                query += " AND s.window_start = %s"
                params.append(window)

            query += " ORDER BY s.score DESC"
            cur.execute(query, params)
            rows = cur.fetchall()

            results = []
            for r in rows:
                breakdown = r["breakdown"] if isinstance(r["breakdown"], dict) else json.loads(r["breakdown"])
                # Extract aggregated summary metrics
                exp_sum = sum(b.get("expected", 0) for b in breakdown.values())
                act_sum = sum(b.get("actual", 0) for b in breakdown.values())
                results.append({
                    "cellId": r["cellId"],
                    "score": float(r["score"]),
                    "scorePct": int(r["scorePct"]),
                    "confidence": float(r["confidence"]),
                    "reportsExpected": round(exp_sum, 1),
                    "reportsObserved": round(act_sum, 1),
                    "lastSignal": "12m ago" if act_sum > 0 else "No signal",
                    "population": r["population"],
                    "windowStart": r["windowStart"].isoformat() if r["windowStart"] else None,
                })
            return results


@router.get("/{cell_id}/breakdown")
def get_cell_breakdown(
    cell_id: str,
    scenario: str = Query("severe_silence", description="Scenario ID"),
):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT cell_id, scenario_id, score, confidence, breakdown, scorer_version, computed_at
                FROM silence_scores
                WHERE cell_id = %s AND scenario_id = %s
                """,
                (cell_id, scenario),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"No scores found for cell {cell_id} in scenario {scenario}")

            breakdown = row["breakdown"] if isinstance(row["breakdown"], dict) else json.loads(row["breakdown"])
            return {
                "cellId": row["cell_id"],
                "scenarioId": row["scenario_id"],
                "score": float(row["score"]),
                "scorePct": int(round(float(row["score"]) * 100)),
                "confidence": float(row["confidence"]),
                "breakdown": breakdown,
                "scorerVersion": row["scorer_version"],
                "computedAt": row["computed_at"].isoformat() if row["computed_at"] else None,
            }
