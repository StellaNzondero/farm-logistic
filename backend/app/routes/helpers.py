from __future__ import annotations

from flask_jwt_extended import get_jwt_identity

from ..db import db
from ..models import Auction, Product, User
from ..services.auctions import close_auction_if_ended, ensure_auction_for_published_product


def current_user() -> User | None:
    user_id = get_jwt_identity()
    if not user_id:
        return None
    return db.session.get(User, int(user_id))


def parse_float(value) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def product_to_public_with_image(product: Product) -> dict:
    data = product.to_public()
    data["imageUrl"] = (
        f"/api/uploads/{product.image_path}" if product.image_path else None
    )
    auction = Auction.query.filter_by(product_id=product.id).first()
    if auction is None and product.status == "PUBLISHED":
        auction = ensure_auction_for_published_product(product, actor_user_id=None)
    if auction is not None:
        close_auction_if_ended(auction)
        data["auction"] = auction.to_public()
    else:
        data["auction"] = None
    return data
