"""
services/face_embedder.py  v2
──────────────────────────────
Direct ArcFace ONNX load — bypasses FaceAnalysis detection requirement.

Key fix: separate preprocessing for ID card vs selfie.
  - ID card:  CLAHE + denoise + gentle upscale  (no sharpen — causes artifacts)
  - Selfie:   resize only  (already high quality)
"""

import logging
import os
import threading
import numpy as np
import cv2
from insightface.model_zoo import model_zoo

logger = logging.getLogger(__name__)

_ARCFACE_SIZE = (112, 112)
_MODEL_NAME   = "buffalo_l"
_REC_FILENAME = "w600k_r50.onnx"


class FaceEmbedder:
    """ArcFace (buffalo_l/w600k_r50) → 512-d L2-normalised embeddings."""

    def __init__(self, providers: list[str] | None = None):
        providers = providers or ["CPUExecutionProvider"]
        logger.info("Loading ArcFace (%s) …", providers[0])

        model_path = os.path.join(
            os.path.expanduser("~"), ".insightface", "models",
            _MODEL_NAME, _REC_FILENAME
        )
        if not os.path.exists(model_path):
            raise RuntimeError(
                f"ArcFace model not found at {model_path}. "
                "Run: python -c \"from insightface.app import FaceAnalysis; "
                "FaceAnalysis(name=\'buffalo_l\').prepare(ctx_id=0)\""
            )

        self._rec  = model_zoo.get_model(model_path, providers=providers)
        self._rec.prepare(ctx_id=0)
        self._lock = threading.Lock()
        self._warm_up()
        logger.info("ArcFace ready.")

    # ── Public API ────────────────────────────────────────────────────────────

    def embed(self, face_crop: np.ndarray, is_id: bool = False) -> np.ndarray:
        """
        Parameters
        ----------
        face_crop : BGR ndarray (any size)
        is_id     : True  → apply ID-card preprocessing (CLAHE + denoise)
                    False → standard preprocessing (selfie / high-quality)
        """
        if face_crop is None or face_crop.size == 0:
            raise ValueError("Empty face crop passed to FaceEmbedder.")

        prepared = self._prepare_id(face_crop) if is_id else self._prepare_selfie(face_crop)

        with self._lock:
            raw = self._rec.get_feat(prepared)

        return self._normalise(raw)

    def embed_batch(
        self,
        id_face:   np.ndarray,
        live_face: np.ndarray,
    ) -> tuple[np.ndarray, np.ndarray]:
        """Two faces in one forward pass — ID preprocessing on first, selfie on second."""
        try:
            pa    = self._prepare_id(id_face)
            pb    = self._prepare_selfie(live_face)
            batch = np.stack([pa, pb], axis=0)
            with self._lock:
                raws = self._rec.get_feat(batch)
            return self._normalise(raws[0]), self._normalise(raws[1])
        except Exception as exc:
            logger.warning("Batch embed failed (%s) – falling back.", exc)
            return self.embed(id_face, is_id=True), self.embed(live_face, is_id=False)

    # keep _prepare() as alias so debug_faces.py still works
    def _prepare(self, crop: np.ndarray) -> np.ndarray:
        return self._prepare_id(crop)

    # ── Preprocessing: ID card ────────────────────────────────────────────────

    @staticmethod
    def _prepare_id(crop: np.ndarray) -> np.ndarray:
        """
        For Egyptian ID card face crops:
          1. Ensure 3-channel BGR
          2. CLAHE contrast enhancement  (compensates for B&W + bad scan)
          3. Denoise                      (removes JPEG compression noise)
          4. Gentle upscale if < 80px    (very small crop → upscale before resize)
          5. Resize to 112×112
        NO sharpening — sharpening on low-quality compressed images
        creates ringing artifacts that hurt ArcFace accuracy.
        """
        img = crop.copy()

        # 1. ensure BGR
        if len(img.shape) == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif img.shape[2] == 1:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

        # 2. enhance if grayscale (B ≈ G ≈ R)
        b, g, r = cv2.split(img)
        if np.mean(np.abs(b.astype(int) - g.astype(int))) < 5:
            gray  = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
            gray  = clahe.apply(gray)
            gray  = cv2.fastNlMeansDenoising(gray, h=5)
            img   = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

        # 3. upscale only very small crops (< 80px) to avoid over-interpolation
        h, w = img.shape[:2]
        if max(h, w) < 80:
            scale = 80 / max(h, w)
            img   = cv2.resize(img, (int(w * scale), int(h * scale)),
                               interpolation=cv2.INTER_LANCZOS4)

        # 4. resize to ArcFace input
        return cv2.resize(img, _ARCFACE_SIZE, interpolation=cv2.INTER_LANCZOS4)

    # ── Preprocessing: selfie ─────────────────────────────────────────────────

    @staticmethod
    def _prepare_selfie(crop: np.ndarray) -> np.ndarray:
        """
        For live selfie crops:
          Selfies are already high-quality color images.
          Just resize — no CLAHE, no denoise, no sharpening.
        """
        img = crop.copy()
        if len(img.shape) == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif img.shape[2] == 1:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        return cv2.resize(img, _ARCFACE_SIZE, interpolation=cv2.INTER_LANCZOS4)

    # ── Shared helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _normalise(raw: np.ndarray) -> np.ndarray:
        vec  = raw.flatten().astype(np.float32)
        norm = np.linalg.norm(vec)
        if norm < 1e-6:
            raise ValueError("ArcFace returned a near-zero embedding.")
        return vec / norm

    def _warm_up(self):
        dummy = np.zeros(_ARCFACE_SIZE + (3,), dtype=np.uint8)
        try:
            with self._lock:
                self._rec.get_feat(dummy)
        except Exception:
            pass