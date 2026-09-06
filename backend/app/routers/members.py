from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.db import get_db
from app.routers.auth import UserProfile, require_role

router = APIRouter(prefix="/api/members", tags=["members"])


class UpdateStatusPayload(BaseModel):
    status: str
    campName: Optional[str] = None


@router.get("/by-qr/{token}")
def get_member_by_qr(
    token: str,
    user: UserProfile = Depends(require_role("volunteer", "admin")),
):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 
                    m.id, m.household_id as "householdId", m.name, m.age, m.gender,
                    m.blood_group as "bloodGroup", m.conditions, m.medication, m.disability,
                    m.is_elderly as "isElderly", m.is_pregnant as "isPregnant",
                    m.is_infant as "isInfant", m.is_bedridden as "isBedridden",
                    m.emergency_contact as "emergencyContact", m.qr_token as "qrToken",
                    m.status, m.camp_name as "campName", m.registered_at as "registeredAt",
                    h.name as "householdName", h.ward, h.cell_id as "cellId"
                FROM members m
                JOIN households h ON m.household_id = h.id
                WHERE m.qr_token = %s
                """,
                (token,),
            )
            member = cur.fetchone()
            if not member:
                raise HTTPException(status_code=404, detail=f"Member not found for QR token: {token}")

            return {
                **member,
                "registeredAt": member["registeredAt"].isoformat() if member["registeredAt"] else None,
            }


@router.patch("/{id}/status")
def update_member_status(
    id: str,
    payload: UpdateStatusPayload,
    user: UserProfile = Depends(require_role("volunteer", "admin")),
):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE members 
                SET status = %s, camp_name = COALESCE(%s, camp_name)
                WHERE id = %s
                RETURNING id, name, status, camp_name as "campName"
                """,
                (payload.status, payload.campName, id),
            )
            updated = cur.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail=f"Member not found: {id}")
        conn.commit()
    return updated
