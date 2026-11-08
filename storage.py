"""Простое хранилище «ключ → JSON».

Если задана переменная DATABASE_URL (Postgres: Neon, Supabase и т.п.) —
всё хранится в базе и переживает перезапуски Render.
Если нет — пишем в локальный файл data.json (подходит для разработки,
но на бесплатном Render файл стирается при каждом деплое/перезапуске).
"""
import asyncio
import copy
import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

log = logging.getLogger("storage")


class Storage:
    def __init__(self, dsn: str | None = None, file: str = "data.json"):
        self.dsn = dsn
        self.file = Path(file)
        self.pool = None
        self.cache: dict = {}
        self.lock = asyncio.Lock()

    async def init(self) -> None:
        if self.dsn:
            import asyncpg  # импорт здесь, чтобы без базы пакет был не обязателен

            self.pool = await asyncpg.create_pool(self.dsn, min_size=1, max_size=3,
                                                  command_timeout=15)
            async with self.pool.acquire() as con:
                await con.execute(
                    "CREATE TABLE IF NOT EXISTS kv ("
                    " key text PRIMARY KEY,"
                    " value jsonb NOT NULL,"
                    " updated_at timestamptz NOT NULL DEFAULT now())"
                )
                rows = await con.fetch("SELECT key, value FROM kv")
            self.cache = {r["key"]: json.loads(r["value"]) for r in rows}
            log.info("storage: postgres, %d keys loaded", len(self.cache))
        else:
            try:
                self.cache = json.loads(self.file.read_text("utf-8"))
            except FileNotFoundError:
                self.cache = {}
            except Exception as e:  # битый файл — начинаем заново, но не падаем
                log.warning("storage: cannot read %s: %s", self.file, e)
                self.cache = {}
            log.info("storage: file %s, %d keys loaded", self.file, len(self.cache))

    def get(self, key: str, default=None):
        """Возвращает копию значения (менять её можно безопасно)."""
        if key in self.cache:
            return copy.deepcopy(self.cache[key])
        return copy.deepcopy(default)

    async def _save(self, key: str, value) -> None:
        self.cache[key] = copy.deepcopy(value)
        if self.pool:
            async with self.pool.acquire() as con:
                await con.execute(
                    "INSERT INTO kv(key, value, updated_at) VALUES($1, $2::jsonb, now()) "
                    "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()",
                    key, json.dumps(value, ensure_ascii=False),
                )
        else:
            tmp = self.file.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.cache, ensure_ascii=False, indent=1), "utf-8")
            os.replace(tmp, self.file)

    async def set(self, key: str, value) -> None:
        async with self.lock:
            await self._save(key, value)

    @asynccontextmanager
    async def edit(self, key: str, default):
        """async with store.edit("pet", {}) as pet: pet["x"] = 1  → сохранится сам."""
        async with self.lock:
            value = self.get(key, default)
            yield value
            await self._save(key, value)

    async def close(self) -> None:
        if self.pool:
            await self.pool.close()
