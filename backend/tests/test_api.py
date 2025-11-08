from fastapi.testclient import TestClient
from app.main import app, stack

client = TestClient(app)

def reset():
    stack.clear()


def test_push_and_get():
    reset()
    r = client.post("/stack", json={"value": 10})
    assert r.status_code == 200
    assert r.json() == [10.0]

    r = client.post("/stack", json={"value": "5"})
    assert r.status_code == 200
    assert r.json() == [10.0, 5.0]

    r = client.get("/stack")
    assert r.status_code == 200
    assert r.json() == [10.0, 5.0]


def test_add():
    reset()
    client.post("/stack", json={"value": 10})
    client.post("/stack", json={"value": 6})

    r = client.post("/op/+")
    assert r.status_code == 200
    assert r.json() == [16.0]


def test_errors():
    reset()
    r = client.post("/op/+")
    assert r.status_code == 400

    client.post("/stack", json={"value": 1})
    r = client.post("/op/-")
    assert r.status_code == 400

    client.post("/stack", json={"value": 0})
    r = client.post("/op//")
    assert r.status_code == 400
