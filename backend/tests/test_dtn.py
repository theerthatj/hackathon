import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.routers.dtn import canonical_hash_bundle


@pytest.mark.asyncio
async def test_dtn_sos_and_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Reset bundles first
        del_res = await ac.delete("/api/dtn/bundles")
        assert del_res.status_code == 200

        # 2. Tampered hash must return 400 HASH_MISMATCH
        tampered_bundle = {
            "bundleId": "adu-py-test-1",
            "originNodeId": "usr-test",
            "originName": "Test Citizen",
            "householdName": "Test House",
            "cellId": "C001",
            "emergencyType": "Flood",
            "coordinates": {"lat": 11.5, "lng": 76.1},
            "medicalSummary": "None",
            "priority": "P1_HIGH",
            "createdAt": "2026-09-06T00:00:00.000Z",
            "integrityHash": "badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb",
        }
        tamper_res = await ac.post("/api/dtn/sos", json=tampered_bundle)
        assert tamper_res.status_code == 400
        assert tamper_res.json()["detail"]["error"] == "HASH_MISMATCH"

        # 3. Valid bundle with authentic canonical SHA-256
        valid_bundle = {
            "bundleId": "adu-py-valid-1",
            "originNodeId": "usr-test",
            "originName": "Test Citizen",
            "householdName": "Test House",
            "cellId": "C001",
            "emergencyType": "Flood",
            "coordinates": {"lat": 11.5, "lng": 76.1},
            "medicalSummary": "None",
            "priority": "P1_HIGH",
            "createdAt": "2026-09-06T00:00:00.000Z",
        }
        valid_hash = canonical_hash_bundle(valid_bundle)
        valid_bundle["integrityHash"] = valid_hash

        create_res = await ac.post("/api/dtn/sos", json=valid_bundle)
        assert create_res.status_code == 201
        created = create_res.json()["bundle"]
        assert created["status"] == "PENDING_LOCAL"
        assert len(created["custodyReceipts"]) == 1

        # 4. Accept custody
        custody_res = await ac.post(
            "/api/dtn/custody",
            json={
                "bundleId": "adu-py-valid-1",
                "custodianId": "vol-1",
                "custodianName": "Ravi Kumar",
                "location": "Trail Sector 2",
            },
        )
        assert custody_res.status_code == 200
        in_transit = custody_res.json()["bundle"]
        assert in_transit["status"] == "IN_TRANSIT"
        assert in_transit["custodian"]["name"] == "Ravi Kumar"
        assert len(in_transit["custodyReceipts"]) == 2

        # 5. Uplink to gateway
        uplink_res = await ac.post(
            "/api/dtn/uplink",
            json={
                "bundleId": "adu-py-valid-1",
                "gatewayName": "St. Thomas HSS Relay",
            },
        )
        assert uplink_res.status_code == 200
        delivered = uplink_res.json()["bundle"]
        assert delivered["status"] == "DELIVERED_COMMAND"
        assert delivered["deliveredAt"] is not None
        assert len(delivered["custodyReceipts"]) == 3
