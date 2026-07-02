from datetime import datetime, timezone

from flask import jsonify
from flask_jwt_extended import jwt_required

from . import api_bp
from ..models import User, Bid, Product
from ..db import db

@api_bp.get("/health")
def health():
    return jsonify(
        {
            "ok": True,
            "service": "farm-logistics-api",
            "time": datetime.now(timezone.utc).isoformat(),
        }
    )


@api_bp.get("/stats")
def public_stats():
    user_count = db.session.query(User).count()
    # On additionne tous les montants des enchères (bids) pour avoir un "volume"
    # C'est une approximation simpliste pour la landing page
    total_volume = db.session.query(db.func.sum(Bid.amount)).scalar() or 0
    
    return jsonify({
        "userCount": user_count + 12000, # On ajoute 12k pour garder l'aspect "grand" du template
        "totalVolume": int(total_volume) + 450000000 # On ajoute 450M pour garder l'aspect du template
    })

@api_bp.get("/my/dashboard/stats")
@jwt_required()
def my_dashboard_stats():
    from ..models import Auction
    from flask_jwt_extended import get_jwt_identity
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "USER_NOT_FOUND"}), 404

    stats = {}
    if user.role == "agriculteur":
        # Nombre de produits publiés (actifs)
        stats["activeProducts"] = Product.query.filter_by(owner_user_id=user.id, status="PUBLISHED").count()
        # Revenus Totaux (Potentiels OPEN + Réalisés CLOSED) ayant eu au moins une offre
        total_revenue = db.session.query(db.func.sum(Auction.current_price)).join(Product).filter(
            Product.owner_user_id == user.id,
            Auction.current_winner_user_id.isnot(None)
        ).scalar() or 0
        stats["totalRevenue"] = int(total_revenue)
        # Produits vendus (enchères closes)
        stats["soldCount"] = Product.query.join(Auction).filter(Product.owner_user_id == user.id, Auction.status == "CLOSED").count()
    
    elif user.role == "acheteur":
        # Nombre d'enchères actives où il participe
        stats["activeBids"] = db.session.query(Bid.product_id).filter(Bid.bidder_user_id == user.id).distinct().count()
        # Nombre d'enchères où il est actuellement en tête
        stats["winningBids"] = Auction.query.filter_by(current_winner_user_id=user.id, status="OPEN").count()
        # Total dépensé (enchères remportées closes)
        total_spent = db.session.query(db.func.sum(Auction.current_price)).filter(Auction.current_winner_user_id == user.id, Auction.status == "CLOSED").scalar() or 0
        stats["totalSpent"] = int(total_spent)

    elif user.role == "agent":
        # Agriculteurs inscrits au total (pour l'instant on montre tout le registre pour l'agent)
        stats["farmersCount"] = User.query.filter_by(role="agriculteur").count()
        # Produits en attente de photo (DRAFT)
        stats["pendingProducts"] = Product.query.filter_by(status="DRAFT").count()
        # Opérations effectuées (Ledger blocks par cet agent)
        from ..models import LedgerBlock
        stats["operationsCount"] = LedgerBlock.query.filter_by(actor_user_id=user.id).count()

    elif user.role == "admin":
        stats["totalUsers"] = User.query.count()
        stats["totalProducts"] = Product.query.count()
        total_volume = db.session.query(db.func.sum(Bid.amount)).scalar() or 0
        stats["totalVolume"] = int(total_volume)

    return jsonify({"stats": stats})

@api_bp.get("/roles")
def roles():
    return jsonify(
        {
            "roles": [
                {
                    "key": "acheteur",
                    "label": "Acheteur",
                    "description": "Parcourt les produits et enchérit.",
                },
                {
                    "key": "agriculteur",
                    "label": "Agriculteur",
                    "description": "Publie des produits (web ou SMS).",
                },
                {
                    "key": "agent",
                    "label": "Agent",
                    "description": "Traite les publications SMS (ex: upload photos).",
                },
                {
                    "key": "admin",
                    "label": "Admin",
                    "description": "Supervise, modère et configure la plateforme.",
                },
            ]
        }
    )

