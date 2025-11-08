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
