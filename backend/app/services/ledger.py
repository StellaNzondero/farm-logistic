from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone

from sqlalchemy import func

from ..db import db
from ..models import LedgerBlock


def append_block(event_type: str, payload: dict, actor_user_id: int | None = None) -> LedgerBlock:
    last_idx = db.session.query(func.max(LedgerBlock.idx)).scalar()
    if last_idx is None:
        idx = 0
        prev_hash = "GENESIS"
    else:
        idx = int(last_idx) + 1
        last_block = LedgerBlock.query.filter_by(idx=int(last_idx)).first()
        prev_hash = last_block.hash if last_block else "GENESIS"

    ts = datetime.now(timezone.utc)
    payload_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    raw = f"{idx}|{prev_hash}|{ts.isoformat()}|{event_type}|{actor_user_id}|{payload_json}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()

    block = LedgerBlock(
        idx=idx,
        prev_hash=prev_hash,
        hash=digest,
        ts=ts,
        event_type=event_type,
        actor_user_id=actor_user_id,
        payload_json=payload_json,
    )
    db.session.add(block)
    db.session.commit()
    return block

