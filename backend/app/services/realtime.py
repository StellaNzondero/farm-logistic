from __future__ import annotations

import queue
import threading
from dataclasses import dataclass


@dataclass(frozen=True)
class Event:
    event: str
    data: dict


class ProductPubSub:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._subs: dict[int, set[queue.Queue[Event]]] = {}

    def subscribe(self, product_id: int) -> queue.Queue[Event]:
        q: queue.Queue[Event] = queue.Queue(maxsize=100)
        with self._lock:
            self._subs.setdefault(product_id, set()).add(q)
        return q

    def unsubscribe(self, product_id: int, q: queue.Queue[Event]) -> None:
        with self._lock:
            subs = self._subs.get(product_id)
            if not subs:
                return
            subs.discard(q)
            if not subs:
                self._subs.pop(product_id, None)

    def publish(self, product_id: int, event: str, data: dict) -> None:
        with self._lock:
            subs = list(self._subs.get(product_id, set()))
        for q in subs:
            try:
                q.put_nowait(Event(event=event, data=data))
            except queue.Full:
                # best-effort: drop if slow consumer
                pass


pubsub = ProductPubSub()

