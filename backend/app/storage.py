import os
import json
import ssl
import certifi
from typing import Dict, List, Optional

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None  # will fallback to memory if missing


class Storage:
    def get(self, stack_id: str) -> Optional[List[float]]: ...
    def set(self, stack_id: str, values: List[float]) -> None: ...
    def delete(self, stack_id: str) -> None: ...
    def list_all(self) -> Dict[str, List[float]]: ...


class MemoryStorage(Storage):
    def __init__(self) -> None:
        self._data: Dict[str, List[float]] = {}

    def get(self, stack_id: str) -> Optional[List[float]]:
        v = self._data.get(stack_id)
        return list(v) if v is not None else None

    def set(self, stack_id: str, values: List[float]) -> None:
        self._data[stack_id] = list(values)

    def delete(self, stack_id: str) -> None:
        self._data.pop(stack_id, None)

    def list_all(self) -> Dict[str, List[float]]:
        return {k: list(v) for k, v in self._data.items()}


class RedisStorage(Storage):
    def __init__(self, client: "redis.Redis", prefix: str = "rpn:stack:") -> None:
        self.client = client
        self.prefix = prefix

    @staticmethod
    def from_env() -> Storage:
        url = os.environ.get("REDIS_URL") or os.environ.get("UPSTASH_REDIS_URL")
        if url:
            url = url.strip()
        if url and redis is not None:
            try:
                # First try strict TLS using certifi CA bundle
                strict_kwargs = {
                    "decode_responses": True,
                    "socket_connect_timeout": 3,
                    "socket_timeout": 3,
                }
                if url.startswith("rediss://"):
                    strict_kwargs["ssl_cert_reqs"] = ssl.CERT_REQUIRED  # type: ignore[arg-type]
                    strict_kwargs["ssl_ca_certs"] = certifi.where()     # type: ignore[arg-type]
                client = redis.Redis.from_url(url, **strict_kwargs)
                client.ping()
                return RedisStorage(client)
            except Exception:
                # Fallback: disable certificate verification (local dev workaround)
                try:
                    relaxed_kwargs = {
                        "decode_responses": True,
                        "socket_connect_timeout": 3,
                        "socket_timeout": 3,
                    }
                    if url.startswith("rediss://"):
                        relaxed_kwargs["ssl_cert_reqs"] = ssl.CERT_NONE  # type: ignore[arg-type]
                    client = redis.Redis.from_url(url, **relaxed_kwargs)
                    client.ping()
                    return RedisStorage(client)
                except Exception:
                    return MemoryStorage()
        return MemoryStorage()

    def _key(self, stack_id: str) -> str:
        return f"{self.prefix}{stack_id}"

    def get(self, stack_id: str) -> Optional[List[float]]:
        raw = self.client.get(self._key(stack_id))
        if raw is None:
            return None
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                return [float(x) for x in data]
        except Exception:
            return None
        return None

    def set(self, stack_id: str, values: List[float]) -> None:
        self.client.set(self._key(stack_id), json.dumps(values))

    def delete(self, stack_id: str) -> None:
        self.client.delete(self._key(stack_id))

    def list_all(self) -> Dict[str, List[float]]:
        result: Dict[str, List[float]] = {}
        # Upstash/Redis SCAN for keys
        cursor = 0
        pattern = f"{self.prefix}*"
        while True:
            cursor, keys = self.client.scan(cursor=cursor, match=pattern, count=100)
            for k in keys:
                raw = self.client.get(k)
                if raw is None:
                    continue
                try:
                    data = json.loads(raw)
                    if isinstance(data, list):
                        stack_id = k[len(self.prefix):]
                        result[stack_id] = [float(x) for x in data]
                except Exception:
                    continue
            if cursor == 0:
                break
        return result
