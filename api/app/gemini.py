import threading
import time
from collections import deque
from functools import lru_cache

from google import genai
from google.genai import errors, types

from app.config import settings

# Gemini accepts at most 100 texts per embed request.
MAX_EMBED_BATCH = 100
MAX_RETRIES = 5


class RateLimiter:
   

    def __init__(self, limit: int, period: float = 60.0):
        self.limit = limit
        self.period = period
        self._sent: deque[tuple[float, int]] = deque()  # (timestamp, units)
        self._total = 0
        self._lock = threading.Lock()

    def acquire(self, units: int = 1) -> None:
        with self._lock:
            while True:
                now = time.monotonic()
                while self._sent and now - self._sent[0][0] >= self.period:
                    self._total -= self._sent.popleft()[1]
                if self._total + units <= self.limit:
                    self._sent.append((now, units))
                    self._total += units
                    return
                time.sleep(self.period - (now - self._sent[0][0]))


# The free tier counts every text in a batch as one request, so the limiter
# counts texts, not API calls.
embed_limiter = RateLimiter(settings.embed_requests_per_minute)
embed_batch_size = min(MAX_EMBED_BATCH, settings.embed_requests_per_minute)


@lru_cache
def get_gemini() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _retry_delay(err: errors.APIError, attempt: int) -> float:
    details = (err.details or {}).get("error", {}).get("details", [])
    for detail in details:
        if detail.get("@type", "").endswith("RetryInfo"):
            try:
                return float(detail["retryDelay"].rstrip("s")) + 1
            except (KeyError, ValueError):
                break
    return 2.0**attempt


def _embed_batch(batch: list[str], task_type: str) -> list[list[float]]:
    for attempt in range(MAX_RETRIES):
        embed_limiter.acquire(len(batch))
        try:
            response = get_gemini().models.embed_content(
                model=settings.embedding_model,
                contents=batch,
                config=types.EmbedContentConfig(
                    task_type=task_type,
                    output_dimensionality=settings.embedding_dim,
                ),
            )
            return [embedding.values for embedding in response.embeddings]
        except errors.APIError as err:
            # Another process (the API vs. a script) can share the quota, so
            # the limiter alone can still see a 429.
            if err.code != 429 or attempt == MAX_RETRIES - 1:
                raise
            delay = _retry_delay(err, attempt)
            print(f"embed rate limited, retrying in {delay:.0f}s")
            time.sleep(delay)
    raise RuntimeError("unreachable")


def embed(texts: list[str], task_type: str) -> list[list[float]]:
    """
    Embed texts in batches. Use RETRIEVAL_DOCUMENT for chunks and
    RETRIEVAL_QUERY for questions so the two land in matching spaces.
    """
    vectors: list[list[float]] = []
    for start in range(0, len(texts), embed_batch_size):
        vectors.extend(_embed_batch(texts[start : start + embed_batch_size], task_type))
    return vectors
