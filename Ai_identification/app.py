"""
Egyptian National ID Verification System  v2
=============================================
Endpoints:
  POST /verify       – production verify
  POST /verify/debug – saves every intermediate image to debug_output/
  GET  /health
"""

import logging
import os
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, Future
from pathlib import Path

import cv2
import numpy as np
from flask import Flask, request, jsonify, g

from services.face_detector import FaceDetector
from services.liveness_detector import LivenessDetector
from services.face_embedder import FaceEmbedder
from services.matcher import FaceMatcher
from utils.image_utils import decode_image_from_request
from utils.logger import setup_logger

setup_logger()
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = Flask(__name__)

# ── Services (loaded ONCE at startup) ────────────────────────────────────────
logger.info("Initialising models …")
_t = time.perf_counter()

face_detector = FaceDetector()
liveness_det  = LivenessDetector()
face_embedder = FaceEmbedder()
matcher       = FaceMatcher()

logger.info("All models ready in %.2fs", time.perf_counter() - _t)

# Shared thread pool for parallel branches
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="verify")

# ── Results directory (comparison images saved here) ─────────────────────────
RESULTS_DIR = Path(os.getenv("RESULTS_DIR", "results"))
RESULTS_DIR.mkdir(exist_ok=True)
SAVE_RESULTS = os.getenv("SAVE_RESULTS", "true").lower() == "true"



# ── Request timing ────────────────────────────────────────────────────────────
@app.before_request
def _start_timer():
    g.t0 = time.perf_counter()


@app.after_request
def _log_timing(response):
    if hasattr(g, "t0"):
        ms = (time.perf_counter() - g.t0) * 1000
        logger.info("%-6s %-20s → %d  (%.0fms)",
                    request.method, request.path, response.status_code, ms)
    return response


# ── Health ────────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "ID Verification API v2"}), 200


# ── Verify ────────────────────────────────────────────────────────────────────
@app.route("/verify", methods=["POST"])
def verify():
    """
    POST /verify   multipart/form-data
      id_image   – photo of Egyptian national ID card
      live_image – live selfie from camera

    Response JSON:
      match        bool
      similarity   float [0,1]
      liveness     bool
      threshold    float
      latency_ms   float   (total server processing time)
      error        str | null
    """
    timings: dict[str, float] = {}

    try:
        # ── 1. Decode images ──────────────────────────────────────────────────
        t = time.perf_counter()
        id_img   = decode_image_from_request(request, "id_image")
        live_img = decode_image_from_request(request, "live_image")
        timings["decode_ms"] = _ms(t)

        # ── 2. Parallel: liveness check  +  ID face detection ────────────────
        #    These two branches are fully independent → run concurrently.
        t = time.perf_counter()

        future_liveness: Future = _executor.submit(liveness_det.check, live_img)
        future_id_face:  Future = _executor.submit(
            face_detector.detect_and_crop_id, id_img
        )

        liveness_result = future_liveness.result()
        timings["liveness_ms"] = _ms(t)

        if not liveness_result.is_live:
            logger.warning("Liveness FAILED (score=%.3f)", liveness_result.score)
            return _response(
                match=False, similarity=0.0, liveness=False,
                threshold=matcher.threshold, timings=timings,
                error="Liveness check failed: possible spoof detected.",
            ), 200

        id_face = future_id_face.result()           # already done or near-done
        timings["id_detect_ms"] = _ms(t)

        # ── 3. Live face detection (sequential – needs liveness to pass first) ─
        t = time.perf_counter()
        live_face = face_detector.detect_and_crop(live_img, source="selfie")
        timings["live_detect_ms"] = _ms(t)

        # ── 4. Parallel: compute both embeddings ──────────────────────────────
        t = time.perf_counter()
        f_id_emb   = _executor.submit(face_embedder.embed, id_face,   True)   # is_id=True
        f_live_emb = _executor.submit(face_embedder.embed, live_face, False)  # is_id=False
        id_embedding   = f_id_emb.result()
        live_embedding = f_live_emb.result()
        timings["embed_ms"] = _ms(t)

        # ── 5. Compare ────────────────────────────────────────────────────────
        t = time.perf_counter()
        similarity, is_match, confidence = matcher.compare(id_embedding, live_embedding)
        timings["match_ms"] = _ms(t)

        logger.info(
            "match=%s  sim=%.4f  confidence=%s  threshold=%.2f  timings=%s",
            is_match, similarity, confidence, matcher.threshold, timings,
        )

        # ── 6. Save comparison image ──────────────────────────────────────────
        # NOTE: we resize the raw crops to 224px just for display.
        # We do NOT call _prepare() again — that would double-process the image
        # and lower the similarity score.
        result_path = None
        if SAVE_RESULTS:
            ts          = time.strftime("%Y%m%d_%H%M%S")
            verdict     = "MATCH" if is_match else "NOMATCH"
            filename    = f"{ts}_{verdict}_{similarity:.3f}.jpg"
            result_path = str(RESULTS_DIR / filename)
            _save_comparison(
                result_path, id_face, live_face,
                similarity, is_match, confidence,
            )
            logger.info("Comparison saved → %s", result_path)

        return _response(
            match=is_match,
            similarity=round(float(similarity), 4),
            confidence=confidence,
            liveness=True,
            threshold=matcher.threshold,
            result_image=result_path,
            timings=timings,
        ), 200

    except ValueError as exc:
        logger.error("Validation error: %s", exc)
        return _response(match=False, similarity=0.0, liveness=None,
                         threshold=matcher.threshold, timings=timings,
                         error=str(exc)), 400

    except Exception:
        logger.error("Unexpected error:\n%s", traceback.format_exc())
        return _response(match=False, similarity=0.0, liveness=None,
                         threshold=matcher.threshold, timings=timings,
                         error="Internal server error."), 500


# ── Debug Verify ──────────────────────────────────────────────────────────────
DEBUG_DIR = Path("debug_output")

@app.route("/verify/debug", methods=["POST"])
def verify_debug():
    """
    POST /verify/debug  – same as /verify but saves every intermediate image
    to  debug_output/<timestamp>/  so you can visually inspect each step.

    Saved files:
      00_id_original.jpg          raw ID image as received
      01_id_roi.jpg               top-left ROI crop before detection
      02_id_face_raw.jpg          face bbox crop (no preprocessing)
      03_id_face_prepared.jpg     face after CLAHE + denoise (ArcFace input)
      04_live_original.jpg        raw selfie as received
      05_live_face_raw.jpg        face bbox crop from selfie
      06_live_face_prepared.jpg   selfie face resized to 112×112
      07_comparison.jpg           side-by-side of both prepared faces + score
    """
    ts      = time.strftime("%Y%m%d_%H%M%S")
    out_dir = DEBUG_DIR / ts
    out_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Debug output → %s", out_dir)

    timings: dict[str, float] = {}

    try:
        # ── 1. Decode ─────────────────────────────────────────────────────────
        t = time.perf_counter()
        id_img   = decode_image_from_request(request, "id_image")
        live_img = decode_image_from_request(request, "live_image")
        timings["decode_ms"] = _ms(t)

        cv2.imwrite(str(out_dir / "00_id_original.jpg"),   id_img)
        cv2.imwrite(str(out_dir / "04_live_original.jpg"), live_img)

        # ── 2. ID ROI (what the detector sees) ───────────────────────────────
        H, W  = id_img.shape[:2]
        roi_x = int(W * 0.38)
        roi_y = int(H * 0.78)
        id_roi = id_img[0:roi_y, 0:roi_x]
        cv2.imwrite(str(out_dir / "01_id_roi.jpg"), id_roi)

        # ── 3. Liveness + ID face detection (parallel) ────────────────────────
        t = time.perf_counter()
        future_liveness = _executor.submit(liveness_det.check, live_img)
        future_id_face  = _executor.submit(face_detector.detect_and_crop_id, id_img)

        liveness_result = future_liveness.result()
        timings["liveness_ms"] = _ms(t)

        id_face_raw = future_id_face.result()
        timings["id_detect_ms"] = _ms(t)

        cv2.imwrite(str(out_dir / "02_id_face_raw.jpg"), id_face_raw)

        # ── 4. Selfie face detection ──────────────────────────────────────────
        t = time.perf_counter()
        live_face_raw = face_detector.detect_and_crop(live_img, source="selfie")
        timings["live_detect_ms"] = _ms(t)

        cv2.imwrite(str(out_dir / "05_live_face_raw.jpg"), live_face_raw)

        # ── 5. Preprocessing (what ArcFace actually receives) ─────────────────
        id_prepared   = face_embedder._prepare(id_face_raw)
        live_prepared = face_embedder._prepare(live_face_raw)

        cv2.imwrite(str(out_dir / "03_id_face_prepared.jpg"),   id_prepared)
        cv2.imwrite(str(out_dir / "06_live_face_prepared.jpg"), live_prepared)

        # ── 6. Embeddings ─────────────────────────────────────────────────────
        t = time.perf_counter()
        id_embedding   = face_embedder.embed(id_face_raw)
        live_embedding = face_embedder.embed(live_face_raw)
        timings["embed_ms"] = _ms(t)

        # ── 7. Compare ────────────────────────────────────────────────────────
        t = time.perf_counter()
        similarity, is_match, confidence = matcher.compare(id_embedding, live_embedding)
        timings["match_ms"] = _ms(t)

        # ── 8. Save side-by-side comparison image ─────────────────────────────
        _save_comparison(
            out_dir / "07_comparison.jpg",
            id_prepared, live_prepared,
            similarity, is_match, confidence,
            liveness_result,
        )

        logger.info("Debug images saved to %s", out_dir)

        return _response(
            match=is_match,
            similarity=round(float(similarity), 4),
            confidence=confidence,
            liveness=liveness_result.is_live,
            liveness_score=round(liveness_result.score, 4),
            liveness_method=liveness_result.method,
            threshold=matcher.threshold,
            timings=timings,
            debug_output=str(out_dir),
        ), 200

    except Exception:
        logger.error("Debug verify error:\n%s", traceback.format_exc())
        return jsonify({"error": traceback.format_exc(),
                        "debug_output": str(out_dir)}), 500


def _save_comparison(path, id_face, live_face, similarity, is_match, confidence, liveness=None):
    """Build a clear side-by-side debug image with labels and scores."""
    SIZE   = 224
    MARGIN = 20
    HEADER = 80
    color  = (0, 200, 0) if is_match else (0, 0, 220)

    id_s   = cv2.resize(id_face,   (SIZE, SIZE), interpolation=cv2.INTER_LANCZOS4)
    live_s = cv2.resize(live_face, (SIZE, SIZE), interpolation=cv2.INTER_LANCZOS4)

    W = SIZE * 2 + MARGIN * 3
    H = SIZE + HEADER + MARGIN * 2
    canvas = np.full((H, W, 3), 30, dtype=np.uint8)

    # Place images
    x1, x2 = MARGIN, MARGIN * 2 + SIZE
    y       = HEADER
    canvas[y:y+SIZE, x1:x1+SIZE] = id_s
    canvas[y:y+SIZE, x2:x2+SIZE] = live_s

    # Borders
    cv2.rectangle(canvas, (x1-2, y-2), (x1+SIZE+2, y+SIZE+2), (180,180,180), 2)
    cv2.rectangle(canvas, (x2-2, y-2), (x2+SIZE+2, y+SIZE+2), (180,180,180), 2)

    # Labels under images
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(canvas, "ID Card Face",  (x1+30, y+SIZE+22), font, 0.6, (200,200,200), 1)
    cv2.putText(canvas, "Live Selfie",   (x2+40, y+SIZE+22), font, 0.6, (200,200,200), 1)

    # Header: result
    verdict = "MATCH" if is_match else "NO MATCH"
    cv2.putText(canvas, f"{verdict}  |  sim={similarity:.4f}  |  conf={confidence}",
                (MARGIN, 30), font, 0.65, color, 2)
    if liveness:
        cv2.putText(canvas,
                    f"liveness={liveness.is_live} ({liveness.method}, score={liveness.score:.3f})",
                    (MARGIN, 58), font, 0.55, (180,180,180), 1)

    # Similarity bar
    bar_x, bar_y, bar_w, bar_h = MARGIN, y + SIZE + 36, SIZE*2+MARGIN, 14
    cv2.rectangle(canvas, (bar_x, bar_y), (bar_x+bar_w, bar_y+bar_h), (60,60,60), -1)
    fill = int(bar_w * max(0, min(1, similarity)))
    cv2.rectangle(canvas, (bar_x, bar_y), (bar_x+fill, bar_y+bar_h), color, -1)
    cv2.putText(canvas, f"{similarity*100:.1f}%",
                (bar_x+bar_w+8, bar_y+11), font, 0.5, (200,200,200), 1)

    cv2.imwrite(str(path), canvas)



def _ms(t_start: float) -> float:
    return round((time.perf_counter() - t_start) * 1000, 1)


def _response(**kwargs) -> dict:
    timings = kwargs.pop("timings", {})
    total   = sum(timings.values())
    return jsonify({**kwargs, "latency_ms": round(total, 1), "timings": timings})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)