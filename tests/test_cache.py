from coopgest.cache import cached, invalidate_cache


def test_cached_reuses_value_until_invalidated():
    invalidate_cache()
    calls = {"count": 0}

    @cached(ttl_seconds=60)
    def expensive(value):
        calls["count"] += 1
        return f"result-{value}-{calls['count']}"

    assert expensive("a") == "result-a-1"
    assert expensive("a") == "result-a-1"
    assert calls["count"] == 1

    invalidate_cache()

    assert expensive("a") == "result-a-2"


def test_cached_accepts_unhashable_arguments():
    invalidate_cache()
    calls = {"count": 0}

    @cached(ttl_seconds=60)
    def summarize(payload):
        calls["count"] += 1
        return len(payload)

    assert summarize(["one", "two"]) == 2
    assert summarize(["one", "two"]) == 2
    assert calls["count"] == 1
