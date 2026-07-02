from flask import Blueprint

api_bp = Blueprint("api", __name__, url_prefix="/api")

# Import route modules to register endpoints on the blueprint.
from . import auth as _auth  # noqa: F401
from . import admin as _admin  # noqa: F401
from . import core as _core  # noqa: F401
from . import agent as _agent  # noqa: F401
from . import bids as _bids  # noqa: F401
from . import catalog as _catalog  # noqa: F401
from . import products as _products  # noqa: F401
from . import sms as _sms  # noqa: F401
from . import uploads as _uploads  # noqa: F401

__all__ = ["api_bp"]
