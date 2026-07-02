from __future__ import annotations

import re
from flask import jsonify, request, Response

from ..db import db
from ..models import Product, User
from .helpers import parse_float, product_to_public_with_image
from ..services.catalog import get_default_catalog_entry
from ..services.ledger import append_block
from ..services.sms_service import send_sms

from . import api_bp


def parse_sms_body(body: str) -> dict[str, str]:
    """
    Parses a string like: PRODUIT='Manioc';DESCRIPTION='Manioc de très bonne qualité';LOCATION='KIPUSHI';UNIT='Sac';QUANTITE=40; PRIX=300
    Returns a dict with uppercase keys.
    """
    data = {}
    if not body:
        return data
    # Matches KEY='VALUE' or KEY=VALUE
    pairs = re.findall(r"(\w+)\s*=\s*(?:'([^']*)'|([^;]+))", body)
    for key, val_quoted, val_unquoted in pairs:
        val = val_quoted if val_quoted is not None else val_unquoted
        data[key.upper().strip()] = val.strip()
    return data


@api_bp.post("/sms/inbound")
def sms_inbound():
    payload = request.get_json(silent=True) or request.form.to_dict() or {}

    # Twilio sends phone in 'From' and content in 'Body'
    body_text = payload.get("Body", "")
    sms_data = parse_sms_body(body_text)

    farmer_phone = payload.get("From", "")

    title = (sms_data.get("PRODUIT") or payload.get("title") or "").strip()
    description = (sms_data.get("DESCRIPTION") or payload.get("description") or "").strip() or None
    location = (sms_data.get("LIEUX") or payload.get("location") or "").strip() or None
    unit = (sms_data.get("UNIT") or payload.get("unit") or "").strip() or None
    
    quantity_raw = sms_data.get("QUANTITE") or payload.get("quantity")
    quantity = parse_float(quantity_raw)
    
    currency = (sms_data.get("DEVISE") or payload.get("currency") or "USD").strip().upper() or "NGN"

    starting_price_raw = sms_data.get("PRIX") or payload.get("startingPrice")
    try:
        starting_price_int = int(float(starting_price_raw)) if starting_price_raw is not None else None
    except (TypeError, ValueError):
        starting_price_int = None

    if not farmer_phone:
        return jsonify({"error": "FARMER_PHONE_REQUIRED"}), 400
    if not title:
        return jsonify({"error": "TITLE_REQUIRED"}), 400
    if starting_price_int is None or starting_price_int < 0:
        return jsonify({"error": "INVALID_STARTING_PRICE"}), 400

    farmer = User.query.filter_by(phone=farmer_phone).first()
    if farmer is None:
        return jsonify({"error": "FARMER_NOT_FOUND"}), 404
    if farmer.role != "agriculteur":
        return jsonify({"error": "PHONE_NOT_A_FARMER", "role": farmer.role}), 403

    product = Product(
        owner_user_id=farmer.id,
        title=title,
        description=description,
        location=location,
        unit=unit,
        quantity=quantity,
        starting_price=starting_price_int,
        currency=currency,
        status="DRAFT",
    )
    default_entry = get_default_catalog_entry()
    product.catalog_entry_id = default_entry.id if default_entry is not None else None

    db.session.add(product)
    db.session.commit()
    append_block(
        "PRODUCT_CREATED",
        {"productId": product.id, "source": "sms", "farmerPhone": farmer_phone},
        actor_user_id=farmer.id,
    )

    # Envoyer un message de confirmation
    msg_body = f"Lot créé: {product.title}"
    if product.quantity:
        msg_body += f" ({product.quantity} {product.unit or ''})"
    msg_body += f" à {product.starting_price} {product.currency}. Réf: #{product.id}"
    
    send_sms(farmer_phone, msg_body)

    # Si c'est Twilio (via Form), on peut répondre avec TwiML pour plus de réactivité
    if request.form.get("AccountSid"):
        twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{msg_body}</Message></Response>'
        return Response(twiml, mimetype="text/xml"), 201

    return (
        jsonify(
            {
                "ok": True,
                "product": product_to_public_with_image(product),
                "message": msg_body,
                "next": "Agent: ajouter photo puis publier.",
            }
        ),
        201,
    )
