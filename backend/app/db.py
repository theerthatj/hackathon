from contextlib import contextmanager
from typing import Iterator
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from app.settings import settings

pool: ConnectionPool | None = None


def init_pool():
    global pool
    if pool is None:
        pool = ConnectionPool(
            conninfo=settings.DATABASE_URL,
            min_size=2,
            max_size=20,
            open=False,
            kwargs={"row_factory": dict_row},
        )
        pool.open()


def close_pool():
    global pool
    if pool is not None:
        pool.close()
        pool = None


@contextmanager
def get_db() -> Iterator[psycopg.Connection]:
    if pool is None:
        init_pool()
    assert pool is not None
    with pool.connection() as conn:
        yield conn
