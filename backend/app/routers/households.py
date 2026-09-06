from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.db import get_db
from app.routers.auth import UserProfile, require_role

router = APIRouter(prefix="/api/households", tags=["households"])


class CreateMemberPayload(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    bloodGroup: Optional[str] = None
    conditions: Optional[str] = None
    medication: Optional[str] = None
    disability: Optional[str] = None
    isElderly: bool = False
    isPregnant: bool = False
    isInfant: bool = False
    isBedridden: bool = False
    emergencyContact: Optional[str] = None
    qrToken: Optional[str] = None
    status: str = "ACTIVE"
    campName: Optional[str] = None


class CreateHouseholdPayload(BaseModel):
    id: Optional[str] = None
    name: str
    head: str
    ward: Optional[str] = None
    cellId: Optional[str] = "C001"
    contact: Optional[str] = None
    members: list[CreateMemberPayload] = []


@router.get("")
def get_households(user: UserProfile = Depends(require_role("volunteer", "admin"))):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, head, ward, cell_id as "cellId", contact, registered_at as "registeredAt"
                FROM households
                ORDER BY name
                """
            )
            households = cur.fetchall()

            cur.execute(
                """
                SELECT 
                    id, household_id as "householdId", name, age, gender, blood_group as "bloodGroup",
                    conditions, medication, disability, is_elderly as "isElderly", is_pregnant as "isPregnant",
                    is_infant as "isInfant", is_bedridden as "isBedridden", emergency_contact as "emergencyContact",
                    qr_token as "qrToken", status, camp_name as "campName", registered_at as "registeredAt"
                FROM members
                ORDER BY name
                """
            )
            members = cur.fetchall()

            members_by_hh: dict[str, list[dict]] = {}
            for m in members:
                hh_id = m["householdId"]
                if hh_id not in members_by_hh:
                    members_by_hh[hh_id] = []
                members_by_hh[hh_id].append({
                    **m,
                    "registeredAt": m["registeredAt"].isoformat() if m["registeredAt"] else None,
                })

            return [
                {
                    **h,
                    "registeredAt": h["registeredAt"].isoformat() if h["registeredAt"] else None,
                    "members": members_by_hh.get(h["id"], []),
                }
                for h in households
            ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_household(
    payload: CreateHouseholdPayload,
    user: UserProfile = Depends(require_role("volunteer", "admin")),
):
    hh_id = payload.id or f"hh-{abs(hash(payload.name)) % 100000}"
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO households (id, name, head, ward, cell_id, contact)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, head = EXCLUDED.head
                """,
                (hh_id, payload.name, payload.head, payload.ward, payload.cellId, payload.contact),
            )

            # Insert initial members if any
            for m in payload.members:
                m_id = f"usr-{abs(hash(m.name + hh_id)) % 100000}"
                qr = m.qrToken or f"sahayam:user:{m_id}"
                cur.execute(
                    """
                    INSERT INTO members (
                        id, household_id, name, age, gender, blood_group, conditions, medication,
                        disability, is_elderly, is_pregnant, is_infant, is_bedridden, emergency_contact,
                        qr_token, status, camp_name
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (
                        m_id, hh_id, m.name, m.age, m.gender, m.bloodGroup, m.conditions, m.medication,
                        m.disability, m.isElderly, m.isPregnant, m.isInfant, m.isBedridden,
                        m.emergencyContact, qr, m.status, m.campName,
                    ),
                )
        conn.commit()
    return {"ok": True, "id": hh_id}


@router.post("/{id}/members", status_code=status.HTTP_201_CREATED)
def add_household_member(
    id: str,
    payload: CreateMemberPayload,
    user: UserProfile = Depends(require_role("volunteer", "admin")),
):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM households WHERE id = %s", (id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Household not found")

            m_id = f"usr-{abs(hash(payload.name + id)) % 100000}"
            qr = payload.qrToken or f"sahayam:user:{m_id}"
            cur.execute(
                """
                INSERT INTO members (
                    id, household_id, name, age, gender, blood_group, conditions, medication,
                    disability, is_elderly, is_pregnant, is_infant, is_bedridden, emergency_contact,
                    qr_token, status, camp_name
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name, qr_token
                """,
                (
                    m_id, id, payload.name, payload.age, payload.gender, payload.bloodGroup,
                    payload.conditions, payload.medication, payload.disability, payload.isElderly,
                    payload.isPregnant, payload.isInfant, payload.isBedridden, payload.emergencyContact,
                    qr, payload.status, payload.campName,
                ),
            )
            created = cur.fetchone()
        conn.commit()
    return {"ok": True, "member": created}
