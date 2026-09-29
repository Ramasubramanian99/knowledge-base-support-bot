import random
import threading
import time
from collections import deque
from collections.abc import Callable
from functools import lru_cache
from typing import TypeVar

from google import genai
from google.genai import errors, types

from app.config import settings

T = TypeVar("T")

# Gemini accepts at most 100 texts per embed request.
MAX_EMBED_BATCH = 100
MAX_RETRIES = 5
# A user is waiting on /query (and serverless functions have a time limit), so
# generation gives up on a model after ~3s of backoff instead of ~15s.
GENERATE_RETRIES = 3
# Quota (429) and Google-side failures that usually clear on their own. 503 is
# "model experiencing high demand": overload on Google's side, not our quota.
RETRYABLE_CODES = {429, 500, 503, 504}


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
    # Jitter so parallel requests that failed together don't retry together.
    return 2.0**attempt + random.uniform(0, 1)


def _with_retry(call: Callable[[], T], label: str, attempts: int = MAX_RETRIES) -> T:
    """Run `call`, retrying quota errors and Google-side overload (503 etc.)."""
    for attempt in range(attempts):
        try:
            return call()
        except errors.APIError as err:
            if err.code not in RETRYABLE_CODES or attempt == attempts - 1:
                raise
            delay = _retry_delay(err, attempt)
            print(f"{label} got {err.code}, retrying in {delay:.1f}s")
            time.sleep(delay)
    raise RuntimeError("unreachable")


def _embed_batch(batch: list[str], task_type: str) -> list[list[float]]:
    def call() -> list[list[float]]:
        embed_limiter.acquire(len(batch))
        response = get_gemini().models.embed_content(
            model=settings.embedding_model,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=settings.embedding_dim,
            ),
        )
        return [embedding.values for embedding in response.embeddings]

    return _with_retry(call, "embed")


def generate(contents: str, system_instruction: str) -> str:
    models = [settings.gemini_model]
    if settings.gemini_fallback_model:
        models.append(settings.gemini_fallback_model)

    for i, model in enumerate(models):
        try:
            return _with_retry(
                lambda: get_gemini().models.generate_content(
                    model=model,
                    contents=contents,
                    config=types.GenerateContentConfig(system_instruction=system_instruction),
                ).text
                or "",
                f"generate {model}",
                GENERATE_RETRIES,
            )
        except errors.APIError as err:
            if err.code not in RETRYABLE_CODES or i == len(models) - 1:
                raise
            print(f"{model} still unavailable, falling back to {models[i + 1]}")
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
