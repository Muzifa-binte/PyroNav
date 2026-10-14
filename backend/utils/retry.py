"""
Retry with exponential backoff, for transient failures (database restarts,
a teammate's service briefly unavailable, …).

    from utils.retry import retry

    @retry(attempts=3, base_delay=0.5, exceptions=(DatabaseUnavailableError,))
    def load_graph(): ...

    @retry(attempts=5, exceptions=(httpx.TransportError,))
    async def call_service(): ...

Delays grow as base_delay * 2**n (0.5 s, 1 s, 2 s, …) capped at max_delay.
The final failure is re-raised unchanged.
"""
import asyncio
import functools
import inspect
import logging
import time
from typing import Callable, Tuple, Type

logger = logging.getLogger(__name__)


def retry(
    attempts: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 8.0,
    exceptions: Tuple[Type[BaseException], ...] = (Exception,),
):
    if attempts < 1:
        raise ValueError("attempts must be >= 1")

    def delay_for(attempt: int) -> float:
        return min(base_delay * (2 ** attempt), max_delay)

    def decorator(func: Callable):
        if inspect.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                for attempt in range(attempts):
                    try:
                        return await func(*args, **kwargs)
                    except exceptions as exc:
                        if attempt == attempts - 1:
                            raise
                        wait = delay_for(attempt)
                        logger.warning("%s failed (%s) - retry %d/%d in %.1fs",
                                       func.__qualname__, exc, attempt + 1, attempts - 1, wait)
                        await asyncio.sleep(wait)
            return async_wrapper

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            for attempt in range(attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as exc:
                    if attempt == attempts - 1:
                        raise
                    wait = delay_for(attempt)
                    logger.warning("%s failed (%s) - retry %d/%d in %.1fs",
                                   func.__qualname__, exc, attempt + 1, attempts - 1, wait)
                    time.sleep(wait)
        return sync_wrapper

    return decorator
