# RPN Calculator (Client/Server)

- Backend: FastAPI (Python 3), Swagger auto.
- Frontend: React + Vite + TypeScript.

## Run Backend

Using uvicorn (install deps with Poetry or pip):

```bash
# With Poetry
poetry install
poetry run uvicorn app.main:app --reload --port 8001 --app-dir backend

# Or with pip
pip install -r backend/requirements.txt
uvicorn app.main:app --reload --port 8001 --app-dir backend
```

Swagger UI: http://localhost:8001/docs
OpenAPI JSON: http://localhost:8001/swagger.json

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE` env var if backend is not `http://localhost:8001`.

- App: http://localhost:5173 (or 5174 if specified)
- In-app API docs (bilingual): http://localhost:5173/docs
- Swagger link also shown under the calculator

## Endpoints (multi-stack API)

- GET `/rpn/op` → `{ operands: ["+", "-", "*", "div"] }`
- POST `/rpn/stack` → `{ stack_id }`
- GET `/rpn/stack` → `{ stacks: { <id>: [numbers] } }`
- GET `/rpn/stack/{stack_id}` → `{ stack: [numbers] }`
- POST `/rpn/stack/{stack_id}?value=10` → `{ stack: [...] }`
- DELETE `/rpn/stack/{stack_id}` → `{ message: "Stack deleted successfully" }`
- POST `/rpn/op/{op}/stack/{stack_id}` where `op` ∈ `+ - * div` → `{ stack: [...] }`
- GET `/swagger.json` → OpenAPI schema
- GET `/docs` → Swagger UI

## Tests

```bash
cd backend
pytest -q
```

## Deploy on Vercel (Backend + Redis)

Backend is a FastAPI serverless function. For persistence across cold starts, use Redis (e.g., Upstash).

- Create a Vercel Project for the backend with Root Directory = repo root (where `api/` lives).
- Set env variable in Vercel Project → Settings → Environment Variables:
  - `REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT`
    - TLS is recommended (`rediss://`).
- The app will automatically use Redis if `REDIS_URL` (or `UPSTASH_REDIS_URL`) is set; otherwise it falls back to in-memory.

Endpoints in production (serverless):
- `GET /api/rpn/op`
- `POST /api/rpn/stack` → `{ stack_id }`
- `GET /api/rpn/stack/{stack_id}`
- `POST /api/rpn/stack/{stack_id}?value=10`
- `POST /api/rpn/op/{op}/stack/{stack_id}` where op ∈ `+ - * div`
- Swagger: `/api/docs`, OpenAPI JSON: `/api/swagger.json`

#### Diagnostics

- `GET /api/rpn/_storage` → `{ backend: "redis" | "memory" }`
- `POST /api/rpn/_write_test` → force une écriture Redis de test et retourne `stack_id`
- `GET /api/rpn/_read_test/{stack_id}` → lit la valeur écrite
- `GET /api/rpn/_diag` → vérifie la présence de `REDIS_URL` et le ping Redis (utile en local)

### Frontend (Vite) on Vercel

- Create a second Vercel Project with Root Directory = `frontend`.
- Set env var (Project → Settings → Environment Variables):
  - `VITE_API_BASE=https://<your-backend>.vercel.app/api`
- Build & Output:
  - Build Command: `npm run build`
  - Output Directory: `dist`

### Local env examples

- Backend: copy `backend/.env.example` to `backend/.env` and set `REDIS_URL` if you want to use Redis locally.
- Frontend: set `frontend/.env.local` with `VITE_API_BASE` (defaults to `http://localhost:8001`).
