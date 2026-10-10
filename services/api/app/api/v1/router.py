from fastapi import APIRouter
from app.api.v1.endpoints import auth, rooms, devices, overview, integrations, voice

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(rooms.router)
api_router.include_router(devices.router)
api_router.include_router(overview.router)
api_router.include_router(integrations.router)
api_router.include_router(voice.router)

