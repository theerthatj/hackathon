import asyncio
import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.db import get_db
from app.sse import sse_manager

router = APIRouter(prefix="/api/dtn", tags=["dtn"])

IMMUTABLE_FIELDS = [
    "bundleId",
    "originNodeId",
    "originName",
    "householdName",
    "cellId",
    "emergencyType",
    "coordinates",
    "medicalSummary",
    "bloodGroup",
    "conditions",
    "medication",
    "isBedridden",
    "priority",
    "createdAt",
]


def canonical_hash_bundle(bundle: dict) -> str:
    payload = {k: bundle[k] for k in IMMUTABLE_FIELDS if k in bundle and bundle[k] is not None}
    canonical_str = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


class CustodyPayload(BaseModel):
    bundleId: str
    custodianId: str
    custodianName: str
    location: Optional[str] = "Field Trail"


class UplinkPayload(BaseModel):
    bundleId: str
    gatewayName: Optional[str] = "DEOC Emergency Gateway"


def fetch_full_bundle(cur, bundle_id: str) -> Optional[dict]:
    cur.execute(
        """
        SELECT 
            b.bundle_id as "bundleId",
            b.origin_node_id as "originNodeId",
            b.origin_name as "originName",
            b.household_name as "householdName",
            b.cell_id as "cellId",
            b.emergency_type as "emergencyType",
            ST_Y(b.coordinates::geometry) as lat,
            ST_X(b.coordinates::geometry) as lng,
            b.medical_summary as "medicalSummary",
            b.blood_group as "bloodGroup",
            b.conditions,
            b.medication,
            b.is_bedridden as "isBedridden",
            b.priority,
            b.integrity_hash as "integrityHash",
            b.hash_algo as "hashAlgo",
            b.status,
            b.created_at as "createdAt",
            b.delivered_at as "deliveredAt",
            b.custodian
        FROM dtn_bundles b
        WHERE b.bundle_id = %s
        """,
        (bundle_id,),
    )
    row = cur.fetchone()
    if not row:
        return None

    cur.execute(
        """
        SELECT custodian_id as "custodianId", custodian_name as "custodianName",
               ts as "timestamp", location, action
        FROM custody_receipts
        WHERE bundle_id = %s
        ORDER BY ts ASC
        """,
        (bundle_id,),
    )
    receipts = cur.fetchall()

    return {
        "bundleId": row["bundleId"],
        "originNodeId": row["originNodeId"],
        "originName": row["originName"],
        "householdName": row["householdName"],
        "cellId": row["cellId"],
        "emergencyType": row["emergencyType"],
        "coordinates": {"lat": float(row["lat"]), "lng": float(row["lng"])} if row["lat"] and row["lng"] else {"lat": 11.552, "lng": 76.102},
        "medicalSummary": row["medicalSummary"],
        "bloodGroup": row["bloodGroup"],
        "conditions": row["conditions"],
        "medication": row["medication"],
        "isBedridden": row["isBedridden"],
        "priority": row["priority"],
        "integrityHash": row["integrityHash"],
        "encryptedHash": row["integrityHash"],
        "hashAlgo": row["hashAlgo"],
        "status": row["status"],
        "createdAt": row["createdAt"].isoformat() if row["createdAt"] else None,
        "deliveredAt": row["deliveredAt"].isoformat() if row["deliveredAt"] else None,
        "custodian": row["custodian"] if isinstance(row["custodian"], dict) else json.loads(row["custodian"]) if row["custodian"] else None,
        "custodyReceipts": [
            {
                **rc,
                "timestamp": rc["timestamp"].isoformat() if rc["timestamp"] else None,
            }
            for rc in receipts
        ],
    }


def fetch_all_bundles(cur) -> list[dict]:
    cur.execute("SELECT bundle_id FROM dtn_bundles ORDER BY created_at DESC")
    ids = [r["bundle_id"] for r in cur.fetchall()]
    return [fetch_full_bundle(cur, bid) for bid in ids if bid]


@router.get("/events")
async def sse_events(request: Request):
    async def event_generator():
        queue = sse_manager.subscribe()
        try:
            # Send initial bundles list
            with get_db() as conn:
                with conn.cursor() as cur:
                    initial_bundles = fetch_all_bundles(cur)
            yield f"event: init\ndata: {json.dumps(initial_bundles)}\n\n"

            while True:
                if await request.is_disconnected():
                    break
                try:
                    # Wait for message or heartbeat timeout (25 seconds)
                    msg = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield msg
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        finally:
            sse_manager.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/bundles")
def get_bundles():
    with get_db() as conn:
        with conn.cursor() as cur:
            return fetch_all_bundles(cur)


@router.post("/sos", status_code=status.HTTP_201_CREATED)
async def publish_sos(payload: dict[str, Any]):
    bundle_id = payload.get("bundleId")
    origin_id = payload.get("originNodeId")
    cell_id = payload.get("cellId")
    emergency_type = payload.get("emergencyType")
    hash_val = payload.get("integrityHash") or payload.get("encryptedHash")

    if not bundle_id or not origin_id or not cell_id or not emergency_type or not hash_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_PAYLOAD", "message": "Missing required bundle fields"},
        )

    # Verify SHA-256 against canonical immutable payload
    expected_hash = canonical_hash_bundle(payload)
    if hash_val.lower() != expected_hash.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "HASH_MISMATCH", "message": "Payload does not match SHA-256 integrity hash"},
        )

    coords = payload.get("coordinates") or {"lat": 11.552, "lng": 76.102}
    now = payload.get("createdAt") or datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO dtn_bundles (
                    bundle_id, origin_node_id, origin_name, household_name, cell_id,
                    emergency_type, coordinates, medical_summary, blood_group, conditions,
                    medication, is_bedridden, priority, integrity_hash, hash_algo, status,
                    created_at, custodian
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s
                )
                ON CONFLICT (bundle_id) DO NOTHING
                """,
                (
                    bundle_id,
                    origin_id,
                    payload.get("originName", "Unknown Civilian"),
                    payload.get("householdName", "Unknown Household"),
                    cell_id,
                    emergency_type,
                    coords.get("lng", 76.102),
                    coords.get("lat", 11.552),
                    payload.get("medicalSummary", "None reported"),
                    payload.get("bloodGroup", "Unknown"),
                    payload.get("conditions", "None"),
                    payload.get("medication", "None"),
                    payload.get("isBedridden", False),
                    payload.get("priority", "P1_HIGH"),
                    hash_val,
                    payload.get("hashAlgo", "SHA-256"),
                    payload.get("status", "PENDING_LOCAL"),
                    now,
                    json.dumps(payload.get("custodian")) if payload.get("custodian") else None,
                ),
            )

            # Insert initial creation receipt
            cur.execute(
                """
                INSERT INTO custody_receipts (bundle_id, custodian_id, custodian_name, ts, location, action)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    bundle_id,
                    origin_id,
                    f"{payload.get('originName', 'Victim')} (Victim Node)",
                    now,
                    f"{payload.get('householdName', 'Household')} · Cell {cell_id}",
                    "CREATED",
                ),
            )
            bundle = fetch_full_bundle(cur, bundle_id)
        conn.commit()

    if bundle:
        await sse_manager.broadcast("new_bundle", bundle)

    return {"ok": True, "bundle": bundle}


@router.post("/custody")
async def accept_custody(payload: CustodyPayload):
    now = datetime.now(timezone.utc)
    custodian_dict = {
        "id": payload.custodianId,
        "name": payload.custodianName,
        "location": payload.location or "Field Trail",
    }

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT bundle_id FROM dtn_bundles WHERE bundle_id = %s", (payload.bundleId,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Bundle not found"})

            cur.execute(
                """
                UPDATE dtn_bundles 
                SET status = 'IN_TRANSIT', custodian = %s
                WHERE bundle_id = %s
                """,
                (json.dumps(custodian_dict), payload.bundleId),
            )

            cur.execute(
                """
                INSERT INTO custody_receipts (bundle_id, custodian_id, custodian_name, ts, location, action)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    payload.bundleId,
                    payload.custodianId,
                    payload.custodianName,
                    now,
                    payload.location or "Field Trail",
                    "CUSTODY_ACQUIRED",
                ),
            )
            bundle = fetch_full_bundle(cur, payload.bundleId)
        conn.commit()

    if bundle:
        await sse_manager.broadcast("custody_updated", bundle)

    return {"ok": True, "bundle": bundle}


@router.post("/uplink")
async def uplink_bundle(payload: UplinkPayload):
    now = datetime.now(timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT bundle_id FROM dtn_bundles WHERE bundle_id = %s", (payload.bundleId,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Bundle not found"})

            cur.execute(
                """
                UPDATE dtn_bundles 
                SET status = 'DELIVERED_COMMAND', delivered_at = %s
                WHERE bundle_id = %s
                """,
                (now, payload.bundleId),
            )

            cur.execute(
                """
                INSERT INTO custody_receipts (bundle_id, custodian_id, custodian_name, ts, location, action)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    payload.bundleId,
                    "deoc-gateway-kalpetta",
                    payload.gatewayName or "St. Thomas HSS Relay Gateway",
                    now,
                    "Kalpetta District Emergency Ops Centre",
                    "GATEWAY_UPLINKED",
                ),
            )
            bundle = fetch_full_bundle(cur, payload.bundleId)
        conn.commit()

    if bundle:
        await sse_manager.broadcast("bundle_delivered", bundle)

    return {"ok": True, "bundle": bundle}


@router.delete("/bundles")
async def reset_bundles():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE custody_receipts, dtn_bundles CASCADE")
        conn.commit()
    await sse_manager.broadcast("init", [])
    return {"ok": True, "message": "All DTN bundles cleared"}
