from flask import current_app, send_from_directory

from . import api_bp


@api_bp.get("/uploads/<path:filename>")
def uploaded_file(filename: str):
    upload_dir = current_app.config["UPLOAD_DIR"]
    return send_from_directory(upload_dir, filename)

