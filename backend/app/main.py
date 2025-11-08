from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import List, Union, Dict
from .rpn import RPNStack
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4
from fastapi.responses import JSONResponse
from .storage import RedisStorage
import os
try:
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None

tags_metadata = [
    {"name": "Stack (global)", "description": "Pile unique partagée (mode démo, non isolée)."},
    {"name": "RPN (session/redis)", "description": "API multi-piles par session utilisateur, persistée via Redis."},
    {"name": "Diagnostics", "description": "Endpoints de diagnostic pour le stockage et la connectivité."},
    {"name": "Info", "description": "Informations et alias OpenAPI."},
]

app = FastAPI(title="RPN Calculator API", version="1.0.0", openapi_tags=tags_metadata)

# Global in-memory stack (simple MVP)
stack = RPNStack()

# Multi-stack storage via Redis (fallback to memory if REDIS_URL not set)
store = RedisStorage.from_env()

class PushRequest(BaseModel):
    value: Union[float, str]

def _parse_value(v: Union[float, str]) -> float:
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.strip().replace(",", ".")  # accept comma decimal
        try:
            return float(s)
        except ValueError:
            raise HTTPException(status_code=400, detail="Non-numeric value")
    raise HTTPException(status_code=400, detail="Non-numeric value")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/stack", response_model=List[float], tags=["Stack (global)"])
def get_stack() -> List[float]:
    return stack.items()

@app.delete("/stack", response_model=List[float], tags=["Stack (global)"])
def clear_stack() -> List[float]:
    stack.clear()
    return stack.items()

@app.post("/stack", response_model=List[float], tags=["Stack (global)"])
def push_value(req: PushRequest) -> List[float]:
    val = _parse_value(req.value)
    stack.push(val)
    return stack.items()

@app.post("/op/{symbol}", response_model=List[float], tags=["Stack (global)"])
def operate(symbol: str) -> List[float]:
    try:
        stack.apply(symbol)
    except ZeroDivisionError:
        raise HTTPException(status_code=400, detail="Division by zero")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return stack.items()

# ---------------- Multi-stack API (Flask-compatible) ---------------- #

@app.get("/swagger.json", tags=["Info"])
def swagger_alias():
    return JSONResponse(app.openapi())

@app.get("/rpn/op", tags=["RPN (session/redis)"])
def list_operands():
    return {"operands": ["+", "-", "*", "div"]}

@app.post("/rpn/stack", status_code=201, tags=["RPN (session/redis)"])
def create_stack(request: Request):
    session = (request.headers.get("x-rpn-session") or "public").strip()
    stack_id = str(uuid4())
    effective_id = f"{session}:{stack_id}"
    store.set(effective_id, [])
    return {"stack_id": stack_id}

@app.get("/rpn/stack", tags=["RPN (session/redis)"])
def list_stacks(request: Request):
    session = (request.headers.get("x-rpn-session") or "public").strip()
    all_items = store.list_all()
    # Keep only keys for this session and strip the session prefix
    filtered = {}
    prefix = f"{session}:"
    for key, values in all_items.items():
        if key.startswith(prefix):
            filtered[key[len(prefix):]] = values
    return {"stacks": filtered}

@app.get("/rpn/stack/{stack_id}", tags=["RPN (session/redis)"])
def get_stack_multi(stack_id: str, request: Request):
    session = (request.headers.get("x-rpn-session") or "public").strip()
    effective_id = f"{session}:{stack_id}"
    values = store.get(effective_id)
    if values is None:
        # Auto-create if missing to be resilient across serverless cold starts
        store.set(effective_id, [])
        values = []
    return {"stack": values}

@app.post("/rpn/stack/{stack_id}", tags=["RPN (session/redis)"])
def push_value_multi(stack_id: str, request: Request, value: Union[float, str] | None = None):
    session = (request.headers.get("x-rpn-session") or "public").strip()
    effective_id = f"{session}:{stack_id}"
    values = store.get(effective_id)
    if values is None:
        values = []
    if value is None:
        raise HTTPException(status_code=400, detail="Value parameter is required")
    v = _parse_value(value)
    # apply to a transient RPNStack for correctness
    s = RPNStack()
    for x in values:
        s.push(x)
    s.push(v)
    values = s.items()
    store.set(effective_id, values)
    return {"stack": values}

# ---------------- Diagnostics ---------------- #

@app.get("/rpn/_storage", tags=["Diagnostics"])
def storage_info():
    backend = "redis" if store.__class__.__name__.lower().startswith("redis") else "memory"
    return {"backend": backend}

@app.post("/rpn/_write_test", tags=["Diagnostics"])
def write_test():
    diag_id = f"diag-{str(uuid4())}"
    payload = [1.0, 2.0, 3.0]
    store.set(diag_id, payload)
    return {"stack_id": diag_id, "written": payload}

@app.get("/rpn/_read_test/{stack_id}", tags=["Diagnostics"])
def read_test(stack_id: str):
    values = store.get(stack_id)
    return {"stack_id": stack_id, "values": values}

@app.get("/rpn/_diag", tags=["Diagnostics"])
def env_diagnostics():
    backend = "redis" if store.__class__.__name__.lower().startswith("redis") else "memory"
    url = os.environ.get("REDIS_URL") or os.environ.get("UPSTASH_REDIS_URL")
    env_present = bool(url)
    ping_ok = None
    error = None
    if url and redis is not None:
        # Try strict TLS with certifi, then relax
        try:
            strict_kwargs = {"decode_responses": True}
            if url.startswith("rediss://"):
                import certifi  # local import to avoid hard dep in environments without certifi
                strict_kwargs["ssl_cert_reqs"] = __import__("ssl").CERT_REQUIRED  # type: ignore[arg-type]
                strict_kwargs["ssl_ca_certs"] = certifi.where()  # type: ignore[arg-type]
            client = redis.Redis.from_url(url, **strict_kwargs)
            client.ping()
            ping_ok = True
        except Exception as e1:  # pragma: no cover
            try:
                relaxed_kwargs = {"decode_responses": True}
                if url.startswith("rediss://"):
                    relaxed_kwargs["ssl_cert_reqs"] = __import__("ssl").CERT_NONE  # type: ignore[arg-type]
                client = redis.Redis.from_url(url, **relaxed_kwargs)
                client.ping()
                ping_ok = True
            except Exception as e2:
                ping_ok = False
                error = f"strict: {str(e1)}; relaxed: {str(e2)}"
    elif url and redis is None:
        error = "redis-py not installed"
    return {
        "backend": backend,
        "env_present": env_present,
        "ping_ok": ping_ok,
        "error": error,
    }

@app.delete("/rpn/stack/{stack_id}", tags=["RPN (session/redis)"])
def delete_stack_multi(stack_id: str, request: Request):
    session = (request.headers.get("x-rpn-session") or "public").strip()
    effective_id = f"{session}:{stack_id}"
    values = store.get(effective_id)
    if values is None:
        raise HTTPException(status_code=404, detail="Stack not found")
    store.delete(effective_id)
    return {"message": "Stack deleted successfully"}

@app.post("/rpn/op/{op}/stack/{stack_id}", tags=["RPN (session/redis)"])
def apply_operation_multi(op: str, stack_id: str, request: Request):
    session = (request.headers.get("x-rpn-session") or "public").strip()
    effective_id = f"{session}:{stack_id}"
    values = store.get(effective_id)
    if values is None:
        values = []
    symbol = "/" if op == "div" else op
    try:
        # apply operation using transient RPNStack
        s = RPNStack()
        for x in values:
            s.push(x)
        s.apply(symbol)
    except ZeroDivisionError:
        raise HTTPException(status_code=400, detail="Division by zero")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    values = s.items()
    store.set(stack_id, values)
    return {"stack": values}
