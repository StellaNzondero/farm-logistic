from __future__ import annotations

from datetime import datetime, timezone

from ..db import db


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class LedgerBlock(db.Model):
    __tablename__ = "ledger_blocks"

    id = db.Column(db.Integer, primary_key=True)
    idx = db.Column(db.Integer, nullable=False, unique=True, index=True)
    prev_hash = db.Column(db.String(128), nullable=False)
    hash = db.Column(db.String(128), nullable=False, unique=True, index=True)
    ts = db.Column(db.DateTime, nullable=False, default=_utcnow, index=True)
    event_type = db.Column(db.String(64), nullable=False, index=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    payload_json = db.Column(db.Text, nullable=False)

    actor = db.relationship("User", lazy=True)

    def to_public(self) -> dict:
        return {
            "idx": self.idx,
            "prevHash": self.prev_hash,
            "hash": self.hash,
            "ts": self.ts.isoformat() if self.ts else None,
            "eventType": self.event_type,
            "actorUserId": self.actor_user_id,
            "actorName": self.actor.full_name if self.actor else "Système",
            "payload": self.payload_json,
        }

