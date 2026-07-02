from __future__ import annotations

from ..db import db


class MarketCatalogEntry(db.Model):
    __tablename__ = "market_catalog_entries"
    __table_args__ = (
        db.UniqueConstraint(
            "admin1",
            "admin2",
            "market",
            "market_id",
            "latitude",
            "longitude",
            "category",
            "commodity",
            "commodity_id",
            name="uq_market_catalog_entry",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    admin1 = db.Column(db.String(120), nullable=False, index=True)
    admin1_code = db.Column(db.Integer, nullable=False, index=True)
    admin2 = db.Column(db.String(120), nullable=False, index=True)
    admin2_code = db.Column(db.Integer, nullable=False, index=True)
    market = db.Column(db.String(160), nullable=False, index=True)
    market_code = db.Column(db.Integer, nullable=False, index=True)
    market_id = db.Column(db.Integer, nullable=False, index=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(120), nullable=False, index=True)
    category_code = db.Column(db.Integer, nullable=False, index=True)
    commodity = db.Column(db.String(160), nullable=False, index=True)
    commodity_code = db.Column(db.Integer, nullable=False, index=True)
    commodity_id = db.Column(db.Integer, nullable=False, index=True)

    def display_label(self) -> str:
        return (
            f"{self.admin1} / {self.admin2} / {self.market} / "
            f"{self.category} / {self.commodity}"
        )

    def to_public(self) -> dict:
        return {
            "id": self.id,
            "label": self.display_label(),
            "admin1": self.admin1,
            "admin1Code": self.admin1_code,
            "admin2": self.admin2,
            "admin2Code": self.admin2_code,
            "market": self.market,
            "marketCode": self.market_code,
            "marketId": self.market_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "category": self.category,
            "categoryCode": self.category_code,
            "commodity": self.commodity,
            "commodityCode": self.commodity_code,
            "commodityId": self.commodity_id,
        }
