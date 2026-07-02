from __future__ import annotations

from sqlalchemy import text

from .db import db


def ensure_schema() -> None:
    """
    Very small "migration-lite" helper.
    We use db.create_all(), but that does not add columns on existing SQLite tables.
    This ensures newly added columns exist for local dev.
    """
    engine = db.engine
    if engine.dialect.name != "sqlite":
        return

    _ensure_sqlite_column("products", "image_path", "VARCHAR(255)")
    _ensure_sqlite_column("products", "catalog_entry_id", "INTEGER")
    _ensure_sqlite_column("auctions", "payment_status", "VARCHAR(32) NOT NULL DEFAULT 'NONE'")
    _ensure_sqlite_column("auctions", "payment_transaction_id", "VARCHAR(128)")
    _ensure_sqlite_column("auctions", "payment_failure_reason", "TEXT")


def _ensure_sqlite_column(table: str, column: str, ddl_type: str) -> None:
    rows = db.session.execute(text(f"PRAGMA table_info({table})")).fetchall()
    if not rows:
        return
    existing = {r[1] for r in rows}  # (cid, name, type, notnull, dflt_value, pk)
    if column in existing:
        return
    db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
    db.session.commit()
