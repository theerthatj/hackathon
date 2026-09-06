from fastapi import APIRouter
from app.db import get_db

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.get("")
def get_scenarios():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT scenario_id as id, name as label, description, start_time as window, category
                FROM scenarios
                ORDER BY start_time
                """
            )
            rows = cur.fetchall()
            return [
                {
                    "id": r["id"],
                    "label": r["label"],
                    "description": r["description"],
                    "window": r["window"].isoformat() if r["window"] else None,
                    "category": r["category"],
                }
                for r in rows
            ]
