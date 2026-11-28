import base64
import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import app


def _make_synthetic_image_b64(seed_offset: int = 0) -> str:
    img = np.full((128, 128, 3), 140, dtype=np.uint8)
    cv2.circle(img, (64, 64), 36, (210, 190, 170), -1)
    cv2.circle(img, (50 + seed_offset, 55), 5, (40, 40, 40), -1)
    cv2.circle(img, (78 + seed_offset, 55), 5, (40, 40, 40), -1)
    ok, buf = cv2.imencode(".png", img)
    assert ok
    return base64.b64encode(buf.tobytes()).decode("ascii")


def test_enroll_search_isolation_and_deletion() -> None:
    client = TestClient(app)
    img_a = _make_synthetic_image_b64(0)
    img_b = _make_synthetic_image_b64(6)

    enroll_res = client.post(
        "/v1/enroll",
        json={
            "workspace_id": "ws-1",
            "collection_id": "col-1",
            "image_id": "img-1",
            "image_b64": img_a,
            "allow_synthetic_fallback": True,
        },
    )
    assert enroll_res.status_code == 200
    assert enroll_res.json()["enrolled"] is True

    # Search in the same workspace+collection returns similarity_estimate
    search_res = client.post(
        "/v1/search",
        json={
            "workspace_id": "ws-1",
            "collection_id": "col-1",
            "query_b64": img_a,
            "allow_synthetic_fallback": True,
        },
    )
    assert search_res.status_code == 200
    results = search_res.json()["results"]
    assert len(results) == 1
    assert results[0]["collection_image_id"] == "img-1"
    assert results[0]["similarity_estimate"] >= 0.99

    # Cross-collection isolation: col-2 has no results
    isolated_res = client.post(
        "/v1/search",
        json={
            "workspace_id": "ws-1",
            "collection_id": "col-2",
            "query_b64": img_b,
            "allow_synthetic_fallback": True,
        },
    )
    assert isolated_res.status_code == 200
    assert isolated_res.json()["results"] == []

    # Derived data deletion
    del_res = client.delete("/v1/indexes/ws-1/collections/col-1/images/img-1")
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

    after_del = client.post(
        "/v1/search",
        json={
            "workspace_id": "ws-1",
            "collection_id": "col-1",
            "query_b64": img_a,
            "allow_synthetic_fallback": True,
        },
    )
    assert after_del.json()["results"] == []


def test_rejects_invalid_image_payload() -> None:
    client = TestClient(app)
    res = client.post(
        "/v1/search",
        json={
            "workspace_id": "ws-1",
            "collection_id": "col-1",
            "query_b64": "bm90LWFuLWltYWdl",
            "allow_synthetic_fallback": True,
        },
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "UNDECODABLE_IMAGE"

