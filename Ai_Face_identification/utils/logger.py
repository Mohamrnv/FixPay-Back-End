"""
utils/logger.py
────────────────
Structured logging setup.
  • JSON output in production  (LOG_FORMAT=json)
  • Human-readable in dev      (LOG_FORMAT=text, default)
  • Log level via LOG_LEVEL env var (default INFO)
"""

import logging
import os
import json
import time


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps({
            "ts":      time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)),
            "level":   record.levelname,
            "logger":  record.name,
            "msg":     record.getMessage(),
        })


def setup_logger():
    level  = os.getenv("LOG_LEVEL", "INFO").upper()
    fmt    = os.getenv("LOG_FORMAT", "text").lower()

    handler = logging.StreamHandler()

    if fmt == "json":
        handler.setFormatter(_JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s – %(message)s",
            datefmt="%H:%M:%S",
        ))

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)
