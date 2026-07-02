from __future__ import annotations

from flask import jsonify

from . import api_bp
from ..services.catalog import serialize_catalog_entries


@api_bp.get("/catalog/entries")
def catalog_entries():
    return jsonify({"entries": serialize_catalog_entries()})
