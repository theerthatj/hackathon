from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import close_pool, init_pool
from app.routers import auth, cells, dtn, health, households, members, scenarios, scores
from app.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    yield
    close_pool()


app = FastAPI(
    title="Sahayam Authoritative Backend",
    description="Authoritative Telemetry, PostGIS Silence Scorer, and DDD Mesh Relay",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(cells.router)
app.include_router(scores.router)
app.include_router(scenarios.router)
app.include_router(households.router)
app.include_router(members.router)
app.include_router(dtn.router)


@app.get("/")
def root():
    return {"message": "Sahayam API is online", "docs": "/docs"}
