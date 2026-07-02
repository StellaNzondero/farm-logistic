from __future__ import annotations

from datetime import datetime, timezone

from ..db import db


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Bid(db.Model):
    __tablename__ = "bids"

    id = db.Column(db.Integer, primary_key=True)
    auction_id = db.Column(
        db.Integer, db.ForeignKey("auctions.id"), nullable=False, index=True
    )
    product_id = db.Column(
        db.Integer, db.ForeignKey("products.id"), nullable=False, index=True
    )
    bidder_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    amount = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow, index=True)

    auction = db.relationship("Auction", backref=db.backref("bids", lazy=True))
    bidder = db.relationship("User", lazy=True)

    def to_public(self) -> dict:
        return {
            "id": self.id,
            "auctionId": self.auction_id,
            "productId": self.product_id,
            "bidderUserId": self.bidder_user_id,
            "bidderName": self.bidder.full_name if self.bidder else "Anonyme",
            "amount": self.amount,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }

