from fastapi import APIRouter

from backend.api.v1.endpoints import auth, tasks, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(tasks.router)
api_router.include_router(users.router)
