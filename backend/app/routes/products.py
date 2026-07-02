from __future__ import annotations

from flask import current_app, jsonify, request
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

import os
import uuid

from ..db import db
from ..models import Product
from . import api_bp
from .helpers import current_user, parse_float, product_to_public_with_image
from ..services.catalog import get_catalog_entry, get_default_catalog_entry
from ..services.auctions import ensure_auction_for_published_product, relaunch_auction
from ..services.ledger import append_block
from ..services.geo import resolve_coordinates_from_request
from ..services.price_predictor import normalize_prediction_payload, predict_price

PRODUCT_EDIT_ROLES = {"agriculteur", "admin"}


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


@api_bp.get("/products")
def products():
    items = (
        Product.query.filter_by(status="PUBLISHED")
        .order_by(Product.created_at.desc())
        .limit(100)
        .all()
    )
    return jsonify({"products": [product_to_public_with_image(p) for p in items]})


@api_bp.get("/products/<int:product_id>")
def product_public_detail(product_id: int):
    product = db.session.get(Product, product_id)
    if product is None or product.status != "PUBLISHED":
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404
    return jsonify({"product": product_to_public_with_image(product)})


@api_bp.get("/my/products")
@jwt_required()
def my_products():
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404

    if user.role == "admin":
        items = Product.query.order_by(Product.created_at.desc()).limit(200).all()
    else:
        items = (
            Product.query.filter_by(owner_user_id=user.id)
            .order_by(Product.created_at.desc())
            .limit(200)
            .all()
        )
    return jsonify({"products": [product_to_public_with_image(p) for p in items]})


@api_bp.post("/my/products")
@jwt_required()
def my_products_create():
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404
    if user.role not in PRODUCT_EDIT_ROLES:
        return jsonify({"error": "FORBIDDEN"}), 403

    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    if not title:
        return jsonify({"error": "TITLE_REQUIRED"}), 400

    starting_price = payload.get("startingPrice")
    try:
        starting_price_int = int(starting_price) if starting_price is not None else 0
    except (TypeError, ValueError):
        return jsonify({"error": "INVALID_STARTING_PRICE"}), 400
    if starting_price_int < 0:
        return jsonify({"error": "INVALID_STARTING_PRICE"}), 400

    product = Product(
        owner_user_id=user.id,
        title=title,
        description=(payload.get("description") or "").strip() or None,
        location=(payload.get("location") or "").strip() or None,
        unit=(payload.get("unit") or "").strip() or None,
        quantity=parse_float(payload.get("quantity")),
        starting_price=starting_price_int,
        currency=(payload.get("currency") or "NGN").strip().upper() or "NGN",
        status="DRAFT",
    )
    try:
        _apply_catalog_entry(product, payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    db.session.add(product)
    db.session.commit()
    append_block(
        "PRODUCT_CREATED",
        {"productId": product.id, "source": "web", "status": product.status},
        actor_user_id=user.id,
    )
    return jsonify({"product": product_to_public_with_image(product)}), 201


@api_bp.patch("/my/products/<int:product_id>")
@jwt_required()
def my_products_update(product_id: int):
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404
    if user.role not in PRODUCT_EDIT_ROLES:
        return jsonify({"error": "FORBIDDEN"}), 403

    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404

    if user.role != "admin" and product.owner_user_id != user.id:
        return jsonify({"error": "FORBIDDEN"}), 403

    if product.status != "DRAFT":
        return jsonify({"error": "CANNOT_UPDATE_PUBLISHED_PRODUCT"}), 400

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


@api_bp.post("/my/products/<int:product_id>/publish")
@jwt_required()
def my_products_publish(product_id: int):
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404
    if user.role not in PRODUCT_EDIT_ROLES:
        return jsonify({"error": "FORBIDDEN"}), 403

    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404

    if user.role != "admin" and product.owner_user_id != user.id:
        return jsonify({"error": "FORBIDDEN"}), 403

    if not product.title or product.starting_price is None:
        return jsonify({"error": "PRODUCT_INCOMPLETE"}), 400

    product.status = "PUBLISHED"
    db.session.commit()
    ensure_auction_for_published_product(product, actor_user_id=user.id)
    append_block(
        "PRODUCT_PUBLISHED",
        {"productId": product.id, "source": "web"},
        actor_user_id=user.id,
    )

    payload = request.get_json(silent=True) or {}
    coordinates = resolve_coordinates_from_request(request)
    estimated_price = predict_price(
        **normalize_prediction_payload(payload, product=product, coordinates=coordinates)
    )

    result = product_to_public_with_image(product)
    result["estimatedPrice"] = estimated_price
    return jsonify({"product": result})


@api_bp.post("/my/products/<int:product_id>/predict-price")
@jwt_required()
def my_products_predict_price(product_id: int):
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404
    if user.role not in PRODUCT_EDIT_ROLES:
        return jsonify({"error": "FORBIDDEN"}), 403

    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404
    if user.role != "admin" and product.owner_user_id != user.id:
        return jsonify({"error": "FORBIDDEN"}), 403
    if product.status != "DRAFT":
        return jsonify({"error": "INVALID_STATUS"}), 400

    payload = request.get_json(silent=True) or {}
    coordinates = resolve_coordinates_from_request(request)
    estimated_price = predict_price(
        **normalize_prediction_payload(payload, product=product, coordinates=coordinates)
    )
    return jsonify({"estimatedPrice": estimated_price})


@api_bp.post("/my/products/<int:product_id>/relaunch")
@jwt_required()
def my_products_relaunch(product_id: int):
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404

    # Relaunch can be done by agriculteur, admin or agent
    ALLOWED_ROLES = PRODUCT_EDIT_ROLES | {"agent"}
    if user.role not in ALLOWED_ROLES:
        return jsonify({"error": "FORBIDDEN"}), 403

    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404

    if user.role == "agriculteur" and product.owner_user_id != user.id:
        return jsonify({"error": "FORBIDDEN"}), 403

    try:
        relaunch_auction(product, actor_user_id=user.id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"product": product_to_public_with_image(product)})


@api_bp.delete("/my/products/<int:product_id>")
@jwt_required()
def my_products_delete(product_id: int):
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404
    if user.role not in PRODUCT_EDIT_ROLES:
        return jsonify({"error": "FORBIDDEN"}), 403

    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404

    if user.role != "admin" and product.owner_user_id != user.id:
        return jsonify({"error": "FORBIDDEN"}), 403

    if product.status != "DRAFT":
        return jsonify({"error": "CANNOT_DELETE_PUBLISHED_PRODUCT"}), 400

    db.session.delete(product)
    db.session.commit()
    append_block(
        "PRODUCT_DELETED",
        {"productId": product_id, "source": "web"},
        actor_user_id=user.id,
    )
    return jsonify({"success": True})


@api_bp.post("/my/products/<int:product_id>/photo")
@jwt_required()
def my_products_upload_photo(product_id: int):
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404
    if user.role not in PRODUCT_EDIT_ROLES:
        return jsonify({"error": "FORBIDDEN"}), 403

    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404
    if user.role != "admin" and product.owner_user_id != user.id:
        return jsonify({"error": "FORBIDDEN"}), 403

    if product.status != "DRAFT":
        return jsonify({"error": "CANNOT_UPDATE_PUBLISHED_PRODUCT"}), 400

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
