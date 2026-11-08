"""Логика общего питомца: выбор, рост, характеристики, огонёк (серия дней)."""
import random
import time
from datetime import datetime, timedelta

from timeutil import TZ, day_str, now_local

# ---------- виды животных ----------
# foods: что можно дать; fav — любимая еда (секрет, её надо «открыть»)
SPECIES = {
    "cat_ginger": {"name": "Рыжий котик", "sound": "Мур", "foods": ["fish", "milk", "chicken", "cookie"], "fav": "fish"},
    "cat_gray":   {"name": "Серый котик", "sound": "Мяу", "foods": ["fish", "milk", "chicken", "cheese"], "fav": "milk"},
    "cat_white":  {"name": "Белый котик", "sound": "Мррр", "foods": ["fish", "milk", "chicken", "strawberry"], "fav": "chicken"},
    "dog_corgi":  {"name": "Корги", "sound": "Гав", "foods": ["bone", "chicken", "carrot", "cookie"], "fav": "cookie"},
    "dog_samoyed": {"name": "Самоед", "sound": "Тяф", "foods": ["bone", "chicken", "apple", "cheese"], "fav": "bone"},
    "parrot":     {"name": "Попугай", "sound": "Кррр", "foods": ["seeds", "apple", "grapes", "carrot"], "fav": "grapes"},
    "hamster":    {"name": "Хомячок", "sound": "Пи-пи", "foods": ["seeds", "carrot", "cheese", "apple"], "fav": "seeds"},
    "turtle":     {"name": "Черепашка", "sound": "...", "foods": ["salad", "strawberry", "apple", "carrot"], "fav": "strawberry"},
    "raccoon":    {"name": "Енотик", "sound": "Фыр", "foods": ["grapes", "fish", "cookie", "apple"], "fav": "grapes"},
}

FOOD_NAMES = {
    "fish": "рыбка", "milk": "молочко", "chicken": "курочка", "cookie": "печенька",
    "cheese": "сыр", "strawberry": "клубника", "bone": "косточка", "carrot": "морковка",
    "apple": "яблоко", "seeds": "семечки", "grapes": "виноград", "salad": "салатик",
}

# ---------- стадии роста (по дням) ----------
# Питомец растёт с возрастом. Забота и игры дают опыт, а каждые XP_PER_DAY опыта
# добавляют ещё один «день роста» — так можно ускорить взросление.
STAGES = [
    (0, "Новорождённый"),
    (10, "Малыш"),
    (50, "Шалунишка"),
    (100, "Подросток"),
    (200, "Юный"),
    (300, "Взрослый"),
    (365, "Легенда"),
]
XP_PER_DAY = 300
RESTORES_PER_MONTH = 3


def age_days(pet: dict, now: float | None = None) -> int:
    born = pet.get("born_at") or time.time()
    return max(0, int(((now or time.time()) - born) // 86400))


def growth_days(pet: dict) -> int:
    return age_days(pet) + pet.get("xp", 0) // XP_PER_DAY


def stage_of_days(days: int) -> int:
    s = 0
    for i, (need, _) in enumerate(STAGES):
        if days >= need:
            s = i
    return s


def stage_of_pet(pet: dict) -> int:
    return stage_of_days(growth_days(pet))


def check_growth(pet: dict) -> list[int]:
    """Возвращает новые стадии, до которых питомец дорос с прошлой проверки."""
    if pet.get("status") != "alive":
        return []
    cur = stage_of_pet(pet)
    seen = pet.get("stage_seen", 0)
    grown = list(range(seen + 1, cur + 1))
    for st in grown:
        add_history(pet, "stage", f"Подрос до стадии «{STAGES[st][1]}»", stage=st)
    if cur > seen:
        pet["stage_seen"] = cur
    return grown


# ---------- действия ----------
# cd — перезарядка (сек) для каждого человека отдельно
ACTIONS = {
    "feed":  {"cd": 30 * 60, "xp": 10},
    "play":  {"cd": 20 * 60, "xp": 8},
    "wash":  {"cd": 2 * 3600, "xp": 8},
    "sleep": {"cd": 4 * 3600, "xp": 5},
    "pet":   {"cd": 10 * 60, "xp": 3},   # погладить можно всегда, но опыт — раз в 10 минут
}
CARE_CAP = 70   # опыта за уход в день на человека
GAME_CAP = 60   # опыта за игры в день на человека
SLEEP_SECONDS = 2 * 3600
NAME_COOLDOWN = 14 * 24 * 3600

STATS = ("food", "joy", "energy", "clean")
DECAY = {"food": 4.0, "joy": 3.0, "energy": 2.0, "clean": 1.5}  # в час


def new_pet() -> dict:
    return {"status": "choosing", "picks": {}, "history": [], "counters": {}}


def _clamp(v: float) -> float:
    return max(0.0, min(100.0, v))


def is_night(ts: float) -> bool:
    h = datetime.fromtimestamp(ts, TZ).hour
    return h >= 23 or h < 8


def tick(pet: dict, now: float | None = None) -> None:
    """Пересчитывает характеристики с момента последнего обновления."""
    if pet.get("status") != "alive":
        return
    now = now or time.time()
    t = pet.get("stats_ts", now)
    stats = pet["stats"]
    # шаги максимум по часу, максимум 4 суток назад
    t = max(t, now - 4 * 86400)
    while t < now:
        step = min(3600.0, now - t)
        hours = step / 3600
        sleeping = t < pet.get("sleep_until", 0)
        k = 0.35 if (sleeping or is_night(t)) else 1.0
        for s in STATS:
            if s == "energy" and (sleeping or is_night(t)):
                stats[s] = _clamp(stats[s] + 18 * hours)
            else:
                stats[s] = _clamp(stats[s] - DECAY[s] * k * hours)
        t += step
    pet["stats_ts"] = now


def mood(pet: dict, now: float | None = None) -> str:
    now = now or time.time()
    st = pet["stats"]
    if now < pet.get("sleep_until", 0):
        return "sleep"
    if is_sick(pet):
        return "sick"
    if st["food"] < 25:
        return "hungry"
    if st["clean"] < 25:
        return "dirty"
    if st["energy"] < 20:
        return "tired"
    if st["joy"] < 30:
        return "sad"
    if min(st.values()) > 75:
        return "love"
    return "happy"


def add_history(pet: dict, kind: str, text: str, **extra) -> None:
    pet.setdefault("history", []).append({"ts": time.time(), "type": kind, "text": text, **extra})
    pet["history"] = pet["history"][-300:]


def _daily(pet: dict, uid: int) -> dict:
    d = pet.setdefault("daily", {})
    today = day_str()
    for k in list(d):
        if k < day_str(time.time() - 7 * 86400):
            del d[k]
    return d.setdefault(today, {}).setdefault(str(uid), {"care": 0, "game": 0, "gift": False})


def add_xp(pet: dict, amount: int) -> list[int]:
    """Добавляет опыт. Возвращает список новых стадий (если питомец подрос)."""
    pet["xp"] = pet.get("xp", 0) + max(0, int(amount))
    return check_growth(pet)


def effective_streak(pet: dict) -> tuple[int, bool]:
    """(текущий огонёк, под угрозой ли он сегодня)."""
    last = pet.get("last_streak_day")
    today = day_str()
    yesterday = day_str(time.time() - 86400)
    if last == today:
        return pet.get("streak", 0), False
    if last == yesterday:
        return pet.get("streak", 0), True
    return 0, False


def _month() -> str:
    return day_str()[:7]


def restores_left(pet: dict) -> int:
    r = pet.get("restores", {})
    used = r.get("used", 0) if r.get("month") == _month() else 0
    return max(0, RESTORES_PER_MONTH - used)


def missed_days(pet: dict) -> int:
    """Сколько дней подряд огонёк не горел (0 — всё в порядке)."""
    last = pet.get("last_streak_day")
    if not last or not pet.get("streak"):
        return 0
    from datetime import date as _d
    gap = (_d.fromisoformat(day_str()) - _d.fromisoformat(last)).days
    return max(0, gap - 1)


def try_restore(pet: dict) -> int:
    """Автоматически спасает огонёк, если пропущено не больше, чем осталось восстановлений.
    Возвращает, сколько восстановлений потрачено (0 — не нужно или не хватило)."""
    miss = missed_days(pet)
    if not miss or miss > restores_left(pet):
        return 0
    r = pet.get("restores", {})
    if r.get("month") != _month():
        r = {"month": _month(), "used": 0}
    r["used"] = r.get("used", 0) + miss
    pet["restores"] = r
    pet["last_streak_day"] = day_str(time.time() - 86400)
    add_history(pet, "restore", f"Огонёк спасён восстановлением ({miss} шт.)")
    return miss


def is_sick(pet: dict) -> bool:
    """Питомцу плохо, если вчера кто-то не зашёл, а сегодня вы ещё не зашли оба."""
    if pet.get("status") != "alive" or age_days(pet) < 1:
        return False
    visits = pet.get("visits", {})
    yesterday = visits.get(day_str(time.time() - 86400), [])
    today = visits.get(day_str(), [])
    both = pet.get("_both") or []
    if not both:
        return False
    return not all(u in yesterday for u in both) and not all(u in today for u in both)


def visit(pet: dict, uid: int, both: tuple[int, int]) -> dict:
    """Отмечает визит. Огонёк растёт, когда за день зашли оба."""
    res = {"xp": 0, "grown": [], "streak_up": False, "restored": 0}
    if pet.get("status") != "alive":
        return res
    pet["_both"] = [u for u in both if u]
    res["restored"] = try_restore(pet)
    today = day_str()
    visits = pet.setdefault("visits", {})
    for k in list(visits):
        if k < day_str(time.time() - 7 * 86400):
            del visits[k]
    who = visits.setdefault(today, [])
    if uid not in who:
        who.append(uid)
        res["xp"] += 10
    if all(u in who for u in both if u) and pet.get("last_streak_day") != today:
        cur, _ = effective_streak(pet)
        pet["streak"] = cur + 1
        pet["last_streak_day"] = today
        pet["streak_best"] = max(pet.get("streak_best", 0), pet["streak"])
        res["xp"] += 15 + 5 * min(pet["streak"], 10)
        res["streak_up"] = True
        if pet["streak"] in (3, 7, 14, 30, 50, 100, 150, 200, 300, 365, 500):
            add_history(pet, "streak", f"Огонёк горит уже {pet['streak']} дней подряд", streak=pet["streak"])
    if res["xp"]:
        add_xp(pet, res["xp"])
    res["grown"] = check_growth(pet)
    return res


def cooldowns(pet: dict, uid: int, now: float | None = None) -> dict:
    now = now or time.time()
    cds = pet.get("cooldowns", {}).get(str(uid), {})
    return {a: max(0, int(cds.get(a, 0) + ACTIONS[a]["cd"] - now)) for a in ACTIONS}


def do_action(pet: dict, uid: int, action: str, food: str | None = None) -> dict:
    """Выполняет действие. Возвращает {ok, msg, xp, grown, fav}."""
    now = time.time()
    tick(pet, now)
    if action not in ACTIONS:
        return {"ok": False, "msg": "Неизвестное действие"}
    left = cooldowns(pet, uid, now)[action]
    st = pet["stats"]
    sp = SPECIES[pet["species"]]
    sleeping = now < pet.get("sleep_until", 0)
    res = {"ok": True, "xp": 0, "grown": [], "fav": False, "msg": ""}

    if sleeping and action not in ("pet",):
        return {"ok": False, "msg": "Тсс… малыш спит. Можно только тихонько погладить."}
    if action != "pet" and left > 0:
        return {"ok": False, "msg": "Чуть позже — он ещё не успел соскучиться по этому", "left": left}

    if action == "feed":
        if food not in sp["foods"]:
            return {"ok": False, "msg": "Такое он не ест"}
        if st["food"] > 95:
            return {"ok": False, "msg": "Он уже наелся до круглого пузика"}
        gain = 28
        if food == sp["fav"]:
            gain = 40
            res["fav"] = True
            st["joy"] = _clamp(st["joy"] + 15)
            if not pet.get("fav_found"):
                pet["fav_found"] = True
                add_history(pet, "fav", f"Мы узнали любимую еду: {FOOD_NAMES[food]}", food=food)
        st["food"] = _clamp(st["food"] + gain)
        res["msg"] = "Ням!" if not res["fav"] else "Это его любимое!"
    elif action == "play":
        if st["energy"] < 12:
            return {"ok": False, "msg": "Сил на игры нет — уложи его поспать"}
        st["joy"] = _clamp(st["joy"] + 22)
        st["energy"] = _clamp(st["energy"] - 10)
        st["food"] = _clamp(st["food"] - 4)
        res["msg"] = "Ура, играем!"
    elif action == "wash":
        st["clean"] = _clamp(st["clean"] + 45)
        st["joy"] = _clamp(st["joy"] - 3)
        res["msg"] = "Чистенький и пушистый"
    elif action == "sleep":
        pet["sleep_until"] = now + SLEEP_SECONDS
        res["msg"] = "Спокойной ночи, малыш"
    elif action == "pet":
        st["joy"] = _clamp(st["joy"] + 4)
        res["msg"] = sp["sound"] + "!"

    if action != "pet" or left == 0:
        pet.setdefault("cooldowns", {}).setdefault(str(uid), {})[action] = now
        daily = _daily(pet, uid)
        gain_xp = min(ACTIONS[action]["xp"] + (5 if res["fav"] else 0), CARE_CAP - daily["care"])
        if gain_xp > 0:
            daily["care"] += gain_xp
            res["xp"] = gain_xp
            res["grown"] = add_xp(pet, gain_xp)
    c = pet.setdefault("counters", {})
    c[action] = c.get(action, 0) + 1
    return res


def game_reward(pet: dict, uid: int, game: str, score: int, moves: int = 0) -> dict:
    if game == "catch":
        xp = max(0, min(int(score) // 2, 25))
    elif game == "memory":
        xp = max(6, min(30, 30 - max(0, int(moves) - 8) * 2))
    elif game == "bubbles":
        xp = max(0, min(int(score) // 3, 20))
    else:
        return {"ok": False, "msg": "Неизвестная игра"}
    daily = _daily(pet, uid)
    xp = max(0, min(xp, GAME_CAP - daily["game"]))
    daily["game"] += xp
    c = pet.setdefault("counters", {})
    c["games"] = c.get("games", 0) + 1
    if pet.get("status") == "alive" and game == "catch":
        pet["stats"]["joy"] = _clamp(pet["stats"]["joy"] + 10)
    best = pet.setdefault("records", {})
    if int(score) > best.get(game, 0):
        best[game] = int(score)
    grown = add_xp(pet, xp) if pet.get("status") == "alive" else []
    return {"ok": True, "xp": xp, "grown": grown, "cap_left": GAME_CAP - daily["game"]}


def public_state(pet: dict, uid: int) -> dict:
    """То, что видит фронтенд."""
    now = time.time()
    out = {
        "status": pet.get("status", "choosing"),
        "picks": pet.get("picks", {}),
        "history": pet.get("history", [])[-100:],
        "counters": pet.get("counters", {}),
        "records": pet.get("records", {}),
        "server_time": now,
    }
    if out["status"] != "alive":
        return out
    tick(pet, now)
    streak, at_risk = effective_streak(pet)
    xp = pet.get("xp", 0)
    gd = growth_days(pet)
    s = stage_of_days(gd)
    nxt = STAGES[s + 1][0] if s + 1 < len(STAGES) else None
    daily = _daily(pet, uid)
    today_visits = pet.get("visits", {}).get(day_str(), [])
    out.update({
        "species": pet["species"],
        "name": pet.get("name"),
        "name_changed_at": pet.get("name_changed_at", 0),
        "name_next_change": 0,
        "born_at": pet.get("born_at"),
        "xp": xp,
        "age_days": age_days(pet),
        "growth_days": gd,
        "xp_per_day": XP_PER_DAY,
        "stage": s,
        "stage_name": STAGES[s][1],
        "stage_from": STAGES[s][0],
        "stage_to": nxt,
        "restores_left": restores_left(pet),
        "missed_days": missed_days(pet),
        "sick": is_sick(pet),
        "stats": {k: round(v, 1) for k, v in pet["stats"].items()},
        "mood": mood(pet, now),
        "sleep_until": pet.get("sleep_until", 0),
        "night": is_night(now),
        "streak": streak,
        "streak_at_risk": at_risk,
        "streak_best": pet.get("streak_best", 0),
        "today_visits": today_visits,
        "cooldowns": cooldowns(pet, uid, now),
        "care_left": CARE_CAP - daily["care"],
        "game_left": GAME_CAP - daily["game"],
        "gift_ready": not daily["gift"],
        "foods": SPECIES[pet["species"]]["foods"],
        "fav": SPECIES[pet["species"]]["fav"] if pet.get("fav_found") else None,
    })
    return out


def adopt(pet: dict, species: str) -> None:
    now = time.time()
    pet.update({
        "status": "alive", "species": species, "name": None, "name_changed_at": 0,
        "born_at": now, "xp": 0, "stats": {"food": 80, "joy": 85, "energy": 90, "clean": 90},
        "stats_ts": now, "sleep_until": 0, "streak": 0, "streak_best": 0,
        "last_streak_day": None, "visits": {}, "daily": {}, "cooldowns": {},
        "counters": {}, "records": {}, "fav_found": False, "stage_seen": 0,
        "restores": {"month": _month(), "used": 0},
    })
    pet["history"] = []
    add_history(pet, "adopted", f"У нас появился {SPECIES[species]['name'].lower()}!", stage=0)


def random_gift_index(pet: dict, uid: int, total: int) -> int:
    """Выдаёт следующую «причину» по кругу в случайном порядке, без повторов."""
    g = pet.setdefault("gift_order", {})
    key = str(uid)
    order = g.get(key) or []
    if not order:
        order = list(range(total))
        random.shuffle(order)
    idx = order.pop()
    g[key] = order
    return idx
