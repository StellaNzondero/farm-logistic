from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .config import Config
from .db import db
from .schema import ensure_schema
from .routes import api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config())

    cors_origins = "*"
    if not app.config.get("CORS_ALLOW_ALL", False):
        cors_origins = app.config["FRONTEND_ORIGINS"]

    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=False,
    )

    db.init_app(app)
    JWTManager(app)

    with app.app_context():
        from . import models  # noqa: F401
        from .services.bootstrap import ensure_bootstrap_admin
        from .services.catalog import ensure_market_catalog_seed

        db.create_all()
        ensure_schema()
        ensure_market_catalog_seed()
        ensure_bootstrap_admin()

    from .routes.payments import payments_bp
    app.register_blueprint(payments_bp)

    import os
    from .services.payments import start_payment_service
    if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        start_payment_service(app)

    app.register_blueprint(api_bp)
    return app
