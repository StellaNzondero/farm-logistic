from __future__ import annotations

from datetime import datetime, timedelta, timezone

from ..db import db
from ..models import Auction, Bid, Product
from .ledger import append_block
from .settings import get_auction_default_duration_minutes


def ensure_auction_for_published_product(
    product: Product, actor_user_id: int | None = None
) -> Auction:
    auction = Auction.query.filter_by(product_id=product.id).first()
    if auction is not None:
        return auction

    now = datetime.now(timezone.utc)
    duration = timedelta(minutes=get_auction_default_duration_minutes())

    auction = Auction(
        product_id=product.id,
        starts_at=now,
        ends_at=now + duration,
        status="OPEN",
        current_price=product.starting_price,
        current_winner_user_id=None,
        created_by_user_id=actor_user_id,
    )
    db.session.add(auction)
    db.session.commit()

    append_block(
        "AUCTION_CREATED",
        {"productId": product.id, "endsAt": auction.ends_at.isoformat() + ("Z" if auction.ends_at.tzinfo is None else "")},
        actor_user_id=actor_user_id,
    )
    return auction


def relaunch_auction(product: Product, actor_user_id: int | None = None) -> Auction:
    auction = Auction.query.filter_by(product_id=product.id).first()
    if auction is None:
        return ensure_auction_for_published_product(product, actor_user_id=actor_user_id)

    # Only relaunch if closed and no bids
    if auction.status != "CLOSED":
        raise ValueError("AUCTION_NOT_CLOSED")
    
    bid_count = Bid.query.filter_by(auction_id=auction.id).count()
    if bid_count > 0:
        raise ValueError("AUCTION_HAS_BIDS")

    now = datetime.now(timezone.utc)
    duration = timedelta(minutes=get_auction_default_duration_minutes())

    auction.status = "OPEN"
    auction.starts_at = now
    auction.ends_at = now + duration
    auction.current_price = product.starting_price
    auction.current_winner_user_id = None
    auction.payment_status = "NONE"
    auction.payment_transaction_id = None
    auction.payment_failure_reason = None
    
    db.session.commit()

    append_block(
        "AUCTION_RELAUNCHED",
        {"productId": product.id, "auctionId": auction.id, "endsAt": auction.ends_at.isoformat() + "Z"},
        actor_user_id=actor_user_id,
    )
    return auction


def close_auction_if_ended(auction: Auction, actor_user_id: int | None = None) -> bool:
    if auction.status != "OPEN":
        return False
    now = datetime.now(timezone.utc)
    ends_at = auction.ends_at
    if ends_at:
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
    if ends_at and now <= ends_at:
        return False

    auction.status = "CLOSED"
    db.session.commit()

    append_block(
        "AUCTION_CLOSED",
        {
            "productId": auction.product_id,
            "currentPrice": auction.current_price,
            "winnerUserId": auction.current_winner_user_id,
        },
        actor_user_id=actor_user_id,
    )
    return True

