"""
In-memory request metrics for GET /api/v1/system/stats.
Per-process: with several gunicorn workers each worker reports its own numbers.
"""
import threading
import time
from collections import deque
from datetime import datetime, timezone
from typing import Dict


class RequestMetrics:
    def __init__(self, window_seconds: int = 60, latency_samples: int = 1000):
        self._lock = threading.Lock()
        self._window = window_seconds
        self.started_at = datetime.now(timezone.utc)
        self.total_requests = 0
        self.client_errors = 0   # 4xx
        self.server_errors = 0   # 5xx
        self._recent: deque = deque()                        # monotonic timestamps
        self._latencies: deque = deque(maxlen=latency_samples)

    def record(self, status_code: int, duration_ms: float) -> None:
        now = time.monotonic()
        with self._lock:
            self.total_requests += 1
            if 400 <= status_code < 500:
                self.client_errors += 1
            elif status_code >= 500:
                self.server_errors += 1
            self._recent.append(now)
            self._latencies.append(duration_ms)
            self._trim(now)

    def _trim(self, now: float) -> None:
        cutoff = now - self._window
        while self._recent and self._recent[0] < cutoff:
            self._recent.popleft()

    def snapshot(self) -> Dict:
        with self._lock:
            self._trim(time.monotonic())
            latencies = sorted(self._latencies)
            per_minute = len(self._recent) * 60 / self._window
            snapshot = {
                "started_at": self.started_at.isoformat(),
                "uptime_seconds": round((datetime.now(timezone.utc) - self.started_at).total_seconds()),
                "total_requests": self.total_requests,
                "requests_per_minute": round(per_minute, 1),
                "client_errors": self.client_errors,
                "server_errors": self.server_errors,
            }
        if latencies:
            snapshot["latency_ms"] = {
                "avg": round(sum(latencies) / len(latencies), 2),
                "p95": round(latencies[min(len(latencies) - 1, int(len(latencies) * 0.95))], 2),
                "max": round(latencies[-1], 2),
                "samples": len(latencies),
            }
        return snapshot


request_metrics = RequestMetrics()
