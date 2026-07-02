from __future__ import annotations

from ..db import db
from ..models import Setting

AUCTION_DEFAULT_DURATION_KEY = "auction_default_duration_minutes"


def get_auction_default_duration_minutes() -> int:
    row = db.session.get(Setting, AUCTION_DEFAULT_DURATION_KEY)
    if row is None:
        return 60
    try:
        value = int(row.value)
    except (TypeError, ValueError):
        return 60
    return max(1, min(24 * 60, value))


def set_auction_default_duration_minutes(minutes: int) -> int:
    minutes = int(minutes)
    minutes = max(1, min(24 * 60, minutes))
    row = db.session.get(Setting, AUCTION_DEFAULT_DURATION_KEY)
    if row is None:
        row = Setting(key=AUCTION_DEFAULT_DURATION_KEY, value=str(minutes))
        db.session.add(row)
    else:
        row.value = str(minutes)
    db.session.commit()
    return minutes
