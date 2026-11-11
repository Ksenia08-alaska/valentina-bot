"""HTTP API для мини-приложения + напоминания.

Все запросы /api/* требуют заголовок X-Init-Data (Telegram.WebApp.initData).
Подпись проверяется токеном бота, пускаем только двоих: ADMIN_ID и PARTNER_ID.
"""
import asyncio
import hashlib
import hmac
import html
import io
import logging
import os
import random
import time
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

from aiohttp import web
from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from aiogram.utils.web_app import safe_parse_webapp_init_data

import pet as P
from reasons import REASONS
from storage import Storage
from timeutil import TZ, day_str, now_local

log = logging.getLogger("api")

# ---------- настройки ----------
BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
ADMIN_ID = int(os.getenv("ADMIN_ID", "1482422281"))
PARTNER_ID = int(os.getenv("PARTNER_ID", "1135275964") or 0)
ADMIN_NAME = os.getenv("ADMIN_NAME", "Ксюша")
PARTNER_NAME = os.getenv("PARTNER_NAME", "Дима")
WEBAPP_URL = os.getenv("WEBAPP_URL", "").strip()
DEV_AUTH = os.getenv("DEV_AUTH") == "1"          # только для локальной разработки!
DMB_START = os.getenv("DMB_START", "2026-04-23")
DMB_END = os.getenv("DMB_END", "2027-10-23")
REMIND_HOUR = int(os.getenv("REMIND_HOUR", "10"))
WEBAPP_DIR = Path(__file__).parent / "webapp"

ALLOWED = {ADMIN_ID} | ({PARTNER_ID} if PARTNER_ID else set())

def genitive(name: str) -> str:
    """Дима → Димы, Ксюша → Ксюши (для подписей вида «День рождения …»)."""
    if name.endswith("а"):
        return name[:-1] + ("и" if name[-2:-1] in "гкхжчшщ" else "ы")
    if name.endswith("я"):
        return name[:-1] + "и"
    return name


DEFAULT_EVENTS = [
    {"id": "dima_bd", "title": f"День рождения {genitive(PARTNER_NAME)}",
     "month": 7, "day": 9, "kind": "birthday", "builtin": True},
    {"id": "anniv", "title": "Наша годовщина", "month": 11, "day": 2, "kind": "anniversary", "builtin": True},
    {"id": "ny", "title": "Новый год", "month": 12, "day": 31, "kind": "holiday", "builtin": True},
    {"id": "ksu_bd", "title": f"День рождения {genitive(ADMIN_NAME)}",
     "month": 2, "day": 3, "kind": "birthday", "builtin": True},
]

THEMES = {"graphite", "midnight", "oled", "mocha", "forest", "plum", "dusk", "auto",
          "light", "milk", "peach", "lavender", "mint", "dark", "night"}
DEFAULT_THEME = "graphite"

presence: dict[int, float] = {}          # uid -> когда последний раз был в приложении
last_chat_ping: dict[int, float] = {}    # uid -> когда последний раз уведомляли о чате
avatar_cache: dict[int, tuple[float, bytes | None]] = {}


def partner_of(uid: int) -> int:
    return PARTNER_ID if uid == ADMIN_ID else ADMIN_ID


def short_name(uid: int) -> str:
    return ADMIN_NAME if uid == ADMIN_ID else PARTNER_NAME


# ---------- личный ключ для кнопки в клавиатуре ----------
# Telegram не передаёт данные пользователя, если приложение открыто кнопкой
# из обычной клавиатуры. Поэтому каждому из двоих бот даёт ссылку со своим
# подписанным ключом (HMAC от токена бота) — подделать его нельзя.
def app_token(uid: int) -> str:
    sig = hmac.new(BOT_TOKEN.encode(), f"app:{uid}".encode(), hashlib.sha256).hexdigest()[:32]
    return f"{uid}.{sig}"


def check_app_token(token: str) -> int | None:
    try:
        uid = int(token.split(".", 1)[0])
    except (ValueError, AttributeError):
        return None
    return uid if hmac.compare_digest(token, app_token(uid)) else None


def app_url_for(uid: int) -> str:
    if not WEBAPP_URL:
        return ""
    base = WEBAPP_URL if "?" in WEBAPP_URL or WEBAPP_URL.endswith("/") or WEBAPP_URL.count("/") > 2 else WEBAPP_URL + "/"
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}t={app_token(uid)}"


def app_button(text: str = "Открыть приложение") -> InlineKeyboardMarkup | None:
    if not WEBAPP_URL:
        return None
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=text, web_app=WebAppInfo(url=WEBAPP_URL))]])


def settings_of(store: Storage, uid: int) -> dict:
    s = store.get(f"settings:{uid}", {})
    s.setdefault("theme", DEFAULT_THEME)
    n = s.setdefault("notify", {})
    for k in ("events", "chat", "pet", "notes", "mood", "games"):
        n.setdefault(k, True)
    return s


async def notify(app: web.Application, uid: int, text: str, kind: str = "events",
                 button: bool = True) -> None:
    """Сообщение в Telegram от бота (с учётом настроек человека)."""
    if not uid:
        return
    store: Storage = app["store"]
    if not settings_of(store, uid)["notify"].get(kind, True):
        return
    try:
        await app["bot"].send_message(uid, text, reply_markup=app_button() if button else None)
    except TelegramAPIError as e:
        log.warning("notify %s failed: %s", uid, e)


# ---------- авторизация ----------
def json_error(status: int, msg: str) -> web.Response:
    return web.json_response({"ok": False, "error": msg}, status=status)


@web.middleware
async def cors_and_auth(request: web.Request, handler):
    if not request.path.startswith("/api/"):
        return await handler(request)
    if request.method == "OPTIONS":
        resp = web.Response()
    else:
        user = None
        init = request.headers.get("X-Init-Data", "")
        if init:
            try:
                data = safe_parse_webapp_init_data(BOT_TOKEN, init)
                if time.time() - data.auth_date.timestamp() > 30 * 86400:
                    raise ValueError("expired")
                user = data.user
            except (ValueError, KeyError) as e:
                log.info("bad initData: %s", e)
        elif request.headers.get("X-App-Token"):
            uid = check_app_token(request.headers["X-App-Token"])
            if uid:
                prof = request.app["store"].get("profiles", {}).get(str(uid), {})
                user = type("U", (), {"id": uid, "first_name": prof.get("first_name") or short_name(uid),
                                      "last_name": prof.get("last_name"), "username": prof.get("username"),
                                      "photo_url": None, "language_code": "ru", "is_premium": False})()
        elif DEV_AUTH and request.headers.get("X-Dev-User"):
            uid = int(request.headers["X-Dev-User"])
            user = type("U", (), {"id": uid, "first_name": short_name(uid), "last_name": None,
                                  "username": "dev" + str(uid)[-3:], "photo_url": None,
                                  "language_code": "ru", "is_premium": False})()
        if user is None:
            resp = json_error(401, "Открой приложение из Telegram 💗")
        elif user.id not in ALLOWED:
            resp = json_error(403, "Это приложение только для двоих")
        else:
            request["uid"] = user.id
            request["tg"] = user
            presence[user.id] = time.time()
            try:
                resp = await handler(request)
            except web.HTTPException:
                raise
            except Exception:
                log.exception("api error")
                resp = json_error(500, "Что-то пошло не так")
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Init-Data, X-App-Token, X-Dev-User"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
    resp.headers["Cache-Control"] = "no-store"
    return resp


def ok(**data) -> web.Response:
    return web.json_response({"ok": True, **data})


async def body(request: web.Request) -> dict:
    try:
        d = await request.json()
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def clean_text(v, limit: int) -> str:
    return str(v or "").strip()[:limit]


# ---------- события ----------
def get_events(store: Storage) -> list:
    ev = store.get("events")
    if ev is None:
        ev = [dict(e) for e in DEFAULT_EVENTS]
    return ev


def next_occurrence(month: int, day: int, today: date) -> date:
    for y in (today.year, today.year + 1, today.year + 2):
        try:
            d = date(y, month, day)
        except ValueError:  # 29 февраля
            d = date(y, month, 28)
        if d >= today:
            return d
    return today


# ---------- кто мы ----------
def person(store: Storage, uid: int) -> dict:
    prof = store.get("profiles", {}).get(str(uid), {})
    return {
        "id": uid,
        "name": short_name(uid),
        "role": "admin" if uid == ADMIN_ID else "partner",
        "first_name": prof.get("first_name") or short_name(uid),
        "last_name": prof.get("last_name"),
        "username": prof.get("username"),
        "online": time.time() - presence.get(uid, 0) < 70,
        "last_seen": presence.get(uid) or prof.get("last_seen"),
        "joined": prof.get("joined"),
    }


async def h_bootstrap(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid, tg = request["uid"], request["tg"]
    async with store.edit("profiles", {}) as profs:
        p = profs.setdefault(str(uid), {"joined": time.time()})
        p.update({"first_name": tg.first_name, "last_name": tg.last_name,
                  "username": tg.username, "last_seen": time.time()})
    visit = None
    async with store.edit("pet", P.new_pet()) as pet:
        if pet.get("status") == "alive":
            visit = P.visit(pet, uid, (ADMIN_ID, PARTNER_ID))
        pet_state = P.public_state(pet, uid)
    await after_visit(request.app, pet, visit)
    import games_api as G
    login_bonus = await G.earn(request.app, uid, "login")
    play = G.norm(store.get("play", G.default()))
    partner = partner_of(uid)
    return ok(
        coins={"me": G.bal(play, uid), "opp": G.bal(play, partner), "login_bonus": login_bonus},
        me=person(store, uid),
        partner=person(store, partner) if partner else None,
        settings=settings_of(store, uid),
        dmb={"start": DMB_START, "end": DMB_END, "tz": str(TZ)},
        events=get_events(store),
        pet=pet_state,
        visit=visit,
        species={k: {"name": v["name"], "sound": v["sound"]} for k, v in P.SPECIES.items()},
        foods=P.FOOD_NAMES,
        stages=[s[1] for s in P.STAGES],
        stage_xp=[s[0] for s in P.STAGES],
        unread=unread_count(store, uid),
        moods=moods_view(store),
        emotions=EMOTIONS,
        emotion_groups=EMOTION_GROUPS,
        server_time=time.time(),
    )


async def h_ping(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    partner = partner_of(uid)
    chat = store.get("chat", [])
    return ok(unread=unread_count(store, uid),
              partner_online=bool(partner) and time.time() - presence.get(partner, 0) < 70,
              last_id=chat[-1]["id"] if chat else 0,
              server_time=time.time())


async def h_avatar(request: web.Request) -> web.Response:
    uid = int(request.match_info["uid"])
    if uid not in ALLOWED:
        return json_error(404, "нет")
    cached = avatar_cache.get(uid)
    if not cached or time.time() - cached[0] > 6 * 3600:
        data = None
        try:
            bot: Bot = request.app["bot"]
            photos = await bot.get_user_profile_photos(uid, limit=1)
            if photos.total_count:
                sizes = photos.photos[0]
                best = next((s for s in sizes if s.width >= 300), sizes[-1])
                buf = io.BytesIO()
                await bot.download(best.file_id, destination=buf)
                data = buf.getvalue()
        except Exception as e:
            log.info("avatar %s: %s", uid, e)
        cached = (time.time(), data)
        avatar_cache[uid] = cached
    if not cached[1]:
        return web.Response(status=204)
    return web.Response(body=cached[1], content_type="image/jpeg")


async def h_settings(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    d = await body(request)
    s = settings_of(store, uid)
    if d.get("theme") in THEMES:
        s["theme"] = d["theme"]
    if isinstance(d.get("notify"), dict):
        for k, v in d["notify"].items():
            if k in s["notify"]:
                s["notify"][k] = bool(v)
    await store.set(f"settings:{uid}", s)
    return ok(settings=s)


# ---------- события (даты) ----------
async def h_event_add(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    d = await body(request)
    title = clean_text(d.get("title"), 60)
    try:
        month, day = int(d.get("month")), int(d.get("day"))
        date(2024, month, day)
    except (TypeError, ValueError):
        return json_error(400, "Неверная дата")
    if not title:
        return json_error(400, "Нужно название")
    year = d.get("year")
    year = int(year) if str(year or "").isdigit() and 1950 < int(year) < 2100 else None
    kind = d.get("kind") if d.get("kind") in ("birthday", "anniversary", "holiday", "date", "other") else "other"
    ev = {"id": uuid.uuid4().hex[:10], "title": title, "month": month, "day": day, "year": year,
          "kind": kind, "author": request["uid"], "builtin": False}
    async with store.edit("events", get_events(store)) as events:
        events.append(ev)
    partner = partner_of(request["uid"])
    await notify(request.app, partner,
                 f"📅 {short_name(request['uid'])} добавил(а) важную дату: <b>{html.escape(title)}</b> — "
                 f"{day:02d}.{month:02d}")
    return ok(events=store.get("events"))


async def h_event_del(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    eid = request.match_info["id"]
    uid = request["uid"]
    async with store.edit("events", get_events(store)) as events:
        for e in list(events):
            if e["id"] == eid:
                if e.get("builtin") and uid != ADMIN_ID:
                    return json_error(403, "Эту дату может удалить только админ")
                if not e.get("builtin") and e.get("author") != uid and uid != ADMIN_ID:
                    return json_error(403, "Можно удалять только свои даты")
                events.remove(e)
    return ok(events=store.get("events"))


# ---------- чат ----------
def unread_count(store: Storage, uid: int) -> int:
    last = store.get("chat_read", {}).get(str(uid), 0)
    return sum(1 for m in store.get("chat", []) if m["id"] > last and m.get("uid") != uid)


async def chat_push(app: web.Application, msg: dict) -> dict:
    store: Storage = app["store"]
    async with store.edit("chat", []) as chat:
        msg["id"] = (chat[-1]["id"] + 1) if chat else 1
        msg.setdefault("ts", time.time())
        chat.append(msg)
        if len(chat) > 3000:
            del chat[: len(chat) - 3000]
    return msg


async def h_chat_get(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    chat = store.get("chat", [])
    after = int(request.query.get("after", 0) or 0)
    before = int(request.query.get("before", 0) or 0)
    if after:
        msgs = [m for m in chat if m["id"] > after]
    elif before:
        msgs = [m for m in chat if m["id"] < before][-60:]
    else:
        msgs = chat[-80:]
    partner = partner_of(request["uid"])
    reads = store.get("chat_read", {})
    return ok(messages=msgs, has_more=bool(msgs) and chat and msgs[0]["id"] > chat[0]["id"],
              partner_read=reads.get(str(partner), 0),
              partner_online=bool(partner) and time.time() - presence.get(partner, 0) < 70)


async def h_chat_send(request: web.Request) -> web.Response:
    uid = request["uid"]
    d = await body(request)
    text = clean_text(d.get("text"), 2000)
    if not text:
        return json_error(400, "Пустое сообщение")
    reply_to = d.get("reply_to")
    msg = await chat_push(request.app, {"uid": uid, "type": "text", "text": text,
                                        "reply_to": int(reply_to) if str(reply_to or "").isdigit() else None})
    await mark_read(request.app["store"], uid, msg["id"])
    import games_api as G
    await G.earn(request.app, uid, "chat")
    # уведомление в бота, если второй сейчас не в приложении
    partner = partner_of(uid)
    if partner and time.time() - presence.get(partner, 0) > 25 \
            and time.time() - last_chat_ping.get(partner, 0) > 8:
        last_chat_ping[partner] = time.time()
        preview = html.escape(text[:120]) + ("…" if len(text) > 120 else "")
        await notify(request.app, partner, f"💬 <b>{short_name(uid)}</b> пишет в приложении:\n«{preview}»",
                     kind="chat")
    return ok(message=msg)


async def h_chat_react(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    mid = int(request.match_info["id"])
    d = await body(request)
    r = clean_text(d.get("reaction"), 16)
    async with store.edit("chat", []) as chat:
        for m in chat:
            if m["id"] == mid:
                reacts = m.setdefault("reactions", {})
                if not r or reacts.get(str(uid)) == r:
                    reacts.pop(str(uid), None)
                else:
                    reacts[str(uid)] = r
                return ok(message=m)
    return json_error(404, "Нет такого сообщения")


async def h_chat_del(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    mid = int(request.match_info["id"])
    async with store.edit("chat", []) as chat:
        for m in chat:
            if m["id"] == mid:
                if m.get("uid") != uid and uid != ADMIN_ID:
                    return json_error(403, "Можно удалять только свои сообщения")
                m.update({"deleted": True, "text": "", "type": "text"})
                return ok(message=m)
    return json_error(404, "Нет такого сообщения")


async def mark_read(store: Storage, uid: int, mid: int) -> None:
    async with store.edit("chat_read", {}) as reads:
        if mid > reads.get(str(uid), 0):
            reads[str(uid)] = mid


async def h_chat_read(request: web.Request) -> web.Response:
    d = await body(request)
    await mark_read(request.app["store"], request["uid"], int(d.get("id") or 0))
    return ok()


# ---------- питомец ----------
async def after_visit(app: web.Application, pet: dict, visit: dict | None) -> None:
    if not visit:
        return
    if visit.get("restored"):
        left = P.restores_left(pet)
        name = pet.get("name") or "Малыш"
        await chat_push(app, {"uid": 0, "type": "system",
                              "text": f"Огонёк спасён! Использовано восстановлений: {visit['restored']}. "
                                      f"Осталось в этом месяце: {left} из {P.RESTORES_PER_MONTH}"})
        for u in ALLOWED:
            await notify(app, u, f"🔥 Огонёк {html.escape(name)} чуть не погас, но мы его спасли восстановлением. "
                                 f"Осталось в этом месяце: {left} из {P.RESTORES_PER_MONTH}", kind="pet")
    if visit.get("grown"):
        await stage_announce(app, pet, visit["grown"])


async def stage_announce(app: web.Application, pet: dict, grown: list[int]) -> None:
    name = pet.get("name") or "Наш малыш"
    for s in grown:
        await chat_push(app, {"uid": 0, "type": "stage", "stage": s, "species": pet.get("species"),
                              "text": f"{name} подрос! Новая стадия: «{P.STAGES[s][1]}»"})
        for u in ALLOWED:
            await notify(app, u, f"🌱 <b>{html.escape(name)}</b> подрос! Теперь это стадия «{P.STAGES[s][1]}»",
                         kind="pet")


async def h_pet(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    visit = None
    async with store.edit("pet", P.new_pet()) as pet:
        if pet.get("status") == "alive":
            visit = P.visit(pet, uid, (ADMIN_ID, PARTNER_ID))
        st = P.public_state(pet, uid)
    await after_visit(request.app, pet, visit)
    return ok(pet=st, visit=visit)


async def h_pet_pick(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    d = await body(request)
    sp = d.get("species")
    if sp not in P.SPECIES:
        return json_error(400, "Нет такого зверька")
    adopted = False
    async with store.edit("pet", P.new_pet()) as pet:
        if pet.get("status") == "alive":
            return json_error(409, "Питомец уже выбран")
        prev = pet.setdefault("picks", {}).get(str(uid))
        pet["picks"][str(uid)] = sp
        picks = pet["picks"]
        others = [picks.get(str(u)) for u in ALLOWED]
        if len(ALLOWED) == 2 and all(o == sp for o in others):
            P.adopt(pet, sp)
            P.visit(pet, uid, (ADMIN_ID, PARTNER_ID))
            adopted = True
        state = P.public_state(pet, uid)
    if prev != sp:
        await chat_push(request.app, {"uid": uid, "type": "pick", "species": sp,
                                      "text": f"{short_name(uid)} выбирает: {P.SPECIES[sp]['name']}"})
    partner = partner_of(uid)
    if adopted:
        await chat_push(request.app, {"uid": 0, "type": "adopted", "species": sp,
                                      "text": f"Совпало! У нас теперь {P.SPECIES[sp]['name'].lower()}. Придумайте имя!"})
        for u in ALLOWED:
            await notify(request.app, u, f"🎉 Совпало! У вас появился питомец — "
                                         f"<b>{P.SPECIES[sp]['name'].lower()}</b>. Заходите придумать имя!", kind="pet")
    elif prev != sp:
        partner_pick = pet["picks"].get(str(partner)) if partner else None
        extra = "" if not partner_pick else f"\nТвой выбор: {P.SPECIES[partner_pick]['name'].lower()}"
        await notify(request.app, partner,
                     f"🐾 {short_name(uid)} выбирает питомца: <b>{P.SPECIES[sp]['name'].lower()}</b>{extra}",
                     kind="pet")
    return ok(pet=state, adopted=adopted)


async def h_pet_name(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    d = await body(request)
    name = clean_text(d.get("name"), 20)
    if len(name) < 2:
        return json_error(400, "Имя слишком короткое")
    async with store.edit("pet", P.new_pet()) as pet:
        if pet.get("status") != "alive":
            return json_error(409, "Сначала выберите питомца")
        old = pet.get("name")
        pet.update({"name": name, "name_changed_at": time.time(), "name_by": uid})
        P.add_history(pet, "name", f"{short_name(uid)} назвал(а) малыша «{name}»" if not old
                      else f"{short_name(uid)} переименовал(а) «{old}» в «{name}»", name=name)
        state = P.public_state(pet, uid)
    await chat_push(request.app, {"uid": uid, "type": "name", "text": f"Теперь малыша зовут «{name}»",
                                  "species": state.get("species")})
    await notify(request.app, partner_of(uid),
                 f"✨ {short_name(uid)} дал(а) питомцу имя: <b>{html.escape(name)}</b>", kind="pet")
    return ok(pet=state)


async def h_pet_action(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    d = await body(request)
    async with store.edit("pet", P.new_pet()) as pet:
        if pet.get("status") != "alive":
            return json_error(409, "Сначала выберите питомца")
        res = P.do_action(pet, uid, str(d.get("action")), d.get("food"))
        state = P.public_state(pet, uid)
    if res.get("grown"):
        await stage_announce(request.app, pet, res["grown"])
    if res.get("ok", True) and not res.get("error"):
        import games_api as G
        res["coins"] = await G.earn(request.app, uid, "care")
    return ok(result=res, pet=state)


async def h_pet_game(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    d = await body(request)
    async with store.edit("pet", P.new_pet()) as pet:
        res = P.game_reward(pet, uid, str(d.get("game")), int(d.get("score") or 0), int(d.get("moves") or 0))
        state = P.public_state(pet, uid)
    if res.get("grown"):
        await stage_announce(request.app, pet, res["grown"])
    if res.get("xp"):
        import games_api as G
        res["coins"] = await G.earn(request.app, uid, "game")
    return ok(result=res, pet=state)


LOVE_NOTES_FOR_ADMIN = [
    "Он думает о тебе чаще, чем ты думаешь.",
    "Каждый прожитый день — на день ближе к вашей встрече.",
    "Ты — самое тёплое, что у него есть.",
    "Сегодня отличный день, чтобы написать ему что-то нежное.",
    "Ты справляешься. И ты очень сильная.",
    "Где-то там он сейчас улыбается, вспоминая тебя.",
    "Ваша история — самая красивая из всех, что я знаю.",
    "Обними себя за двоих — он вернёт объятия с процентами.",
    "Ты красивая. Просто напоминаю.",
    "Любовь на расстоянии — это любовь на максималках.",
    "Он гордится тобой. Даже если не всегда говорит.",
    "Скоро будете вместе гулять до утра.",
]


async def h_pet_gift(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    async with store.edit("pet", P.new_pet()) as pet:
        if pet.get("status") != "alive":
            return json_error(409, "Сначала выберите питомца")
        daily = P._daily(pet, uid)
        if daily["gift"]:
            return json_error(429, "Сегодня подарок уже был. Завтра будет новый!")
        daily["gift"] = True
        if uid == ADMIN_ID:
            pool = LOVE_NOTES_FOR_ADMIN
            idx = P.random_gift_index(pet, uid, len(pool))
            gift = {"kind": "note", "text": pool[idx]}
        else:
            idx = P.random_gift_index(pet, uid, len(REASONS))
            gift = {"kind": "reason", "num": idx + 1, "text": REASONS[idx]}
        grown = P.add_xp(pet, 5)
        state = P.public_state(pet, uid)
    if grown:
        await stage_announce(request.app, pet, grown)
    return ok(gift=gift, pet=state)


async def h_pet_reset(request: web.Request) -> web.Response:
    if request["uid"] != ADMIN_ID:
        return json_error(403, "Только для админа")
    store: Storage = request.app["store"]
    async with store.edit("pet", P.new_pet()) as pet:
        if pet.get("status") == "alive":
            arch = store.get("pet_archive", [])
            arch.append(dict(pet))
            await store._save("pet_archive", arch[-5:])
        pet.clear()
        pet.update(P.new_pet())
        state = P.public_state(pet, request["uid"])
    await chat_push(request.app, {"uid": 0, "type": "system", "text": "Выбор питомца начат заново"})
    return ok(pet=state)


async def h_pet_xp(request: web.Request) -> web.Response:
    """Админская кнопка: подарить опыт (для тестов и сюрпризов)."""
    if request["uid"] != ADMIN_ID:
        return json_error(403, "Только для админа")
    d = await body(request)
    store: Storage = request.app["store"]
    async with store.edit("pet", P.new_pet()) as pet:
        if pet.get("status") != "alive":
            return json_error(409, "Сначала выберите питомца")
        grown = P.add_xp(pet, max(0, min(int(d.get("xp") or 0), 5000)))
        state = P.public_state(pet, request["uid"])
    if grown:
        await stage_announce(request.app, pet, grown)
    return ok(pet=state)


# ---------- «Мы сейчас»: настроение ----------
EMOTIONS = {
    "happy": ("Счастье", "#F6C860"), "love": ("Любовь", "#F28CA6"), "miss": ("Скучаю", "#B39DEB"),
    "calm": ("Спокойствие", "#7FCFB0"), "tender": ("Нежность", "#F7B39A"), "inspired": ("Вдохновение", "#8FB6F2"),
    "tired": ("Усталость", "#9AA3B5"), "sad": ("Грусть", "#6E93D6"), "anxious": ("Тревога", "#F0A35E"),
    "angry": ("Злость", "#E8676B"),
    # смешные
    "tease": ("Хочу побесить", "#F4A261"), "poop": ("Хочу какать", "#B08968"), "starving": ("Голодный как волк", "#F6B26B"),
    "sleepy": ("Хочу спать", "#A9B4D0"), "cuddle": ("Хочу обнимашек", "#F7A8C4"), "lazy": ("Ленюсь", "#C2B8A3"),
    "pouty": ("Капризничаю", "#E58FB5"), "cringe": ("Кринжую", "#9BC59D"),
}
EMOTION_GROUPS = [
    ("Тёплые", ["happy", "love", "tender", "calm", "inspired", "miss"]),
    ("Непростые", ["tired", "sad", "anxious", "angry"]),
    ("Смешные", ["tease", "poop", "starving", "sleepy", "cuddle", "lazy", "pouty", "cringe"]),
]
MAX_MOODS_PER_DAY = 8


def moods_today(store: Storage, uid: int) -> list:
    """Чувства человека за сегодня (по Минску). В 00:00 список обнуляется сам."""
    d = store.get("moods_day", {}).get(str(uid)) or {}
    return d.get("items", []) if d.get("day") == day_str() else []


def moods_view(store: Storage) -> dict:
    return {str(u): moods_today(store, u) for u in ALLOWED}


def split_levels(n: int) -> list[int]:
    """Проценты поровну: 3 чувства → 34/33/33, сумма всегда 100."""
    if n <= 0:
        return []
    base, extra = divmod(100, n)
    return [base + (1 if i < extra else 0) for i in range(n)]


def parse_mood(d: dict) -> dict | str:
    emo = d.get("emotion")
    if emo == "custom":
        label = clean_text(d.get("label"), 24)
        color = str(d.get("color") or "")
        if not label:
            return "Как назвать это чувство?"
        if not (len(color) == 7 and color.startswith("#") and all(c in "0123456789abcdefABCDEF" for c in color[1:])):
            color = "#C9B3EA"
    elif emo in EMOTIONS:
        label, color = EMOTIONS[emo]
    else:
        return "Выбери чувство"
    return {"emotion": emo, "label": label, "color": color, "ts": time.time()}


async def h_moods_save(request: web.Request) -> web.Response:
    """Сохранить весь список чувств за сегодня. Проценты считаются сами — поровну.
    Партнёру ничего не присылаем: всё видно в приложении."""
    store: Storage = request.app["store"]
    uid = request["uid"]
    d = await body(request)
    raw = d.get("items") if isinstance(d.get("items"), list) else []
    items, seen = [], set()
    for r in raw[:MAX_MOODS_PER_DAY * 2]:
        e = parse_mood(r if isinstance(r, dict) else {})
        if isinstance(e, str):
            continue
        key = e["label"].lower()
        if key in seen:
            continue
        seen.add(key)
        items.append(e)
    if len(items) > MAX_MOODS_PER_DAY:
        return json_error(400, f"Можно выбрать до {MAX_MOODS_PER_DAY} чувств")
    today = day_str()
    async with store.edit("moods_day", {}) as md:
        cur = md.get(str(uid)) or {}
        old = {i["label"].lower(): i for i in (cur.get("items", []) if cur.get("day") == today else [])}
        for e, lvl in zip(items, split_levels(len(items))):
            prev = old.get(e["label"].lower())
            e["id"] = prev["id"] if prev else uuid.uuid4().hex[:8]
            e["ts"] = prev["ts"] if prev else e["ts"]
            e["level"] = lvl
        md[str(uid)] = {"day": today, "items": items}
    new_ones = [e for e in items if e["label"].lower() not in old]
    if new_ones:
        async with store.edit("mood_history", []) as hist:
            for e in new_ones:
                hist.append({"uid": uid, "emotion": e["emotion"], "label": e["label"], "color": e["color"],
                             "level": e["level"], "ts": time.time()})
            del hist[:-300]
    if items:
        import games_api as G
        await G.earn(request.app, uid, "mood")
    return ok(moods=moods_view(store))


async def h_moods(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    hist = [h for h in store.get("mood_history", []) if time.time() - h["ts"] < 14 * 86400]
    return ok(moods=moods_view(store), history=hist[-80:], emotions=EMOTIONS, groups=EMOTION_GROUPS)


# ---------- «Важное»: хотелки, анкета, письма, планы ----------
FACT_FIELDS = [
    ("flowers", "Любимые цветы"), ("food", "Любимая еда"), ("sweet", "Любимая сладость"),
    ("drink", "Любимый напиток"), ("color", "Любимый цвет"), ("music", "Музыка под настроение"),
    ("film", "Любимый фильм / сериал"), ("clothes", "Размер одежды"), ("shoes", "Размер обуви"),
    ("ring", "Размер кольца"), ("allergy", "Аллергия / не люблю"), ("perfume", "Любимый запах"),
    ("cheer", "Что поднимает настроение"), ("dream", "Маленькая мечта"),
]
LETTER_MOODS = {
    "sad": "Когда грустно", "miss": "Когда скучаешь", "sleep": "Когда не спится",
    "angry": "Когда злишься на меня", "happy": "Когда очень счастлив(а)", "tired": "Когда всё надоело",
    "any": "Когда захочется",
}


def notes_default() -> dict:
    return {"wishes": [], "facts": {}, "letters": [], "plans": []}


def fact_fields(notes: dict) -> list:
    hidden = set(notes.get("fields_hidden", []))
    base = [list(f) for f in FACT_FIELDS if f[0] not in hidden]
    return base + [list(f) for f in notes.get("fields_custom", [])]


def notes_view(notes: dict, uid: int) -> dict:
    today = day_str()
    wishes = []
    for w in notes["wishes"]:
        w = dict(w)
        if w["author"] == uid:   # автор не знает, что его хотелку «забронировали» — сюрприз!
            w.pop("reserved_by", None)
        wishes.append(w)
    letters = []
    for l in notes["letters"]:
        l = dict(l)
        if l["to"] == uid:
            locked = (l["mode"] == "date" and l.get("date", "") > today) or \
                     (l["mode"] == "mood" and not l.get("opened_at"))
            l["locked"] = locked
            if locked:
                l["body"] = ""
        else:
            l["locked"] = False
        letters.append(l)
    return {"wishes": wishes, "facts": notes.get("facts", {}), "letters": letters,
            "plans": notes["plans"], "fact_fields": fact_fields(notes), "moods": LETTER_MOODS}


async def h_notes(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    return ok(notes=notes_view(store.get("notes", notes_default()), request["uid"]))


async def h_fields(request: web.Request) -> web.Response:
    """Админ: добавить общий пункт анкеты (POST {label}) или убрать (DELETE /{key})."""
    store: Storage = request.app["store"]
    uid = request["uid"]
    if uid != ADMIN_ID:
        return json_error(403, "Только для админа")
    async with store.edit("notes", notes_default()) as notes:
        if request.method == "POST":
            d = await body(request)
            label = clean_text(d.get("label"), 40)
            if not label:
                return json_error(400, "Напиши название пункта")
            notes.setdefault("fields_custom", []).append(["f_" + uuid.uuid4().hex[:6], label])
        else:
            key = request.match_info["key"]
            if any(f[0] == key for f in FACT_FIELDS):
                hid = notes.setdefault("fields_hidden", [])
                if key not in hid:
                    hid.append(key)
            notes["fields_custom"] = [f for f in notes.get("fields_custom", []) if f[0] != key]
        view = notes_view(notes, uid)
    return ok(notes=view)


async def h_notes_post(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    kind = request.match_info["kind"]
    d = await body(request)
    partner = partner_of(uid)
    note_msg = None
    async with store.edit("notes", notes_default()) as notes:
        now = time.time()
        if kind == "wishes":
            title = clean_text(d.get("title"), 120)
            if not title:
                return json_error(400, "Напиши, чего хочется")
            item = {"id": uuid.uuid4().hex[:10], "author": uid, "title": title,
                    "note": clean_text(d.get("note"), 500), "link": clean_text(d.get("link"), 400),
                    "hint": bool(d.get("hint")), "size": d.get("size") if d.get("size") in ("s", "m", "l") else "m",
                    "created": now, "done": False}
            notes["wishes"].insert(0, item)
            note_msg = (f"🎁 {short_name(uid)} оставил(а) {'намёк' if item['hint'] else 'новую хотелку'} "
                        f"в «Важном». Загляни 😉")
        elif kind == "facts":
            fields = d.get("fields") or {}
            mine = notes.setdefault("facts", {}).setdefault(str(uid), {})
            for k, v in fields.items():
                k = clean_text(k, 40)
                if k:
                    v = clean_text(v, 300)
                    if v:
                        mine[k] = v
                    else:
                        mine.pop(k, None)
        elif kind == "letters":
            title = clean_text(d.get("title"), 80)
            text = clean_text(d.get("body"), 5000)
            mode = d.get("mode") if d.get("mode") in ("now", "date", "mood") else "now"
            if not text:
                return json_error(400, "Письмо пустое")
            if not partner:
                return json_error(400, "Второй человек ещё не подключён")
            item = {"id": uuid.uuid4().hex[:10], "author": uid, "to": partner,
                    "title": title or "Письмо", "body": text, "mode": mode, "created": now,
                    "color": d.get("color") if d.get("color") in ("rose", "sky", "lilac", "mint", "sun") else "rose"}
            if mode == "date":
                try:
                    item["date"] = date.fromisoformat(str(d.get("date"))).isoformat()
                except ValueError:
                    return json_error(400, "Неверная дата")
            if mode == "mood":
                item["mood"] = d.get("mood") if d.get("mood") in LETTER_MOODS else "any"
            notes["letters"].insert(0, item)
            when = {"now": "", "date": f" (откроется {item.get('date', '')[8:10]}.{item.get('date', '')[5:7]}."
                                          f"{item.get('date', '')[:4]})",
                    "mood": f" — «{LETTER_MOODS.get(item.get('mood'), '')}»"}[mode]
            note_msg = f"💌 Тебе письмо от {genitive(short_name(uid))}{when}"
        elif kind == "plans":
            text = clean_text(d.get("text"), 200)
            if not text:
                return json_error(400, "Пустой план")
            cat = d.get("cat") if d.get("cat") in ("trip", "date", "home", "food", "dream") else "date"
            notes["plans"].insert(0, {"id": uuid.uuid4().hex[:10], "author": uid, "text": text, "cat": cat,
                                      "done": False, "created": now})
        else:
            return json_error(404, "Нет такого раздела")
        view = notes_view(notes, uid)
    if note_msg:
        await notify(request.app, partner, note_msg, kind="notes")
    return ok(notes=view)


async def h_notes_patch(request: web.Request) -> web.Response:
    store: Storage = request.app["store"]
    uid = request["uid"]
    kind, iid = request.match_info["kind"], request.match_info["id"]
    d = await body(request)
    action = d.get("action")
    msg = None
    async with store.edit("notes", notes_default()) as notes:
        items = notes.get(kind)
        if not isinstance(items, list):
            return json_error(404, "Нет такого раздела")
        item = next((i for i in items if i["id"] == iid), None)
        if not item:
            return json_error(404, "Не найдено")
        if action == "delete":
            if item["author"] != uid and uid != ADMIN_ID:
                return json_error(403, "Можно удалять только своё")
            items.remove(item)
        elif kind == "wishes" and action == "reserve":
            if item["author"] == uid:
                return json_error(400, "Свою хотелку бронировать нельзя 🙂")
            item["reserved_by"] = None if item.get("reserved_by") == uid else uid
        elif kind == "wishes" and action == "done":
            item["done"] = not item.get("done")
            item["done_at"] = time.time() if item["done"] else None
        elif kind == "plans" and action == "toggle":
            item["done"] = not item.get("done")
            item["done_at"] = time.time() if item["done"] else None
            item["done_by"] = uid
        elif kind == "letters" and action == "open":
            if item["to"] != uid:
                return json_error(403, "Это письмо не тебе")
            if item["mode"] == "date" and item.get("date", "") > day_str():
                return json_error(423, "Ещё рано! Письмо откроется в свой день")
            if not item.get("opened_at"):
                item["opened_at"] = time.time()
                msg = (item["author"], f"💌 {short_name(uid)} открыл(а) твоё письмо «{html.escape(item['title'])}»")
        elif action == "edit" and item["author"] == uid:
            for f in ("title", "note", "link", "text", "body"):
                if f in d and f in item:
                    item[f] = clean_text(d[f], 5000 if f == "body" else 500)
        else:
            return json_error(400, "Неизвестное действие")
        view = notes_view(notes, uid)
    if msg:
        await notify(request.app, msg[0], msg[1], kind="notes")
    return ok(notes=view)


# ---------- «Что нового» после обновления ----------
# Добавляй сюда запись при каждом заметном обновлении: бот один раз пришлёт её вам обоим.
# Только про новые возможности, без мелких правок внешнего вида.
CHANGELOG = [
    ("2026-11-08", [
        "💭 Новый раздел «Мы сейчас»: несколько чувств за день, которые видит второй; в 00:00 всё обнуляется",
        "🐾 Питомец растёт по дням: новые стадии на 10, 50, 100, 200, 300 и 365 день",
        "🔥 3 восстановления огонька в месяц — если кто-то пропустил день, огонёк спасётся сам",
        "🤒 Если кто-то не зашёл, питомцу становится плохо — заходите оба",
        "🧸 Уход за питомцем прямо в комнате: миска, мячик, ванночка, лежанка",
        "💬 Уведомления о каждом новом сообщении в чате приложения",
        "✏️ Имя питомца можно менять когда угодно",
        "📱 Приложение можно добавить на экран «Домой» (Профиль)",
    ]),
    ("2026-11-08b", [
        "💭 «Мы сейчас»: можно добавить несколько чувств за день и удалить любое — в 00:00 всё обнуляется",
        "📝 Админ может добавлять и удалять общие пункты анкет",
    ]),
    ("2026-11-11", [
        "🎮 Новая вкладка «Игры»",
        "✨ Моментики — наша валюта: копятся за вход, чат, заботу о питомце и мини-игры",
        "✊ «Камень, ножницы, бумага» на желание или на моментики — результат виден, когда выбрали оба",
        "🃏 «Дурак» на двоих: подкидной или переводной, 36 или 24 карты, можно с шулерами",
        "🎟 Купоны: выставляй свои за моментики и покупай у второго",
        "💭 «Мы сейчас»: отмечай сразу несколько чувств — проценты считаются сами",
    ]),
]


async def announce_changes(bot: Bot, store: Storage, kb_for) -> None:
    """Присылает нам двоим все ещё не отправленные записи из CHANGELOG (одним сообщением)."""
    if not WEBAPP_URL or not CHANGELOG:
        return
    sent = store.get("changelog_sent_list")
    if sent is None:
        old = store.get("changelog_sent")
        sent = [v for v, _ in CHANGELOG if old and v <= old]
    new = [(v, items) for v, items in CHANGELOG if v not in sent]
    if not new:
        return
    items = [i for _, its in new for i in its]
    text = "✨ <b>Приложение обновлено!</b>\n\nЧто нового:\n" + "\n".join(items)
    for uid in ALLOWED:
        try:
            await bot.send_message(uid, text, reply_markup=kb_for(uid))
        except TelegramAPIError as e:
            log.info("changelog %s: %s", uid, e)
    await store.set("changelog_sent_list", sent + [v for v, _ in new])


# ---------- напоминания ----------
DMB_MILESTONES = {365: "Остался ровно год до дембеля!", 300: "До дембеля 300 дней",
                  200: "До дембеля 200 дней", 150: "До дембеля 150 дней", 100: "До дембеля 100 дней — сотка!",
                  50: "До дембеля 50 дней!", 30: "Остался месяц до дембеля!", 14: "Две недели до дембеля!",
                  7: "Неделя до дембеля!", 3: "Три дня до дембеля!", 1: "Завтра дембель!!!",
                  0: "ДЕМБЕЛЬ! Он возвращается домой!"}


def plural_days(n: int) -> str:
    if n % 10 == 1 and n % 100 != 11:
        return "день"
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return "дня"
    return "дней"


async def run_reminders(app: web.Application) -> None:
    store: Storage = app["store"]
    now = now_local()
    today = now.date()
    sent = store.get("reminders_sent", {})
    out: list[tuple[str, str, int | None]] = []   # (ключ, текст, кому или None=всем)

    if now.hour >= REMIND_HOUR:
        for e in get_events(store):
            nd = next_occurrence(e["month"], e["day"], today)
            left = (nd - today).days
            if left in (7, 1, 0):
                title = html.escape(e["title"])
                if left == 0:
                    years = f" ({nd.year - e['year']} лет!)" if e.get("year") else ""
                    text = f"🎉 Сегодня: <b>{title}</b>{years}"
                elif left == 1:
                    text = f"⏰ Завтра: <b>{title}</b>"
                else:
                    text = f"📅 Через неделю: <b>{title}</b> ({nd.strftime('%d.%m')})"
                out.append((f"ev:{e['id']}:{nd}:{left}", text, None))
        end = date.fromisoformat(DMB_END)
        start = date.fromisoformat(DMB_START)
        left = (end - today).days
        if left in DMB_MILESTONES:
            out.append((f"dmb:{left}", f"🎖 {DMB_MILESTONES[left]}", None))
        half = start + (end - start) / 2
        if today == half:
            out.append(("dmb:half", "🎖 Половина службы позади! Дальше — только ближе друг к другу 💞", None))

    pet = store.get("pet", {})
    if pet.get("status") == "alive":
        P.tick(pet)
        name = html.escape(pet.get("name") or "Малыш")
        if pet["stats"]["food"] < 20 and not P.is_night(time.time()):
            out.append((f"hungry:{today}", f"🍽 {name} проголодался и ждёт вас", None))
        streak, at_risk = P.effective_streak(pet)
        if at_risk and streak >= 2 and now.hour >= 20:
            visited = pet.get("visits", {}).get(day_str(), [])
            for u in ALLOWED:
                if u not in visited:
                    out.append((f"streak:{today}:{u}",
                                f"🔥 Огонёк {name} горит уже {streak} {plural_days(streak)} — "
                                f"загляни сегодня, чтобы он не погас!", u))

    if not out:
        return
    for key, text, who in out:
        if key in sent:
            continue
        sent[key] = time.time()
        kind = "pet" if key.startswith(("hungry", "streak")) else "events"
        for u in ([who] if who else ALLOWED):
            await notify(app, u, text, kind=kind)
    # чистим старое
    cutoff = time.time() - 400 * 86400
    sent = {k: v for k, v in sent.items() if v > cutoff}
    await store.set("reminders_sent", sent)


async def reminders_loop(app: web.Application) -> None:
    await asyncio.sleep(20)
    while True:
        try:
            await run_reminders(app)
        except Exception:
            log.exception("reminders")
        await asyncio.sleep(600)


# ---------- статика (если хочешь открыть приложение прямо с Render) ----------
async def h_app_index(_request: web.Request) -> web.StreamResponse:
    return web.FileResponse(WEBAPP_DIR / "index.html", headers={"Cache-Control": "no-cache"})


async def h_options(_request: web.Request) -> web.Response:
    return web.Response()


async def h_app_redirect(_request: web.Request) -> web.Response:
    raise web.HTTPFound("/app/")


def setup(app: web.Application, bot: Bot, store: Storage) -> None:
    app["bot"] = bot
    app["store"] = store
    app.middlewares.append(cors_and_auth)
    r = app.router
    r.add_route("OPTIONS", "/api/{tail:.*}", h_options)
    r.add_get("/api/bootstrap", h_bootstrap)
    r.add_get("/api/ping", h_ping)
    r.add_get("/api/avatar/{uid}", h_avatar)
    r.add_post("/api/settings", h_settings)
    r.add_post("/api/events", h_event_add)
    r.add_delete("/api/events/{id}", h_event_del)
    r.add_get("/api/chat", h_chat_get)
    r.add_post("/api/chat", h_chat_send)
    r.add_post("/api/chat/read", h_chat_read)
    r.add_post("/api/chat/{id}/react", h_chat_react)
    r.add_delete("/api/chat/{id}", h_chat_del)
    r.add_get("/api/pet", h_pet)
    r.add_post("/api/pet/pick", h_pet_pick)
    r.add_post("/api/pet/name", h_pet_name)
    r.add_post("/api/pet/action", h_pet_action)
    r.add_post("/api/pet/game", h_pet_game)
    r.add_post("/api/pet/gift", h_pet_gift)
    r.add_post("/api/pet/reset", h_pet_reset)
    r.add_post("/api/pet/xp", h_pet_xp)
    r.add_get("/api/moods", h_moods)
    r.add_post("/api/moods/today", h_moods_save)
    r.add_get("/api/notes", h_notes)
    r.add_post("/api/notes/fields", h_fields)
    r.add_delete("/api/notes/fields/{key}", h_fields)
    r.add_post("/api/notes/{kind}", h_notes_post)
    r.add_patch("/api/notes/{kind}/{id}", h_notes_patch)
    import games_api as G
    G.setup(app)
    if WEBAPP_DIR.exists():
        r.add_get("/app", h_app_redirect)
        r.add_get("/app/", h_app_index)
        r.add_static("/app/", WEBAPP_DIR)
