from __future__ import annotations

from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..db import db
from ..models import LedgerBlock, User
from ..services.settings import (
    get_auction_default_duration_minutes,
    set_auction_default_duration_minutes,
)
from . import api_bp
from .helpers import current_user


def _require_admin() -> User | None:
    user = current_user()
    if user is None or user.role != "admin":
        return None
    return user


@api_bp.get("/admin/users")
@jwt_required()
def admin_users_list():
    if _require_admin() is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    users = User.query.order_by(User.created_at.desc()).limit(500).all()
    return jsonify({"users": [_user_to_admin_view(u) for u in users]})


@api_bp.post("/admin/users")
@jwt_required()
def admin_users_create():
    if _require_admin() is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    payload = request.get_json(silent=True) or {}
    full_name = (payload.get("fullName") or "").strip()
    email = (payload.get("email") or "").strip().lower() or None
    phone = (payload.get("phone") or "").strip()
    password = payload.get("password") or ""
    role = (payload.get("role") or "agent").strip().lower()

    if role not in ["agent", "agriculteur"]:
        return jsonify({"error": "ROLE_NOT_ALLOWED", "allowedRoles": ["agent", "agriculteur"]}), 403
    if not full_name:
        return jsonify({"error": "FULL_NAME_REQUIRED"}), 400
    if not phone:
        return jsonify({"error": "PHONE_REQUIRED"}), 400
    if len(password) < 6:
        return jsonify({"error": "PASSWORD_TOO_SHORT", "minLength": 6}), 400
    if email and "@" not in email:
        return jsonify({"error": "INVALID_EMAIL"}), 400

    if User.query.filter_by(phone=phone).first() is not None:
        return jsonify({"error": "PHONE_ALREADY_USED"}), 409
    if email and User.query.filter_by(email=email).first() is not None:
        return jsonify({"error": "EMAIL_ALREADY_USED"}), 409

    user = User(full_name=full_name, email=email, phone=phone, role=role, password_hash="")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    from ..services.ledger import append_block

    admin = current_user()
    append_block(
        "USER_CREATED",
        {"userId": user.id, "role": role, "phone": user.phone},
        actor_user_id=admin.id if admin else None,
    )

    return jsonify({"user": _user_to_admin_view(user)}), 201


@api_bp.get("/admin/settings/auction")
@jwt_required()
def admin_settings_auction_get():
    if _require_admin() is None:
        return jsonify({"error": "FORBIDDEN"}), 403
    return jsonify({"defaultDurationMinutes": get_auction_default_duration_minutes()})


@api_bp.put("/admin/settings/auction")
@jwt_required()
def admin_settings_auction_put():
    if _require_admin() is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    payload = request.get_json(silent=True) or {}
    minutes = payload.get("defaultDurationMinutes")
    try:
        minutes_int = int(minutes)
    except (TypeError, ValueError):
        return jsonify({"error": "INVALID_DURATION"}), 400

    new_value = set_auction_default_duration_minutes(minutes_int)
    user = current_user()
    from ..services.ledger import append_block

    append_block(
        "SETTINGS_UPDATED",
        {"key": "auction_default_duration_minutes", "value": new_value},
        actor_user_id=user.id if user else None,
    )
    return jsonify({"defaultDurationMinutes": new_value})


def _user_to_admin_view(user: User) -> dict:
    return {
        "id": user.id,
        "fullName": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
    }


@api_bp.get("/admin/ledger")
@jwt_required()
def admin_ledger_list():
    if _require_admin() is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    limit = request.args.get("limit", "100")
    before = request.args.get("before")  # idx
    try:
        limit_int = max(1, min(500, int(limit)))
    except (TypeError, ValueError):
        limit_int = 100

    q = LedgerBlock.query.order_by(LedgerBlock.idx.desc())
    if before is not None:
        try:
            before_int = int(before)
            q = q.filter(LedgerBlock.idx < before_int)
        except (TypeError, ValueError):
            pass

    blocks = q.limit(limit_int).all()
    return jsonify({"blocks": [b.to_public() for b in blocks]})


@api_bp.get("/admin/ledger/products")
@jwt_required()
def admin_ledger_products():
    if _require_admin() is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    from ..models import Product
    products = Product.query.order_by(Product.created_at.desc()).limit(100).all()
    return jsonify({"products": [p.to_public() for p in products]})


@api_bp.get("/admin/ledger/product/<int:product_id>")
@jwt_required()
def admin_ledger_product_detail(product_id: int):
    if _require_admin() is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    # On cherche tous les blocs dont le payload contient "productId": product_id
    # Payload est stocké en JSON string. On fait un filtre SQL simple (LIKE)
    # ou on filtre en Python si le volume est gérable. Pour la robustesse on fait un LIKE.
    search_pattern = f'%"productId":{product_id}%'
    blocks = LedgerBlock.query.filter(LedgerBlock.payload_json.like(search_pattern)).order_by(LedgerBlock.idx.asc()).all()
    
    return jsonify({"blocks": [b.to_public() for b in blocks]})
