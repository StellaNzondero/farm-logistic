from __future__ import annotations

import json
import queue
import time
from datetime import datetime, timezone

from flask import Response, jsonify, request, stream_with_context
from flask_jwt_extended import jwt_required

from ..db import db
from ..models import Auction, Bid, Product
from ..services.auctions import close_auction_if_ended, ensure_auction_for_published_product
from ..services.ledger import append_block
from ..services.realtime import pubsub
from ..services.sms_service import send_sms
from . import api_bp
from .helpers import current_user, product_to_public_with_image


@api_bp.post("/bids")
@jwt_required()
def place_bid():
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404
    if user.role != "acheteur":
        return jsonify({"error": "FORBIDDEN"}), 403

    payload = request.get_json(silent=True) or {}
    product_id = payload.get("productId")
    amount = payload.get("amount")
    try:
        product_id_int = int(product_id)
        amount_int = int(amount)
    except (TypeError, ValueError):
        return jsonify({"error": "INVALID_PAYLOAD"}), 400
    if amount_int <= 0:
        return jsonify({"error": "INVALID_AMOUNT"}), 400

    product = db.session.get(Product, product_id_int)
    if product is None or product.status != "PUBLISHED":
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404

    auction = Auction.query.filter_by(product_id=product.id).first()
    if auction is None:
        auction = ensure_auction_for_published_product(product, actor_user_id=None)

    close_auction_if_ended(auction)
    if auction.status != "OPEN":
        return jsonify({"error": "AUCTION_CLOSED"}), 400

    now = datetime.now(timezone.utc)
    
    starts_at = auction.starts_at
    if starts_at and starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=timezone.utc)
    if starts_at and now < starts_at:
        return jsonify({"error": "AUCTION_NOT_STARTED"}), 400

    ends_at = auction.ends_at
    if ends_at and ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)
    if ends_at and now > ends_at:
        close_auction_if_ended(auction)
        return jsonify({"error": "AUCTION_CLOSED"}), 400

    min_required = max(product.starting_price or 0, auction.current_price or 0)
    if amount_int <= min_required:
        return jsonify({"error": "BID_TOO_LOW", "min": min_required + 1}), 400

    bid = Bid(
        auction_id=auction.id,
        product_id=product.id,
        bidder_user_id=user.id,
        amount=amount_int,
    )
    db.session.add(bid)
    db.session.flush()

    auction.current_price = amount_int
    auction.current_winner_user_id = user.id
    db.session.commit()

    # Notifier l'agriculteur par SMS
    try:
        farmer = product.owner
        if farmer and farmer.phone:
            bidder_name = user.full_name or "Un acheteur"
            msg_body = f"Nouvelle enchère sur '{product.title}': {amount_int} {product.currency} par {bidder_name}."
            send_sms(farmer.phone, msg_body)
    except Exception as e:
        # On ne veut pas faire échouer l'enchère si l'envoi du SMS échoue
        print(f"Erreur lors de l'envoi du SMS: {e}")

    append_block(
        "BID_PLACED",
        {
            "productId": product.id,
            "auctionId": auction.id,
            "bidId": bid.id,
            "amount": amount_int,
            "bidderUserId": user.id,
        },
        actor_user_id=user.id,
    )

    event_data = {
        "productId": product.id,
        "auction": auction.to_public(),
        "bid": bid.to_public(),
    }
    pubsub.publish(product.id, "bid", event_data)

    return jsonify({"bid": bid.to_public(), "auction": auction.to_public()})


@api_bp.get("/my/bids")
@jwt_required()
def list_my_bids():
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404

    # Joignons Bid, Product et Auction pour avoir toutes les infos
    q = db.session.query(Bid, Product, Auction).join(
        Product, Bid.product_id == Product.id
    ).join(
        Auction, Product.id == Auction.product_id
    )

    if user.role == "acheteur":
        q = q.filter(Bid.bidder_user_id == user.id)
    elif user.role == "agriculteur":
        q = q.filter(Product.owner_user_id == user.id)
    elif user.role == "admin":
        pass
    else:
        pass

    results = q.order_by(Bid.created_at.desc()).limit(500).all()

    output = []
    for bid, product, auction in results:
        b_data = bid.to_public()
        b_data["productTitle"] = product.title
        b_data["auctionId"] = auction.id # Added for receipts
        b_data["currency"] = product.currency or "USD"
        b_data["auctionStatus"] = auction.status
        b_data["paymentStatus"] = auction.payment_status
        b_data["isWinning"] = (auction.current_winner_user_id == bid.bidder_user_id and auction.current_price == bid.amount)
        output.append(b_data)

    return jsonify({"bids": output})


@api_bp.get("/products/<int:product_id>/bids")
@jwt_required()
def list_bids(product_id: int):
    user = current_user()
    if user is None:
        return jsonify({"error": "USER_NOT_FOUND"}), 404

    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "PRODUCT_NOT_FOUND"}), 404

    # Who can view bids?
    can_view_all = user.role == "admin" or (
        user.role == "agriculteur" and product.owner_user_id == user.id
    )

    q = Bid.query.filter_by(product_id=product.id).order_by(Bid.created_at.desc())
    if not can_view_all:
        q = q.filter_by(bidder_user_id=user.id)

    bids = q.limit(200).all()
    return jsonify({"bids": [b.to_public() for b in bids]})


@api_bp.get("/stream/products/<int:product_id>")
def stream_product(product_id: int):
    def gen():
        q: queue.Queue = pubsub.subscribe(product_id)
        try:
            product = db.session.get(Product, product_id)
            if product is None:
                yield _sse("error", {"error": "PRODUCT_NOT_FOUND"})
                return

            init_payload = {"product": product_to_public_with_image(product)}
            yield _sse("init", init_payload)

            last_ping = time.time()
            while True:
                try:
                    ev = q.get(timeout=10)
                    yield _sse(ev.event, ev.data)
                except queue.Empty:
                    now = time.time()
                    if now - last_ping >= 15:
                        last_ping = now
                        yield ": ping\n\n"
        finally:
            pubsub.unsubscribe(product_id, q)

    return Response(stream_with_context(gen()), mimetype="text/event-stream")


def _sse(event: str, data: dict) -> str:
    payload = json.dumps(data, separators=(",", ":"))
    return f"event: {event}\ndata: {payload}\n\n"
