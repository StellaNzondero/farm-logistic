from __future__ import annotations

from datetime import datetime, timezone

from ..db import db


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Auction(db.Model):
    __tablename__ = "auctions"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(
        db.Integer, db.ForeignKey("products.id"), nullable=False, unique=True, index=True
    )
    starts_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    ends_at = db.Column(db.DateTime, nullable=False, index=True)
    status = db.Column(db.String(24), nullable=False, default="OPEN", index=True)

    current_price = db.Column(db.Integer, nullable=False, default=0)
    current_winner_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True, index=True
    )

    # Payment Tracking
    payment_status = db.Column(db.String(32), nullable=False, default="NONE", index=True)
    payment_transaction_id = db.Column(db.String(128), nullable=True, index=True)
    payment_failure_reason = db.Column(db.Text, nullable=True)

    created_by_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True, index=True
    )

    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=_utcnow, onupdate=_utcnow)

    product = db.relationship("Product", backref=db.backref("auction", uselist=False))
    current_winner = db.relationship(
        "User", foreign_keys=[current_winner_user_id], lazy=True
    )

    def to_public(self) -> dict:
        def _iso(dt: datetime | None) -> str | None:
            if dt is None:
                return None
            if dt.tzinfo is None:
                return dt.isoformat() + "Z"
            return dt.isoformat()

        return {
            "id": self.id,
            "productId": self.product_id,
            "startsAt": _iso(self.starts_at),
            "endsAt": _iso(self.ends_at),
            "status": self.status,
            "currentPrice": self.current_price,
            "currentWinnerUserId": self.current_winner_user_id,
            "currentWinnerName": self.current_winner.full_name if self.current_winner else None,
            "paymentStatus": self.payment_status,
            "paymentFailureReason": self.payment_failure_reason,
        }

