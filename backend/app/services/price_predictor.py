from __future__ import annotations

import sys
import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd

from .catalog import catalog_entry_for_product

_model = None

MODEL_FEATURES = [
    "admin1",
    "admin2",
    "market",
    "market_id",
    "latitude",
    "longitude",
    "category",
    "commodity",
    "commodity_id",
    "unit",
    "year",
    "month",
]


def _load_model():
    global _model
    if _model is not None:
        return _model

    import sklearn._loss

    sys.modules["_loss"] = sklearn._loss
    setattr(sklearn._loss, "CyHalfSquaredError", sklearn._loss.HalfSquaredError)

    model_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        "ai",
        "gbr_model.joblib",
    )
    _model = joblib.load(model_path)
    return _model


def _parse_int(value, default: int) -> int:
    if value is None:
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _parse_float(value, default: float) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_prediction_payload(
    payload: dict | None, *, product=None, coordinates: tuple[float, float] | None = None
) -> dict:
    payload = (payload or {}).copy()

    if product is not None:
        payload.setdefault("title", product.title)
        payload.setdefault("description", product.description)
        payload.setdefault("location", product.location)
        payload.setdefault("unit", product.unit)
        payload.setdefault("quantity", product.quantity)
        payload.setdefault("starting_price", product.starting_price)
        payload.setdefault("currency", product.currency)
        payload.setdefault("status", product.status)
        catalog_entry = catalog_entry_for_product(product)
        if catalog_entry is not None:
            payload.setdefault("admin1", catalog_entry.admin1_code)
            payload.setdefault("admin2", catalog_entry.admin2_code)
            payload.setdefault("market", catalog_entry.market_code)
            payload.setdefault("marketId", catalog_entry.market_id)
            payload.setdefault("latitude", catalog_entry.latitude)
            payload.setdefault("longitude", catalog_entry.longitude)
            payload.setdefault("category", catalog_entry.category_code)
            payload.setdefault("commodity", catalog_entry.commodity_code)
            payload.setdefault("commodityId", catalog_entry.commodity_id)

    if coordinates is not None:
        payload["latitude"], payload["longitude"] = coordinates

    return {
        "admin1": payload.get("admin1", 22),
        "admin2": payload.get("admin2", 41),
        "market": payload.get("market", 159),
        "market_id": payload.get("marketId", payload.get("market_id", 143)),
        "latitude": payload.get("latitude", -5.92),
        "longitude": payload.get("longitude", 29.19),
        "category": payload.get("category", 2),
        "commodity": payload.get("commodity", 31),
        "commodity_id": payload.get("commodityId", payload.get("commodity_id", 185)),
        "unit": payload.get("unit", 1),
        "year": payload.get("year"),
        "month": payload.get("month"),
        # product context fields are kept so the route passes real product data
        "title": payload.get("title"),
        "description": payload.get("description"),
        "location": payload.get("location"),
        "quantity": payload.get("quantity"),
        "starting_price": payload.get("starting_price"),
        "currency": payload.get("currency"),
        "status": payload.get("status"),
    }


def predict_price(
    *,
    admin1: int | str | None = 22,
    admin2: int | str | None = 41,
    market: int | str | None = 159,
    market_id: int | str | None = 143,
    latitude: float | str | None = -5.92,
    longitude: float | str | None = 29.19,
    category: int | str | None = 2,
    commodity: int | str | None = 31,
    commodity_id: int | str | None = 185,
    unit: int | str | None = 1,
    year: int | str | None = None,
    month: int | str | None = None,
    title: str | None = None,
    description: str | None = None,
    location: str | None = None,
    quantity: float | int | str | None = None,
    starting_price: float | int | str | None = None,
    currency: str | None = None,
    status: str | None = None,
) -> float | None:
    try:
        model = _load_model()

        now = datetime.utcnow()
        year_value = _parse_int(year, now.year)
        month_value = _parse_int(month, now.month)

        data = pd.DataFrame(
            [
                {
                    "admin1": _parse_int(admin1, 22),
                    "admin2": _parse_int(admin2, 41),
                    "market": _parse_int(market, 159),
                    "market_id": _parse_int(market_id, 143),
                    "latitude": _parse_float(latitude, -5.92),
                    "longitude": _parse_float(longitude, 29.19),
                    "category": _parse_int(category, 2),
                    "commodity": _parse_int(commodity, 31),
                    "commodity_id": _parse_int(commodity_id, 185),
                    "unit": _parse_int(unit, 1),
                    "year": year_value,
                    "month": month_value,
                }
            ]
        )

        if hasattr(model, "feature_names_in_"):
            data = data[list(model.feature_names_in_)]

        pred_log = model.predict(data)
        pred_real = np.expm1(pred_log)
        return round(float(pred_real[0]), 2)
    except Exception:
        return None
