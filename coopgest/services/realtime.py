from __future__ import annotations

import json
import queue
import threading

_sse_queues: dict[str, list[queue.Queue]] = {}
_sse_lock = threading.Lock()


def broadcast_project_data(project_id: int, event_type: str, data: dict):
    """Notify all SSE clients connected to a project."""
    key = str(project_id)
    with _sse_lock:
        listeners = list(_sse_queues.get(key, []))

    message = {"type": event_type, "data": data}
    for listener in listeners:
        try:
            listener.put_nowait(message)
        except queue.Full:
            continue


def project_event_stream(project_id: int):
    q: queue.Queue = queue.Queue(maxsize=20)
    key = str(project_id)
    with _sse_lock:
        _sse_queues.setdefault(key, []).append(q)
    try:
        yield f"data: {json.dumps({'type': 'connected'})}\n\n"
        while True:
            try:
                event = q.get(timeout=25)
                yield f"data: {json.dumps(event)}\n\n"
            except queue.Empty:
                yield ": heartbeat\n\n"
    finally:
        with _sse_lock:
            queues = _sse_queues.get(key, [])
            if q in queues:
                queues.remove(q)
