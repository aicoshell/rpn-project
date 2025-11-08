from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Union, Dict
from .rpn import RPNStack
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4
from fastapi.responses import JSONResponse

app = FastAPI(title="RPN Calculator API", version="1.0.0")

# Global in-memory stack (simple MVP)
stack = RPNStack()

# Multi-stack storage
stacks: Dict[str, RPNStack] = {}

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

@app.get("/stack", response_model=List[float])
def get_stack() -> List[float]:
    return stack.items()

@app.delete("/stack", response_model=List[float])
def clear_stack() -> List[float]:
    stack.clear()
    return stack.items()

@app.post("/stack", response_model=List[float])
def push_value(req: PushRequest) -> List[float]:
    val = _parse_value(req.value)
    stack.push(val)
    return stack.items()

@app.post("/op/{symbol}", response_model=List[float])
def operate(symbol: str) -> List[float]:
    try:
        stack.apply(symbol)
    except ZeroDivisionError:
        raise HTTPException(status_code=400, detail="Division by zero")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return stack.items()

# ---------------- Multi-stack API (Flask-compatible) ---------------- #

@app.get("/swagger.json")
def swagger_alias():
    return JSONResponse(app.openapi())

@app.get("/rpn/op")
def list_operands():
    return {"operands": ["+", "-", "*", "div"]}

@app.post("/rpn/stack", status_code=201)
def create_stack():
    stack_id = str(uuid4())
    stacks[stack_id] = RPNStack()
    return {"stack_id": stack_id}

@app.get("/rpn/stack")
def list_stacks():
    return {"stacks": {sid: s.items() for sid, s in stacks.items()}}

@app.get("/rpn/stack/{stack_id}")
def get_stack_multi(stack_id: str):
    s = stacks.get(stack_id)
    if not s:
        raise HTTPException(status_code=404, detail="Stack not found")
    return {"stack": s.items()}

@app.post("/rpn/stack/{stack_id}")
def push_value_multi(stack_id: str, value: Union[float, str] | None = None):
    s = stacks.get(stack_id)
    if not s:
        raise HTTPException(status_code=404, detail="Stack not found")
    if value is None:
        raise HTTPException(status_code=400, detail="Value parameter is required")
    v = _parse_value(value)
    s.push(v)
    return {"stack": s.items()}

@app.delete("/rpn/stack/{stack_id}")
def delete_stack_multi(stack_id: str):
    if stack_id not in stacks:
        raise HTTPException(status_code=404, detail="Stack not found")
    del stacks[stack_id]
    return {"message": "Stack deleted successfully"}

@app.post("/rpn/op/{op}/stack/{stack_id}")
def apply_operation_multi(op: str, stack_id: str):
    s = stacks.get(stack_id)
    if not s:
        raise HTTPException(status_code=404, detail="Stack not found")
    symbol = "/" if op == "div" else op
    try:
        s.apply(symbol)
    except ZeroDivisionError:
        raise HTTPException(status_code=400, detail="Division by zero")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"stack": s.items()}
