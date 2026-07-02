# Backend (Flask)

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

## Run

```powershell
flask --app wsgi run --debug --host 0.0.0.0 --port 5000
```

## API

- `GET /api/health`
- `GET /api/roles`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (JWT)
- `GET /api/products` (public, PUBLISHED)
- `GET /api/products/:id` (public, PUBLISHED)
- `GET /api/catalog/entries` (public)
- `GET /api/my/products` (JWT)
- `POST /api/my/products` (JWT, agriculteur)
- `PATCH /api/my/products/:id` (JWT, agriculteur)
- `POST /api/my/products/:id/publish` (JWT, agriculteur)
- `POST /api/my/products/:id/photo` (JWT, agriculteur)
- `GET /api/uploads/:filename` (public)
- `POST /api/sms/inbound`

## Admin / Agent

- Bootstrap admin (dev): `BOOTSTRAP_ADMIN=1` + `ADMIN_PHONE` + `ADMIN_PASSWORD` dans `.env`
- Admin: `GET /api/admin/users`, `POST /api/admin/users` (role=agent)
- Admin: `GET/PUT /api/admin/settings/auction` (defaultDurationSeconds)
- Admin: `GET /api/admin/ledger`
- Agent: `GET /api/agent/products/needs-photo`, `POST /api/agent/products/:id/photo`, `POST /api/agent/products/:id/publish`

## Enchères

- `POST /api/bids` (JWT acheteur)
- `GET /api/products/:id/bids` (JWT)
- `GET /api/stream/products/:id` (SSE)
