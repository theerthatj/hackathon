import asyncio
import json
from typing import Any


class SseManager:
    def __init__(self):
        self._queues: set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._queues.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._queues.discard(q)

    async def broadcast(self, event: str, data: Any):
        payload = f"event: {event}\ndata: {json.dumps(data)}\n\n"
        for q in list(self._queues):
            try:
                await q.put(payload)
            except Exception:
                self._queues.discard(q)


sse_manager = SseManager()
