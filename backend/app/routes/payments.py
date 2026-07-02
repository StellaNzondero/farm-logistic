from __future__ import annotations

import logging
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..db import db
from ..models import Auction
from ..services.sms_service import send_sms
from .helpers import current_user

logger = logging.getLogger(__name__)
payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")

@payments_bp.get("/receipt/<int:auction_id>")
def get_receipt(auction_id: int):
    # Suppression de @jwt_required() et du check utilisateur pour la transparence publique
    
    auction = db.session.get(Auction, auction_id)
    if not auction:
        return jsonify({"error": "AUCTION_NOT_FOUND"}), 404
    
    if auction.payment_status != "COMPLETED":
        return jsonify({"error": "PAYMENT_NOT_COMPLETED"}), 400
    
    product = auction.product
    farmer = product.owner
    winner = auction.current_winner
    
    receipt = {
        "receiptNumber": f"REC-{auction.payment_transaction_id or auction.id}",
        "date": auction.updated_at.isoformat() if auction.updated_at else None,
        "product": {
            "title": product.title,
            "quantity": product.quantity,
            "unit": product.unit,
        },
        "amount": auction.current_price,
        "currency": product.currency,
        "buyer": {
            "name": winner.full_name,
            "phone": winner.phone,
        },
        "seller": {
            "name": farmer.full_name,
            "phone": farmer.phone,
        },
        "transactionId": auction.payment_transaction_id
    }
    
    return jsonify({"receipt": receipt})

@payments_bp.post("/callback")
def shwary_callback():
    """
    Webhook appelé par Shwary lors d'un changement de statut de transaction.
    """
    data = request.get_json(silent=True) or {}
    transaction_id = data.get("id")
    status = data.get("status")
    failure_reason = data.get("failureReason")

    if not transaction_id:
        return jsonify({"error": "INVALID_PAYLOAD"}), 400

    logger.info(f"Received Shwary callback for {transaction_id}: {status}")

    # On cherche l'enchère associée à cette transaction
    auction = Auction.query.filter_by(payment_transaction_id=transaction_id).first()
    if not auction:
        logger.warning(f"No auction found for transaction {transaction_id}")
        return jsonify({"ok": True}) # On retourne OK quand même pour Shwary

    if status == "completed":
        auction.payment_status = "COMPLETED"
        from ..services.ledger import append_block
        append_block(
            "PAYMENT_SUCCESS",
            {
                "auctionId": auction.id,
                "transactionId": transaction_id,
                "amount": data.get("amount"),
                "currency": data.get("currency")
            }
        )
        
        # Notifications SMS
        try:
            product = auction.product
            farmer = product.owner
            winner = auction.current_winner
            
            # Notification à l'agriculteur
            if farmer and farmer.phone:
                send_sms(farmer.phone, f"Paiement reçu pour '{product.title}': {auction.current_price} {product.currency}. Transaction: {transaction_id}")
            
            # Notification à l'acheteur
            if winner and winner.phone:
                send_sms(winner.phone, f"Félicitations! Votre paiement pour '{product.title}' a été confirmé ({auction.current_price} {product.currency}). Reçu: REC-{transaction_id or auction.id}")
        except Exception as e:
            logger.error(f"Error sending payment notifications: {e}")
            
    elif status in ["failed", "cancelled"]:
        auction.payment_status = "FAILED"
        auction.payment_failure_reason = failure_reason or status
        from ..services.ledger import append_block
        append_block(
            "PAYMENT_FAILED",
            {
                "auctionId": auction.id,
                "transactionId": transaction_id,
                "reason": failure_reason
            }
        )
    
    db.session.commit()
    return jsonify({"ok": True})
