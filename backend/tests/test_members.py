import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_auth_and_member_qr_guard():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login as civilian user
        user_login = await ac.post("/api/auth/login", json={"email": "user@gmail.com", "password": "user"})
        assert user_login.status_code == 200
        user_token = user_login.json()["token"]

        # 2. Login as volunteer
        vol_login = await ac.post("/api/auth/login", json={"email": "volunteer@gmail.com", "password": "volunteer"})
        assert vol_login.status_code == 200
        vol_token = vol_login.json()["token"]

        # 3. Civilian user attempting to resolve QR must be forbidden (403 DPDP privacy protection)
        unauth_qr = await ac.get(
            "/api/members/by-qr/sahayam:user:usr-kuru-1",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert unauth_qr.status_code == 403

        # 4. Authorized volunteer resolves QR and accesses medical data
        auth_qr = await ac.get(
            "/api/members/by-qr/sahayam:user:usr-kuru-1",
            headers={"Authorization": f"Bearer {vol_token}"},
        )
        assert auth_qr.status_code == 200
        member = auth_qr.json()
        assert member["name"] == "Ammini Kuruvilla"
        assert "Insulin" in member["medication"]
        assert member["householdName"] == "Kuruvilla House"

        # 5. Volunteer updates status
        update_res = await ac.patch(
            f"/api/members/{member['id']}/status",
            headers={"Authorization": f"Bearer {vol_token}"},
            json={"status": "CHECKED_IN", "campName": "St. Thomas HSS Kalpetta"},
        )
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "CHECKED_IN"
