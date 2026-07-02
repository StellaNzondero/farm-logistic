from __future__ import annotations

import csv
from pathlib import Path

from ..db import db
from ..models import Product
from ..models.catalog_entry import MarketCatalogEntry


def _csv_path() -> Path:
    return Path(__file__).resolve().parents[2] / "unique_app_data_rdc.csv"


def _normalize_text(value: str | None) -> str:
    return (value or "").strip()


def _load_unique_code_map(rows: list[dict[str, str]], field: str) -> dict[str, int]:
    values = sorted({_normalize_text(row.get(field)) for row in rows if _normalize_text(row.get(field))})
    return {value: index + 1 for index, value in enumerate(values)}


def ensure_market_catalog_seed() -> None:
    if MarketCatalogEntry.query.first() is not None:
        return

    csv_path = _csv_path()
    if not csv_path.exists():
        return

    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))

    if not rows:
        return

    code_maps = {
        field: _load_unique_code_map(rows, field)
        for field in ("admin1", "admin2", "market", "category", "commodity")
    }

    entries: list[MarketCatalogEntry] = []
    for row in rows:
        admin1 = _normalize_text(row.get("admin1"))
        admin2 = _normalize_text(row.get("admin2"))
        market = _normalize_text(row.get("market"))
        category = _normalize_text(row.get("category"))
        commodity = _normalize_text(row.get("commodity"))

        if not (admin1 and admin2 and market and category and commodity):
            continue

        try:
            entries.append(
                MarketCatalogEntry(
                    admin1=admin1,
                    admin1_code=code_maps["admin1"][admin1],
                    admin2=admin2,
                    admin2_code=code_maps["admin2"][admin2],
                    market=market,
                    market_code=code_maps["market"][market],
                    market_id=int(float(row.get("market_id") or 0)),
                    latitude=float(row.get("latitude") or 0),
                    longitude=float(row.get("longitude") or 0),
                    category=category,
                    category_code=code_maps["category"][category],
                    commodity=commodity,
                    commodity_code=code_maps["commodity"][commodity],
                    commodity_id=int(float(row.get("commodity_id") or 0)),
                )
            )
        except (TypeError, ValueError):
            continue

    if entries:
        db.session.add_all(entries)
        db.session.commit()


def list_catalog_entries() -> list[MarketCatalogEntry]:
    return (
        MarketCatalogEntry.query.order_by(
            MarketCatalogEntry.admin1_code,
            MarketCatalogEntry.admin2_code,
            MarketCatalogEntry.market_code,
            MarketCatalogEntry.category_code,
            MarketCatalogEntry.commodity_code,
        )
        .all()
    )


def get_catalog_entry(entry_id: int | str | None) -> MarketCatalogEntry | None:
    if entry_id is None or entry_id == "":
        return None
    try:
        return db.session.get(MarketCatalogEntry, int(entry_id))
    except (TypeError, ValueError):
        return None


def get_default_catalog_entry() -> MarketCatalogEntry | None:
    return (
        MarketCatalogEntry.query.order_by(
            MarketCatalogEntry.admin1_code,
            MarketCatalogEntry.admin2_code,
            MarketCatalogEntry.market_code,
            MarketCatalogEntry.category_code,
            MarketCatalogEntry.commodity_code,
        )
        .first()
    )


def serialize_catalog_entries() -> list[dict]:
    return [entry.to_public() for entry in list_catalog_entries()]


def catalog_entry_for_product(product: Product) -> MarketCatalogEntry | None:
    return getattr(product, "catalog_entry", None)
