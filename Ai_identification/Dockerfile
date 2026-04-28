# ── Build stage ───────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build
COPY requirements.txt .

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential git \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt \
    && apt-get purge -y build-essential git \
    && rm -rf /var/lib/apt/lists/*

# Pre-download InsightFace buffalo_l models during build
# (avoids download delay on first container start)
RUN PYTHONPATH=/install/lib/python3.11/site-packages \
    python - <<'EOF'
from insightface.app import FaceAnalysis
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=0)
print("Models downloaded.")
EOF

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Runtime deps for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY --from=builder /root/.insightface /root/.insightface
COPY . .

ENV LOG_FORMAT=json \
    LOG_LEVEL=INFO \
    SIMILARITY_THRESHOLD=0.45 \
    MAX_IMAGE_BYTES=10485760

EXPOSE 5000

# 2 workers × 2 threads; tune -w to (2×CPU cores + 1) in production
CMD ["gunicorn", \
     "--workers", "2", \
     "--threads", "2", \
     "--bind", "0.0.0.0:5000", \
     "--timeout", "30", \
     "--access-logfile", "-", \
     "app:app"]
