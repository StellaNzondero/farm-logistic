from __future__ import annotations

from flask import current_app

from ..db import db
from ..models import User


def ensure_bootstrap_admin() -> None:
    if not current_app.config.get("BOOTSTRAP_ADMIN", False):
        return

    existing = User.query.filter_by(role="admin").first()
    if existing is not None:
        return

    phone = current_app.config.get("ADMIN_PHONE") or ""
    password = current_app.config.get("ADMIN_PASSWORD") or ""
    full_name = current_app.config.get("ADMIN_FULL_NAME") or "Admin"
    email = current_app.config.get("ADMIN_EMAIL")

    if not phone or not password:
        return

    if User.query.filter_by(phone=phone).first() is not None:
        return

    if email and User.query.filter_by(email=email).first() is not None:
        email = None

    user = User(full_name=full_name, email=email, phone=phone, role="admin", password_hash="")
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

