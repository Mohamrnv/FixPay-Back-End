
import logging
import dataclasses
import importlib
import numpy as np
import cv2

logger = logging.getLogger(__name__)

# ── Thresholds ────────────────────────────────────────────────────────────────
_SILENT_FACE_THRESHOLD  = 0.50   # MiniFASNet: 0→spoof, 1→real
_HEURISTIC_THRESHOLD    = 0.40   # combined texture+frequency score


@dataclasses.dataclass
class LivenessResult:
    is_live: bool
    score:   float   # [0, 1]  higher = more likely real
    method:  str     # "silent_face" | "heuristic"


class LivenessDetector:
    """
    Auto-selects the best available liveness backend at construction time.
    """

    def __init__(self):
        self._backend = self._load_backend()
        logger.info("Liveness backend: %s", self._backend.__class__.__name__)

    def check(self, image: np.ndarray) -> LivenessResult:
        return self._backend.check(image)

    @staticmethod
    def _load_backend():
        try:
            from silent_face import SilentFaceDetector   # type: ignore
            return _SilentFaceBackend()
        except ImportError:
            logger.warning(
                "silent-face not installed – using heuristic liveness. "
                "Install with: pip install git+https://github.com/minivision-ai/Silent-Face-Anti-Spoofing"
            )
            return _HeuristicBackend()


# ── Backend A: Silent-Face (MiniFASNet) ───────────────────────────────────────

class _SilentFaceBackend:
    def __init__(self):
        from silent_face import SilentFaceDetector  # type: ignore
        self._model = SilentFaceDetector()
        logger.info("Silent-Face model loaded.")

    def check(self, image: np.ndarray) -> LivenessResult:
        score = float(self._model.predict(image))
        return LivenessResult(
            is_live=score >= _SILENT_FACE_THRESHOLD,
            score=score,
            method="silent_face",
        )


# ── Backend B: Passive heuristic (texture + frequency) ───────────────────────

class _HeuristicBackend:
    """
    Combines two passive signals:
      1. Laplacian variance  – real faces have richer fine-grained texture
      2. FFT high-freq ratio – moire / banding from screens is detectable
    """

    def check(self, image: np.ndarray) -> LivenessResult:
        # Downscale for speed – heuristic doesn't need full resolution
        h, w   = image.shape[:2]
        scale  = min(1.0, 480 / max(h, w))
        if scale < 1.0:
            image = cv2.resize(image, (int(w*scale), int(h*scale)))

        gray  = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        score = 0.6 * self._texture_score(gray) + 0.4 * self._frequency_score(gray)

        return LivenessResult(
            is_live=score >= _HEURISTIC_THRESHOLD,
            score=float(score),
            method="heuristic",
        )

    @staticmethod
    def _texture_score(gray: np.ndarray) -> float:
        """Normalised Laplacian variance → [0, 1]."""
        var = cv2.Laplacian(gray, cv2.CV_64F).var()
        return float(min(var / 2000.0, 1.0))

    @staticmethod
    def _frequency_score(gray: np.ndarray) -> float:
        """High-frequency energy ratio via FFT → [0, 1]."""
        resized = cv2.resize(gray, (128, 128)).astype(np.float32)
        mag     = np.abs(np.fft.fftshift(np.fft.fft2(resized)))
        h, w    = mag.shape
        cy, cx  = h // 2, w // 2
        dist    = np.sqrt((np.arange(w) - cx) ** 2 + (np.arange(h)[:, None] - cy) ** 2)
        max_r   = np.sqrt(cx**2 + cy**2)
        ratio   = mag[dist > 0.30 * max_r].sum() / (mag.sum() + 1e-9)
        return float(min(ratio * 10, 1.0))