from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.vision import PrivateCollectionIndexStore, VisionProcessingError


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class EnrollRequest(BaseModel):
    workspace_id: str
    collection_id: str
    image_id: str
    image_b64: str
    allow_synthetic_fallback: bool = False


class SearchRequest(BaseModel):
    workspace_id: str
    collection_id: str
    query_b64: str
    top_k: int = Field(default=10, ge=1, le=50)
    allow_synthetic_fallback: bool = False


class QualityResponse(BaseModel):
    width: int
    height: int
    sharpness: float
    brightness: float
    face_count: int


class SearchCandidate(BaseModel):
    collection_image_id: str
    similarity_estimate: float
    rank: int


class SearchResponse(BaseModel):
    workspace_id: str
    collection_id: str
    quality: QualityResponse
    results: List[SearchCandidate]


class EnrollResponse(BaseModel):
    enrolled: bool
    image_id: str
    quality: QualityResponse


store = PrivateCollectionIndexStore()

app = FastAPI(
    title="FaceLens AI Service",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
)


@app.exception_handler(VisionProcessingError)
async def vision_error_handler(_request: object, exc: VisionProcessingError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="ai-service", version="0.1.0")


@app.post("/v1/enroll", response_model=EnrollResponse)
def enroll_image(req: EnrollRequest) -> EnrollResponse:
    report = store.enroll(
        workspace_id=req.workspace_id,
        collection_id=req.collection_id,
        image_id=req.image_id,
        image_b64=req.image_b64,
        allow_synthetic_fallback=req.allow_synthetic_fallback,
    )
    return EnrollResponse(
        enrolled=True,
        image_id=req.image_id,
        quality=QualityResponse(
            width=report.width,
            height=report.height,
            sharpness=report.sharpness,
            brightness=report.brightness,
            face_count=report.face_count,
        ),
    )


@app.post("/v1/search", response_model=SearchResponse)
def search_collection(req: SearchRequest) -> SearchResponse:
    report, matches = store.search(
        workspace_id=req.workspace_id,
        collection_id=req.collection_id,
        query_b64=req.query_b64,
        top_k=req.top_k,
        allow_synthetic_fallback=req.allow_synthetic_fallback,
    )
    candidates = [
        SearchCandidate(
            collection_image_id=image_id,
            similarity_estimate=score,
            rank=idx + 1,
        )
        for idx, (image_id, score) in enumerate(matches)
    ]
    return SearchResponse(
        workspace_id=req.workspace_id,
        collection_id=req.collection_id,
        quality=QualityResponse(
            width=report.width,
            height=report.height,
            sharpness=report.sharpness,
            brightness=report.brightness,
            face_count=report.face_count,
        ),
        results=candidates,
    )


@app.delete("/v1/indexes/{workspace_id}/collections/{collection_id}/images/{image_id}")
def delete_indexed_image(workspace_id: str, collection_id: str, image_id: str) -> dict:
    removed = store.delete_image(workspace_id, collection_id, image_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Indexed image not found")
    return {"deleted": True, "image_id": image_id}


@app.delete("/v1/indexes/{workspace_id}/collections/{collection_id}")
def delete_collection_index(workspace_id: str, collection_id: str) -> dict:
    removed = store.delete_collection(workspace_id, collection_id)
    return {"deleted": removed, "collection_id": collection_id}
