from ninja import NinjaAPI
from core.router import router
from .test_data_api import router as test_data_router

api = NinjaAPI(
    title="Agentic API Testing Platform",
    version="1.0.0",
    description="Backend API for Agentic API Testing Platform using Django Ninja"
)

api.add_router("", router)
api.add_router("/api", test_data_router)
