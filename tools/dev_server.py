"""Локальный запуск мини-приложения БЕЗ Telegram (для разработки и проверки дизайна).

    DEV_AUTH=1 ADMIN_ID=1 PARTNER_ID=2 python tools/dev_server.py

Открой http://localhost:8080/app/?dev=1  (Ксюша)  или  ?dev=2  (Дима).
Сообщения, которые бот отправил бы в Telegram, просто печатаются в консоль.
"""
import asyncio
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DEV_AUTH", "1")
os.environ.setdefault("BOT_TOKEN", "0:dev")
os.environ.setdefault("ADMIN_ID", "1")
os.environ.setdefault("PARTNER_ID", "2")

from aiohttp import web  # noqa: E402

import webapp_api  # noqa: E402
from storage import Storage  # noqa: E402


class FakeBot:
    async def send_message(self, chat_id, text, **_):
        print(f"[bot → {chat_id}] {text}")

    async def get_user_profile_photos(self, *_a, **_k):
        raise RuntimeError("no telegram in dev")


async def main():
    logging.basicConfig(level=logging.INFO)
    store = Storage(None, os.getenv("DEV_DATA", "dev-data.json"))
    await store.init()
    app = web.Application()
    webapp_api.setup(app, FakeBot(), store)
    runner = web.AppRunner(app)
    await runner.setup()
    port = int(os.getenv("PORT", "8080"))
    await web.TCPSite(runner, "0.0.0.0", port).start()
    print(f"dev server: http://localhost:{port}/app/?dev=1")
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
