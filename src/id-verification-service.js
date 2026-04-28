/**
 * id-verification-service.js
 * ───────────────────────────
 * Express.js middleware that forwards ID verification requests
 * to the Python Flask API and returns the result.
 *
 * Install deps:
 *   npm install express multer axios form-data
 *
 * Usage:
 *   node id-verification-service.js
 *
 * Endpoints:
 *   POST /api/verify-identity   – multipart: id_image + live_image
 *   GET  /api/verify-health     – checks Python API is alive
 */

import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import path from "path";
import fs from "fs";

const app = express();
const router = express.Router();

// ── Config ────────────────────────────────────────────────────────────────────
const PYTHON_API_URL = process.env.PYTHON_API_URL ?? "http://localhost:5000";
const PORT = process.env.PORT ?? 3000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ── Multer (in-memory, no disk write) ─────────────────────────────────────────
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/bmp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    ALLOWED_TYPES.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

// ── Health check ──────────────────────────────────────────────────────────────
router.get("/verify-health", async (_req, res) => {
  try {
    const { data } = await axios.get(`${PYTHON_API_URL}/health`, { timeout: 5_000 });
    res.json({ node: "ok", python: data });
  } catch (err) {
    res.status(503).json({ node: "ok", python: "unreachable", error: err.message });
  }
});

// ── Main verification endpoint ────────────────────────────────────────────────
router.post(
  "/verify-identity",
  upload.fields([
    { name: "id_image", maxCount: 1 },
    { name: "live_image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // ── 1. Validate both files are present ──────────────────────────────
      const idFile = req.files?.["id_image"]?.[0];
      const liveFile = req.files?.["live_image"]?.[0];

      if (!idFile) return res.status(400).json({ error: "Missing field: id_image" });
      if (!liveFile) return res.status(400).json({ error: "Missing field: live_image" });

      // ── 2. Build multipart form for Python API ──────────────────────────
      const form = new FormData();
      
      form.append("id_image", idFile.buffer, { filename: idFile.originalname, contentType: "image/jpeg" });
      form.append("live_image", liveFile.buffer, { filename: liveFile.originalname, contentType: "image/jpeg" });

      // ── 3. Forward to Python Flask API ──────────────────────────────────
      const { data: result } = await axios.post(
        `${PYTHON_API_URL}/verify`,
        form,
        { headers: form.getHeaders(), timeout: 30_000, maxContentLength: MAX_FILE_SIZE * 2 }
      );

      // ── 4. Return result to client ───────────────────────────────────────
      return res.status(200).json({
        success: true,
        match: result.match,
        similarity: result.similarity,
        confidence: result.confidence,
        liveness: result.liveness,
        threshold: result.threshold,
        latency_ms: result.latency_ms,
        timings: result.timings,
        result_image: result.result_image ?? null,
      });

    } catch (err) {
      if (err.response) {
        return res.status(err.response.status).json({
          success: false,
          error: err.response.data?.error ?? "Python API error",
        });
      }

      const errorMap = {
        ECONNREFUSED: [503, "Python verification service is not running."],
        ECONNABORTED: [504, "Python verification service timed out."],
      };

      const [status, message] = errorMap[err.code] ?? [500, "Internal server error."];
      if (!errorMap[err.code]) console.error("[verify-identity] Unexpected error:", err.message);

      return res.status(status).json({ success: false, error: message });
    }
  }
);

// ── Error handler for multer ──────────────────────────────────────────────────
router.use((err, _req, res, _next) => {
  const message = err instanceof multer.MulterError
    ? `Upload error: ${err.message}`
    : err.message;
  res.status(400).json({ error: message });
});

// ── Mount & start ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use("/api", router);

app.listen(PORT, () => {
  console.log(`[Node.js] ID Verification API running on http://localhost:${PORT}`);
  console.log(`[Node.js] Forwarding to Python API at ${PYTHON_API_URL}`);
});

export default app;
