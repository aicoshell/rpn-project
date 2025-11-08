from __future__ import annotations

class RPNStack:
    def __init__(self) -> None:
        self._stack: list[float] = []

    def items(self) -> list[float]:
        return self._stack.copy()

    def clear(self) -> None:
        self._stack.clear()

    def push(self, v: float) -> None:
        self._stack.append(float(v))

    def _pop2(self) -> tuple[float, float]:
        if len(self._stack) < 2:
            raise ValueError("Pas assez d'opérandes")
        b = self._stack.pop()
        a = self._stack.pop()
        return a, b

    def _div(self, a: float, b: float) -> float:
        if b == 0:
            raise ZeroDivisionError()
        return a / b

    def apply(self, symbol: str) -> float:
        ops = {
            "+": lambda a, b: a + b,
            "-": lambda a, b: a - b,
            "*": lambda a, b: a * b,
            "/": self._div,
        }
        if symbol not in ops:
            raise ValueError("Opérateur non supporté")
        a, b = self._pop2()
        res = ops[symbol](a, b)
        self.push(res)
        return res
