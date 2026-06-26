from __future__ import annotations

import functools
import threading
import time
from collections.abc import Callable
from typing import Any, TypeVar, cast

F = TypeVar("F", bound=Callable[..., Any])

_cache: dict[tuple[str, tuple[Any, ...], tuple[tuple[str, Any], ...]], tuple[float, Any]] = {}
_lock = threading.RLock()


def _normalise(value: Any) -> Any:
    try:
        hash(value)
    except TypeError:
        return repr(value)
    return value


def _make_key(func: Callable[..., Any], args: tuple[Any, ...], kwargs: dict[str, Any]):
    return (
        f"{func.__module__}.{func.__qualname__}",
        tuple(_normalise(arg) for arg in args),
        tuple(sorted((key, _normalise(value)) for key, value in kwargs.items())),
    )


def cached(ttl_seconds: int = 60):
    """Small in-process TTL cache for pure helper functions."""
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            key = _make_key(func, args, kwargs)
            now = time.monotonic()
            with _lock:
                item = _cache.get(key)
                if item:
                    expires_at, value = item
                    if expires_at > now:
                        return value
                    _cache.pop(key, None)

            value = func(*args, **kwargs)
            with _lock:
                _cache[key] = (now + ttl_seconds, value)
            return value

        return cast(F, wrapper)

    return decorator


def invalidate_cache() -> None:
    """Clear all cached values."""
    with _lock:
        _cache.clear()
