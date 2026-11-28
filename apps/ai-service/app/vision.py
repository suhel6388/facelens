from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np


@dataclass
class QualityReport:
    width: int
    height: int
    sharpness: float
    brightness: float
    face_count: int
    face_box: Optional[Tuple[int, int, int, int]]


@dataclass
class IndexedFaceEntry:
    image_id: str
    embedding: np.ndarray
    quality: QualityReport


class VisionProcessingError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 422) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class PrivateCollectionIndexStore:
    """
    Isolated per-(workspace_id, collection_id) vector index.
    Enforces strict tenant and collection boundaries so searches never cross collections.
    """

    def __init__(self) -> None:
        self._indexes: Dict[Tuple[str, str], Dict[str, IndexedFaceEntry]] = {}
        cascade_cls = getattr(cv2, "CascadeClassifier", None)
        if cascade_cls is not None and hasattr(cv2, "data"):
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            self._face_cascade = cascade_cls(cascade_path)
        else:
            self._face_cascade = None

    def decode_image(self, image_b64: str) -> np.ndarray:
        try:
            raw = base64.b64decode(image_b64, validate=True)
        except Exception as exc:
            raise VisionProcessingError("INVALID_BASE64", "Invalid base64 image payload.") from exc

        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise VisionProcessingError("UNDECODABLE_IMAGE", "Unable to decode image bytes.")
        return img

    def inspect_and_embed(
        self,
        img: np.ndarray,
        allow_synthetic_fallback: bool = False,
    ) -> Tuple[np.ndarray, QualityReport]:
        height, width = img.shape[:2]
        if width < 64 or height < 64:
            raise VisionProcessingError(
                "IMAGE_TOO_SMALL", "Image dimensions must be at least 64x64 pixels."
            )

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(np.mean(gray))

        if brightness < 10.0 or brightness > 250.0:
            raise VisionProcessingError(
                "POOR_LIGHTING", "Image brightness is outside acceptable range."
            )

        faces = []
        if self._face_cascade is not None:
            faces = self._face_cascade.detectMultiScale(
                cv2.equalizeHist(gray),
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(32, 32),
            )
        else:
            edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 40, 120)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                bx, by, bw, bh = cv2.boundingRect(cnt)
                if bw >= 32 and bh >= 32:
                    faces.append((bx, by, bw, bh))

        face_box: Optional[Tuple[int, int, int, int]] = None
        if len(faces) > 0:
            # Pick largest detected face
            x, y, w, h = max(faces, key=lambda box: int(box[2]) * int(box[3]))
            face_box = (int(x), int(y), int(w), int(h))
            crop = gray[y : y + h, x : x + w]
        elif allow_synthetic_fallback:
            # Used for synthetic test images without full photorealistic faces
            crop = gray
        else:
            raise VisionProcessingError(
                "NO_FACE_DETECTED", "No clear face region was detected in the image."
            )

        # Compute deterministic 64-dim normalized visual descriptor (8x8 downsampled crop)
        resized = cv2.resize(crop, (8, 8), interpolation=cv2.INTER_AREA).astype(np.float32)
        vec = resized.flatten()
        norm = float(np.linalg.norm(vec))
        if norm > 0.0:
            vec = vec / norm

        report = QualityReport(
            width=width,
            height=height,
            sharpness=round(sharpness, 2),
            brightness=round(brightness, 2),
            face_count=int(len(faces)),
            face_box=face_box,
        )
        return vec, report

    def enroll(
        self,
        workspace_id: str,
        collection_id: str,
        image_id: str,
        image_b64: str,
        allow_synthetic_fallback: bool = False,
    ) -> QualityReport:
        img = self.decode_image(image_b64)
        vec, report = self.inspect_and_embed(
            img, allow_synthetic_fallback=allow_synthetic_fallback
        )
        key = (workspace_id, collection_id)
        if key not in self._indexes:
            self._indexes[key] = {}
        self._indexes[key][image_id] = IndexedFaceEntry(
            image_id=image_id,
            embedding=vec,
            quality=report,
        )
        return report

    def search(
        self,
        workspace_id: str,
        collection_id: str,
        query_b64: str,
        top_k: int = 10,
        allow_synthetic_fallback: bool = False,
    ) -> Tuple[QualityReport, List[Tuple[str, float]]]:
        img = self.decode_image(query_b64)
        query_vec, report = self.inspect_and_embed(
            img, allow_synthetic_fallback=allow_synthetic_fallback
        )
        bucket = self._indexes.get((workspace_id, collection_id), {})
        scored: List[Tuple[str, float]] = []
        for entry in bucket.values():
            raw_sim = float(np.dot(query_vec, entry.embedding))
            clamped = max(0.0, min(1.0, raw_sim))
            scored.append((entry.image_id, round(clamped, 4)))
        scored.sort(key=lambda item: item[1], reverse=True)
        return report, scored[:top_k]

    def delete_image(self, workspace_id: str, collection_id: str, image_id: str) -> bool:
        bucket = self._indexes.get((workspace_id, collection_id))
        if not bucket or image_id not in bucket:
            return False
        del bucket[image_id]
        return True

    def delete_collection(self, workspace_id: str, collection_id: str) -> bool:
        return self._indexes.pop((workspace_id, collection_id), None) is not None
