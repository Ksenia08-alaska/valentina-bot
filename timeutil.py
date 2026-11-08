import os
import time
from datetime import datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo(os.getenv("TZ_NAME", "Europe/Minsk"))


def now_local() -> datetime:
    return datetime.now(TZ)


def day_str(ts: float | None = None) -> str:
    return datetime.fromtimestamp(ts if ts is not None else time.time(), TZ).strftime("%Y-%m-%d")
