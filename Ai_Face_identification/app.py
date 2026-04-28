"""
Egyptian National ID Verification System  v2.1
=============================================
Endpoints:
  POST /verify       – production verify (OCR + Face Match + Save Results)
  POST /process-id   – OCR extraction only
  GET  /health
"""
import logging
import os
import time
import traceback
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import cv2
import numpy as np
from flask import Flask, request, jsonify, g
from flask_cors import CORS

# --- 🟢 Face Verification Imports ---
from services.face_detector import FaceDetector
from services.liveness_detector import LivenessDetector
from services.face_embedder import FaceEmbedder
from services.matcher import FaceMatcher
from utils.image_utils import decode_image_from_request
from utils.logger import setup_logger

# --- 🟢 Your OCR Imports ---
from ocr_processor import detect_and_process_id_card

setup_logger()
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ── Initialising models ──────────────────────────────────────────────────────
logger.info("Initialising AI models...")
_t_start = time.perf_counter()

face_detector = FaceDetector()
liveness_det  = LivenessDetector()
face_embedder = FaceEmbedder()
matcher       = FaceMatcher()

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="api_tasks")
logger.info("All AI Models ready in %.2fs", time.perf_counter() - _t_start)

# مجلد حفظ النتائج للأدمن
RESULTS_DIR = Path("results")
RESULTS_DIR.mkdir(exist_ok=True)

# ── 1. OCR Extraction (/process-id) ──────────────────────────────────
@app.route('/process-id', methods=['POST'])
def process_id():
    if 'id_image' not in request.files:
        return jsonify({"status": "fail", "message": "No file part with name 'id_image'"}), 400
    
    file = request.files['id_image']
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        results = detect_and_process_id_card(tmp_path)
        
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

        return jsonify({
            "status": "success",
            "data": {
                "full_name": results[2],
                "national_id": results[3],
                "address": results[4],
                "birth_date": results[5],
                "governorate": results[6],
                "gender": results[7]
            }
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ── 2. Full Identity Verification (/verify) ──────────────────────────
@app.route("/verify", methods=["POST"])
def verify():
    if 'id_image' not in request.files or 'live_image' not in request.files:
        return jsonify({"status": "fail", "message": "Missing images"}), 400

    id_file = request.files['id_image']
    live_file = request.files['live_image']
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            id_file.save(tmp.name)
            tmp_path = tmp.name
        
        ocr_results = detect_and_process_id_card(tmp_path)
        
       
        id_img = cv2.imdecode(np.frombuffer(id_file.read(), np.uint8), cv2.IMREAD_COLOR)
        live_img = cv2.imdecode(np.frombuffer(live_file.read(), np.uint8), cv2.IMREAD_COLOR)
        
       
        id_emb = face_embedder.get_embedding(id_img)
        live_emb = face_embedder.get_embedding(live_img)
        is_match, similarity_score = matcher.compute_sim(id_emb, live_emb)
        liveness_res = liveness_det.check(live_img)

        ts = time.strftime("%Y%m%d_%H%M%S")
        verdict = "MATCH" if is_match else "NOMATCH"
        filename = f"{ts}_{verdict}_{similarity_score:.3f}.jpg"
        result_path = RESULTS_DIR / filename
        
        h, w = 400, 400
        combined = np.hstack((cv2.resize(id_img, (w, h)), cv2.resize(live_img, (w, h))))
        color = (0, 255, 0) if is_match else (0, 0, 255)
        cv2.putText(combined, f"{verdict} - Sim: {similarity_score:.2f}", (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
        cv2.imwrite(str(result_path), combined)

        # Cleanup
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

        return jsonify({
            "status": "success",
            "match": bool(is_match), 
            "extracted_data": {
                "national_id": ocr_results[3],
                "birth_date": ocr_results[5]
            },
            "similarity": float(similarity_score), 
            "liveness": bool(liveness_res.is_live),
            "result_image_path": str(result_path)
        }), 200

    except Exception as e:
        logger.error(f"Verification Error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "FixPay AI Combined Service"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)