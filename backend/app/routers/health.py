from fastapi import APIRouter

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
def health_check():
    return {"status": "ok", "service": "sahayam-authoritative-backend", "version": "0.1.0"}
