# Egyptian National ID Verification System  v2

> **Note:** This service is a component of the **FixPay Backend** infrastructure.

Production-optimised Flask API — compares the face on an Egyptian national ID card against a live selfie using RetinaFace + ArcFace.

---

## What's new in v2

| Area | v1 | v2 |
|---|---|---|
| ID face detection | Full-image scan | ROI-first (top-left 38% × 78%) → **74% less area** |
| Input resolution | Full-res sent to model | Downscaled to max 640px → **~30% faster** |
| Pipeline | Sequential | Liveness + ID detection run **in parallel** |
| Embeddings | Two separate calls | **Batch inference** (one forward pass for both faces) |
| Liveness | Heuristic only | Silent-Face CNN (primary) with heuristic fallback |
| Model loading | On first request | **Warm-up at startup** (zero cold-start) |
| Response | match + similarity | + `confidence`, `latency_ms`, per-step `timings` |
| Logging | Plain text | **Structured JSON** (LOG_FORMAT=json) or human-readable |
| Docker | Single stage | **Multi-stage build** (models pre-baked into image) |

---

## Architecture

```
POST /verify
     │
     ├─[parallel]─────────────────────────────────────┐
     │                                                  │
     │  Liveness check (Silent-Face / heuristic)       ID ROI crop (top-left 38%×78%)
     │       ↓                                              ↓
     │  fail → reject                                  RetinaFace on small ROI
     │                                                       ↓
     │                                                  crop ID face
     │◄────────────────────────────────────────────────┘
     │
     │  RetinaFace on selfie → crop live face
     │
     ├─[parallel]──────────────────────┐
     │  ArcFace embed (ID face)        ArcFace embed (live face)
     │◄────────────────────────────────┘
     │
     │  Cosine similarity → match / confidence
     │
     └─ JSON response
```

---

## Project Structure

```
id_verification_v2/
├── app.py
├── requirements.txt
├── Dockerfile
├── test_client.py
├── services/
│   ├── face_detector.py      # RetinaFace + ROI + downscaling + warm-up
│   ├── liveness_detector.py  # Silent-Face CNN (auto-fallback to heuristic)
│   ├── face_embedder.py      # ArcFace + batch embed + warm-up
│   └── matcher.py            # Cosine similarity + confidence band
└── utils/
    ├── image_utils.py        # Multipart decode + EXIF orientation fix
    └── logger.py             # Structured JSON / human-readable logging
```

---

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py                   # dev server
```

**Production:**
```bash
gunicorn -w 4 -b 0.0.0.0:5000 --timeout 30 app:app
```

**Docker:**
```bash
docker build -t id-verify-v2 .
docker run -p 5000:5000 id-verify-v2
```

---

## API

### `POST /verify`

**Request** – `multipart/form-data`

| Field | Description |
|---|---|
| `id_image` | Egyptian national ID card photo |
| `live_image` | Live selfie |

**Response**

```json
{
  "match":       true,
  "similarity":  0.7832,
  "confidence":  "HIGH",
  "liveness":    true,
  "threshold":   0.45,
  "latency_ms":  210.4,
  "timings": {
    "decode_ms":      12.1,
    "liveness_ms":    48.3,
    "id_detect_ms":   95.2,
    "live_detect_ms": 88.7,
    "embed_ms":       52.1,
    "match_ms":        0.3
  },
  "error": null
}
```

Confidence levels: `HIGH` (sim ≥ 0.70) · `MEDIUM` (≥ 0.55) · `LOW` (≥ threshold) · `NO_MATCH`

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SIMILARITY_THRESHOLD` | `0.45` | Cosine similarity match threshold |
| `MAX_IMAGE_BYTES` | `10485760` | Max upload size (10 MB) |
| `LOG_LEVEL` | `INFO` | DEBUG / INFO / WARNING |
| `LOG_FORMAT` | `text` | `text` or `json` |

---

## Benchmarking

```bash
python test_client.py --id id.jpg --selfie selfie.jpg --bench 20
```

Outputs min / max / mean / median / p95 latencies.

---

## GPU Acceleration

In `face_detector.py` and `face_embedder.py`, change:
```python
providers = ["CPUExecutionProvider"]
# → 
providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
```
And in `requirements.txt`, swap `onnxruntime` for `onnxruntime-gpu`.
