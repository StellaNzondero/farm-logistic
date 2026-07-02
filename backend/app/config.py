import os
from pathlib import Path
from datetime import timedelta

from dotenv import load_dotenv


class Config:
    def __init__(self) -> None:
        load_dotenv()

        self.BASE_DIR = Path(os.getenv("BASE_DIR", os.getcwd())).resolve()
        self.SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
        self.JWT_SECRET_KEY = os.getenv(
            "JWT_SECRET_KEY", "dev-jwt-secret-please-change-this-to-32-bytes-min"
        )
        expires_hours = int(os.getenv("JWT_EXPIRES_HOURS", "24"))
        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=expires_hours)
        self.CORS_ALLOW_ALL = os.getenv("CORS_ALLOW_ALL", "0").lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        origins = os.getenv("FRONTEND_ORIGINS", "").strip()
        if origins:
            self.FRONTEND_ORIGINS = [o.strip() for o in origins.split(",") if o.strip()]
        else:
            self.FRONTEND_ORIGINS = [
                os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
                "http://127.0.0.1:5173",
                "http://192.168.1.70:5173",
            ]
        self.SQLALCHEMY_DATABASE_URI = os.getenv(
            "DATABASE_URL", "sqlite:///farmlogistics.db"
        )
        self.SQLALCHEMY_TRACK_MODIFICATIONS = False

        self.UPLOAD_DIR = os.getenv("UPLOAD_DIR", str((self.BASE_DIR / "uploads").resolve()))

        self.BOOTSTRAP_ADMIN = os.getenv("BOOTSTRAP_ADMIN", "0").lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        self.ADMIN_FULL_NAME = os.getenv("ADMIN_FULL_NAME", "Admin")
        self.ADMIN_EMAIL = (os.getenv("ADMIN_EMAIL", "") or "").strip().lower() or None
        self.ADMIN_PHONE = (os.getenv("ADMIN_PHONE", "") or "").strip()
        self.ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")

        # Shwary Mobile Money Config
        self.SHWARY_MERCHANT_ID = os.getenv("SHWARY_MERCHANT_ID")
        self.SHWARY_MERCHANT_KEY = os.getenv("SHWARY_MERCHANT_KEY")
        self.SHWARY_CALLBACK_URL = os.getenv("SHWARY_CALLBACK_URL", "https://api.farmlogistics.com/api/payments/callback")
        self.SHWARY_SANDBOX = os.getenv("SHWARY_SANDBOX", "1").lower() in {"1", "true", "yes", "on"}
