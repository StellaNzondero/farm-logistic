from __future__ import annotations

from datetime import datetime, timezone

from ..db import db


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    owner_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(120), nullable=True)
    unit = db.Column(db.String(40), nullable=True)
    quantity = db.Column(db.Float, nullable=True)
    starting_price = db.Column(db.Integer, nullable=False, default=0)
    currency = db.Column(db.String(8), nullable=False, default="NGN")
    status = db.Column(db.String(24), nullable=False, default="DRAFT", index=True)
    catalog_entry_id = db.Column(
        db.Integer, db.ForeignKey("market_catalog_entries.id"), nullable=True, index=True
    )
    image_path = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=_utcnow, onupdate=_utcnow
    )

    owner = db.relationship("User", backref=db.backref("products", lazy=True))
    catalog_entry = db.relationship("MarketCatalogEntry", lazy="joined")

    def to_public(self) -> dict:
        catalog_entry = self.catalog_entry
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "location": self.location,
            "unit": self.unit,
            "quantity": self.quantity,
            "startingPrice": self.starting_price,
            "currency": self.currency,
            "status": self.status,
            "ownerUserId": self.owner_user_id,
            "catalogEntryId": self.catalog_entry_id,
            "catalogEntry": catalog_entry.to_public() if catalog_entry else None,
            "imagePath": self.image_path,
        }
