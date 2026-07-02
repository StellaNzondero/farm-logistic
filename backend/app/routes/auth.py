from __future__ import annotations

from flask import jsonify, request
from flask_jwt_extended import create_access_token, jwt_required

from ..db import db
from ..models import User
from . import api_bp
from .helpers import current_user

REGISTERABLE_ROLES = {"agriculteur", "acheteur"}


@api_bp.post("/auth/register")
def auth_register():
    payload = request.get_json(silent=True) or {}

    full_name = (payload.get("fullName") or "").strip()
    email = (payload.get("email") or "").strip().lower() or None
    phone = (payload.get("phone") or "").strip()
    password = payload.get("password") or ""
    role = (payload.get("role") or "").strip().lower()

    if not full_name:
        return jsonify({"error": "FULL_NAME_REQUIRED"}), 400
    if not phone:
        return jsonify({"error": "PHONE_REQUIRED"}), 400
    if len(password) < 6:
        return jsonify({"error": "PASSWORD_TOO_SHORT", "minLength": 6}), 400
    if role not in REGISTERABLE_ROLES:
        return (
            jsonify(
                {"error": "ROLE_NOT_ALLOWED", "allowedRoles": sorted(REGISTERABLE_ROLES)}
            ),
            403,
        )

    if email and "@" not in email:
        return jsonify({"error": "INVALID_EMAIL"}), 400

    if User.query.filter_by(phone=phone).first() is not None:
        return jsonify({"error": "PHONE_ALREADY_USED"}), 409

    if email and User.query.filter_by(email=email).first() is not None:
        return jsonify({"error": "EMAIL_ALREADY_USED"}), 409

    user = User(
        full_name=full_name, email=email, phone=phone, role=role, password_hash=""
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"accessToken": access_token, "user": user.to_public()}), 201


@api_bp.post("/auth/login")
def auth_login():
    payload = request.get_json(silent=True) or {}

    identifier = (payload.get("identifier") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    password = payload.get("password") or ""

    if identifier and not (email or phone):
        if "@" in identifier:
            email = identifier.lower()
        else:
            phone = identifier

    if not (email or phone):
        return jsonify({"error": "IDENTIFIER_REQUIRED"}), 400
    if not password:
        return jsonify({"error": "PASSWORD_REQUIRED"}), 400

    user = None
    if email:
        user = User.query.filter_by(email=email).first()
    if user is None and phone:
        user = User.query.filter_by(phone=phone).first()

    if user is None or not user.check_password(password):
        return jsonify({"error": "INVALID_CREDENTIALS"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"accessToken": access_token, "user": user.to_public()})


@api_bp.get("/auth/me")
@jwt_required()
def auth_me():
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404
    return jsonify({"user": user.to_public()})

