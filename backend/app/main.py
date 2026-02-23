from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.forecast import router as forecast_router
from app.routers.fraud import router as fraud_router
from app.routers.predict import router as predict_router

app = FastAPI(title="Cognitive Logix API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(forecast_router)
app.include_router(fraud_router)


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "Cognitive Logix - Bilişsel Tedarik Zinciri Dijital İkizi API",
    "version": "0.1.0",
    "Proudly Developed By ":"ERKAN TURGUT"}
