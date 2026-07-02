from __future__ import annotations

from flask import current_app, jsonify, request
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

import os
import uuid

from ..db import db
from ..models import Product, User
from . import api_bp
from .helpers import current_user, parse_float, product_to_public_with_image
from ..services.catalog import get_catalog_entry, get_default_catalog_entry
from ..services.auctions import ensure_auction_for_published_product
from ..services.ledger import append_block
from ..services.geo import resolve_coordinates_from_request
from ..services.price_predictor import normalize_prediction_payload, predict_price


def _require_agent() -> User | None:
    user = current_user()
    if user is None or user.role != "agent":
        return None
    return user


def _apply_catalog_entry(product: Product, payload: dict, *, allow_default: bool = True) -> None:
    raw_catalog_entry_id = payload.get("catalogEntryId")
    catalog_entry = get_catalog_entry(raw_catalog_entry_id)
    if raw_catalog_entry_id not in (None, "") and catalog_entry is None:
        raise ValueError("INVALID_CATALOG_ENTRY")
    if catalog_entry is None:
        if not allow_default:
            return
        catalog_entry = get_default_catalog_entry()
    product.catalog_entry_id = catalog_entry.id if catalog_entry is not None else None


@api_bp.get("/agent/products/needs-photo")
@jwt_required()
def agent_products_needs_photo():
    if _require_agent() is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    items = (
        Product.query.filter_by(status="DRAFT")
        # .filter(Product.image_path.is_(None))
        .order_by(Product.created_at.asc())
        .limit(200)
        .all()
    )
    return jsonify({"products": [product_to_public_with_image(p) for p in items]})


@api_bp.patch("/agent/products/<int:product_id>")
@jwt_required()
def agent_products_update(product_id: int):
    if _require_agent() is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404
    if product.status != "DRAFT":
        return jsonify({"error": "INVALID_STATUS"}), 400

    payload = request.get_json(silent=True) or {}
    if "title" in payload:
        title = (payload.get("title") or "").strip()
        if not title:
            return jsonify({"error": "TITLE_REQUIRED"}), 400
        product.title = title
    if "description" in payload:
        product.description = (payload.get("description") or "").strip() or None
    if "location" in payload:
        product.location = (payload.get("location") or "").strip() or None
    if "unit" in payload:
        product.unit = (payload.get("unit") or "").strip() or None
    if "quantity" in payload:
        product.quantity = parse_float(payload.get("quantity"))
    if "catalogEntryId" in payload:
        try:
            _apply_catalog_entry(product, payload)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
    if "startingPrice" in payload:
        try:
            starting_price_int = int(payload.get("startingPrice"))
        except (TypeError, ValueError):
            return jsonify({"error": "INVALID_STARTING_PRICE"}), 400
        if starting_price_int < 0:
            return jsonify({"error": "INVALID_STARTING_PRICE"}), 400
        product.starting_price = starting_price_int
    if "currency" in payload:
        product.currency = (payload.get("currency") or "NGN").strip().upper() or "NGN"

    db.session.commit()
    return jsonify({"product": product_to_public_with_image(product)})


@api_bp.post("/agent/products/<int:product_id>/photo")
@jwt_required()
def agent_products_upload_photo(product_id: int):
    if _require_agent() is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404
    if product.status != "DRAFT":
        return jsonify({"error": "INVALID_STATUS"}), 400

    if "file" not in request.files:
        return jsonify({"error": "FILE_REQUIRED"}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "FILE_REQUIRED"}), 400

    filename = secure_filename(file.filename)
    _, ext = os.path.splitext(filename)
    ext = (ext or "").lower()
    if ext not in {".png", ".jpg", ".jpeg", ".webp"}:
        return jsonify({"error": "UNSUPPORTED_FILE_TYPE"}), 400

    upload_dir = current_app.config["UPLOAD_DIR"]
    os.makedirs(upload_dir, exist_ok=True)

    final_name = f"product-{product.id}-{uuid.uuid4().hex}{ext}"
    file.save(os.path.join(upload_dir, final_name))

    product.image_path = final_name
    db.session.commit()
    return jsonify({"product": product_to_public_with_image(product)})


@api_bp.post("/agent/products/<int:product_id>/publish")
@jwt_required()
def agent_products_publish(product_id: int):
    agent = _require_agent()
    if agent is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404
    if product.status != "DRAFT":
        return jsonify({"error": "INVALID_STATUS"}), 400

    if not product.image_path:
        return jsonify({"error": "PHOTO_REQUIRED"}), 400

    product.status = "PUBLISHED"
    db.session.commit()
    ensure_auction_for_published_product(product, actor_user_id=agent.id)
    append_block(
        "PRODUCT_PUBLISHED",
        {"productId": product.id, "source": "agent"},
        actor_user_id=agent.id,
    )

    payload = request.get_json(silent=True) or {}
    coordinates = resolve_coordinates_from_request(request)
    estimated_price = predict_price(
        **normalize_prediction_payload(payload, product=product, coordinates=coordinates)
    )

    result = product_to_public_with_image(product)
    result["estimatedPrice"] = estimated_price
    return jsonify({"product": result})


@api_bp.post("/agent/products/<int:product_id>/predict-price")
@jwt_required()
def agent_products_predict_price(product_id: int):
    agent = _require_agent()
    if agent is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404
    if product.status != "DRAFT":
        return jsonify({"error": "INVALID_STATUS"}), 400

    payload = request.get_json(silent=True) or {}
    coordinates = resolve_coordinates_from_request(request)
    estimated_price = predict_price(
        **normalize_prediction_payload(payload, product=product, coordinates=coordinates)
    )
    return jsonify({"estimatedPrice": estimated_price})


@api_bp.get("/agent/users")
@jwt_required()
def agent_users_list():
    agent = _require_agent()
    if agent is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    # On peut limiter aux agriculteurs pour l'agent
    users = (
        User.query.filter_by(role="agriculteur")
        .order_by(User.created_at.desc())
        .limit(200)
        .all()
    )
    return jsonify(
        {
            "users": [
                {
                    "id": u.id,
                    "fullName": u.full_name,
                    "phone": u.phone,
                    "role": u.role,
                    "createdAt": u.created_at.isoformat() if u.created_at else None,
                }
                for u in users
            ]
        }
    )


@api_bp.post("/agent/users")
@jwt_required()
def agent_users_create():
    agent = _require_agent()
    if agent is None:
        return jsonify({"error": "FORBIDDEN"}), 403

    payload = request.get_json(silent=True) or {}
    full_name = (payload.get("fullName") or "").strip()
    phone = (payload.get("phone") or "").strip()
    email = (payload.get("email") or "").strip().lower() or None
    password = payload.get("password") or ""

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

    user = User(
        full_name=full_name,
        phone=phone,
        email=email,
        role="agriculteur",
        password_hash="",
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    append_block(
        "USER_CREATED",
        {
            "userId": user.id,
            "role": "agriculteur",
            "phone": user.phone,
            "email": user.email,
            "source": "agent",
        },
        actor_user_id=agent.id,
    )

    return jsonify(
        {
            "user": {
                "id": user.id,
                "fullName": user.full_name,
                "phone": user.phone,
                "email": user.email,
                "role": user.role,
            }
        }
    ), 201
