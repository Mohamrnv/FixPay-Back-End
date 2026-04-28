
import logging
import os
import numpy as np

logger = logging.getLogger(__name__)

_ID_THRESHOLD   = float(os.getenv("ID_THRESHOLD",   "0.38"))
_LIVE_THRESHOLD = float(os.getenv("LIVE_THRESHOLD", "0.45"))

_HIGH_SIM   = 0.60
_MEDIUM_SIM = 0.48


def _normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    return v / n if n > 1e-6 else v


def _calibrate(emb_a: np.ndarray, emb_b: np.ndarray, threshold: float) -> float:
    raw = float(np.dot(emb_a, emb_b))

    
    mid     = _normalize(emb_a + emb_b)
    alpha   = 0.32                         
    a_cal   = _normalize(emb_a * (1 - alpha) + mid * alpha)
    b_cal   = _normalize(emb_b * (1 - alpha) + mid * alpha)
    boosted = float(np.dot(a_cal, b_cal))

    cutoff = threshold + 0.30 * (1.0 - threshold)

    if boosted >= cutoff:
        logger.debug("raw=%.4f boosted=%.4f cutoff=%.4f → boosted", raw, boosted, cutoff)
        return boosted
    else:
        logger.debug("raw=%.4f boosted=%.4f cutoff=%.4f → raw", raw, boosted, cutoff)
        return raw


class FaceMatcher:
    def __init__(self, threshold: float | None = None, id_mode: bool = True):
        if threshold is not None:
            self.threshold = threshold
        else:
            self.threshold = _ID_THRESHOLD if id_mode else _LIVE_THRESHOLD

        self.id_mode = id_mode
        logger.info("FaceMatcher threshold=%.2f  mode=%s",
                    self.threshold, "ID" if id_mode else "LIVE")

    def compare(
        self,
        emb_a: np.ndarray,
        emb_b: np.ndarray,
    ) -> tuple[float, bool, str]:
        if emb_a.shape != emb_b.shape:
            raise ValueError(f"Shape mismatch: {emb_a.shape} vs {emb_b.shape}")

        similarity = _calibrate(emb_a, emb_b, self.threshold)
        is_match   = similarity >= self.threshold
        label      = self._label(similarity, is_match)

        logger.debug("sim=%.4f  match=%s  label=%s", similarity, is_match, label)
        return similarity, is_match, label

    def _label(self, sim: float, is_match: bool) -> str:
        if not is_match:
            return "NO_MATCH"
        if sim >= _HIGH_SIM:
            return "HIGH"
        if sim >= _MEDIUM_SIM:
            return "MEDIUM"
        return "LOW"