"""
Main FastAPI Application Entrypoint.
Antarctic AI Navigation Decision Support System.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.api import router as api_router
from backend.models.sea_ice_model import sea_ice_forecaster

app = FastAPI(
    title="Antarctic AI Navigation Decision Support System API",
    description="Backend AI/ML forecasting, iceberg tracking, risk assessment, and route optimization services.",
    version="1.0.0"
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For prototype local deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "system": "ANTARCTIC AI NAVIGATION DECISION SUPPORT SYSTEM",
        "status": "ONLINE",
        "version": "1.0.0",
        "ai_forecaster_ready": sea_ice_forecaster.is_trained,
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
