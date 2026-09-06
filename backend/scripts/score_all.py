"""
Precomputes silence_scores for all scenarios and spatial cells.
Idempotent and append-only per scorer_version.
"""

import json
import psycopg
from psycopg.rows import dict_row
from app.settings import settings
from app.scoring import score_cell, SCORER_VERSION


def score_all():
    print(f"Connecting to DB for scoring: {settings.DATABASE_URL}")
    with psycopg.connect(settings.DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # 1. Fetch signal weights
            cur.execute("SELECT signal_type_id, default_weight FROM signal_types")
            weights = {row["signal_type_id"]: float(row["default_weight"]) for row in cur.fetchall()}

            # 2. Fetch scenarios
            cur.execute("SELECT scenario_id, start_time FROM scenarios")
            scenarios = cur.fetchall()
            print(f"Found {len(scenarios)} scenarios to score.")

            total_inserted = 0

            for sc in scenarios:
                sc_id = sc["scenario_id"]
                window = sc["start_time"]

                # Fetch merged expected and actual rows for this window
                cur.execute(
                    """
                    SELECT 
                        e.cell_id,
                        e.signal_type_id,
                        e.expected_value,
                        e.baseline_valid,
                        a.actual_value,
                        a.data_available
                    FROM expected_signal_profile e
                    JOIN actual_signal_profile a 
                      ON e.cell_id = a.cell_id 
                     AND e.window_start = a.window_start 
                     AND e.signal_type_id = a.signal_type_id
                    WHERE e.window_start = %s
                    ORDER BY e.cell_id
                    """,
                    (window,),
                )
                rows = cur.fetchall()

                # Group by cell_id
                cells_data: dict[str, list[dict]] = {}
                for r in rows:
                    cid = r["cell_id"]
                    if cid not in cells_data:
                        cells_data[cid] = []
                    cells_data[cid].append(r)

                print(f"Scenario '{sc_id}' ({window}): scoring {len(cells_data)} cells...")

                score_records = []
                for cid, cell_rows in cells_data.items():
                    result = score_cell(cell_rows, weights)
                    score_records.append((
                        cid,
                        window,
                        sc_id,
                        result["score"],
                        result["confidence"],
                        json.dumps(result["breakdown"]),
                        SCORER_VERSION,
                    ))

                # Batch upsert into silence_scores
                cur.executemany(
                    """
                    INSERT INTO silence_scores (
                        cell_id, window_start, scenario_id, score, confidence, breakdown, scorer_version
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (cell_id, window_start, scenario_id, scorer_version)
                    DO UPDATE SET 
                        score = EXCLUDED.score,
                        confidence = EXCLUDED.confidence,
                        breakdown = EXCLUDED.breakdown,
                        computed_at = CURRENT_TIMESTAMP
                    """,
                    score_records,
                )
                total_inserted += len(score_records)

        conn.commit()
        print(f"Scoring complete! Processed and stored {total_inserted} cell scores.")


if __name__ == "__main__":
    score_all()
