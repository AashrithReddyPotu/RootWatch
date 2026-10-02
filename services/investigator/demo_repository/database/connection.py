from dataclasses import dataclass, field
from typing import Callable


@dataclass
class Connection:
    identifier: int
    closed: bool = False
    release: Callable[[], None] = field(default=lambda: None, repr=False)

    def execute(self, statement: str, parameters: dict) -> dict:
        if self.closed:
            raise RuntimeError("Connection is closed")
        return {"statement": statement, "parameters": parameters}

    def close(self) -> None:
        if not self.closed:
            self.closed = True
            self.release()


class ConnectionPool:
    def __init__(self, capacity: int = 3):
        self.capacity = capacity
        self.borrowed = 0

    def acquire(self) -> Connection:
        if self.borrowed >= self.capacity:
            raise TimeoutError("Connection pool exhausted")
        self.borrowed += 1
        return Connection(self.borrowed, release=self.release)

    def release(self) -> None:
        self.borrowed = max(0, self.borrowed - 1)


pool = ConnectionPool()


def get_connection() -> Connection:
    return pool.acquire()
