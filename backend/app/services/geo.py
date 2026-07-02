from __future__ import annotations

import ipaddress
import json
import urllib.error
import urllib.request


def get_client_ip(request) -> str | None:
    forwarded = (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
    candidate = forwarded or (request.headers.get("X-Real-IP") or "").strip() or (request.remote_addr or "").strip()
    if not candidate:
        return None

    try:
        ip = ipaddress.ip_address(candidate)
    except ValueError:
        return None

    if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_multicast:
        return None
    return candidate


def resolve_coordinates_from_ip(ip: str | None) -> tuple[float, float] | None:
    if not ip:
        return None

    url = f"https://ipapi.co/{ip}/json/"
    try:
        with urllib.request.urlopen(url, timeout=2.0) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
        return None

    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    if latitude is None or longitude is None:
        return None

    try:
        return float(latitude), float(longitude)
    except (TypeError, ValueError):
        return None


def resolve_coordinates_from_request(request) -> tuple[float, float] | None:
    return resolve_coordinates_from_ip(get_client_ip(request))
