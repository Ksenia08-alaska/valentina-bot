"""Моментики (валюта), купоны, долги-желания, «Камень, ножницы, бумага» и «Дурак».

Всё лежит в одном ключе хранилища "play", чтобы любое действие меняло баланс и игру атомарно:
    bal      {uid: моментики}
    ledger   [{id, uid, delta, reason, ts}]       — история начислений и трат
    earn     {uid: {day, login, chat, mood, care, game}} — дневные начисления
    coupons  [{id, author, title, note, price, status, buyer, ...}]
    owed     [{id, from, to, text, game, ts, done}] — проигранные желания
    rps      текущая партия КНБ или None
    durak    текущая партия «Дурака» или None
    history  [{game, winner, loser, draw, stake, ts}]
"""
import html
import time
import uuid

from aiohttp import web

import webapp_api as A
from durak import Durak

EARN = {   # за что дают моментики: (сколько, дневной лимит)
    "login": (10, 10, "Зайти в приложение"),
    "chat": (5, 5, "Первое сообщение в чате за день"),
    "mood": (3, 3, "Отметить, что чувствуешь"),
    "care": (2, 10, "Позаботиться о питомце"),
    "game": (3, 15, "Мини-игры с питомцем"),
}
RPS_BEATS = {"rock": "scissors", "scissors": "paper", "paper": "rock"}
RPS_NAMES = {"rock": "камень", "scissors": "ножницы", "paper": "бумага"}
RPS_GEN = {"rock": "камня", "scissors": "ножниц", "paper": "бумаги"}
MAX_STAKE = 1000
turn_ping: dict[int, float] = {}


def default() -> dict:
    return {"bal": {}, "ledger": [], "earn": {}, "coupons": [], "owed": [],
            "rps": None, "durak": None, "history": []}


def norm(p: dict) -> dict:
    for k, v in default().items():
        p.setdefault(k, v)
    return p


def bal(p: dict, uid: int) -> int:
    return int(p["bal"].get(str(uid), 0))


def move(p: dict, uid: int, delta: int, reason: str) -> None:
    p["bal"][str(uid)] = max(0, bal(p, uid) + int(delta))
    p["ledger"].append({"id": uuid.uuid4().hex[:8], "uid": uid, "delta": int(delta),
                        "reason": reason, "ts": time.time()})
    del p["ledger"][:-400]


async def earn(app: web.Application, uid: int, kind: str) -> int:
    """Начислить за действие с учётом дневного лимита. Возвращает сколько начислено."""
    if kind not in EARN:
        return 0
    amount, cap, title = EARN[kind]
    store = app["store"]
    today = A.day_str()
    async with store.edit("play", default()) as p:
        norm(p)
        e = p["earn"].get(str(uid))
        if not e or e.get("day") != today:
            e = {"day": today}
        got = e.get(kind, 0)
        add = max(0, min(amount, cap - got))
        if add:
            e[kind] = got + add
            move(p, uid, add, title)
        p["earn"][str(uid)] = e
    return add


def stake_of(d: dict) -> dict | str:
    s = d.get("stake") if isinstance(d.get("stake"), dict) else {}
    kind = s.get("kind")
    if kind == "coins":
        try:
            amount = int(s.get("amount") or 0)
        except (TypeError, ValueError):
            amount = 0
        if not 1 <= amount <= MAX_STAKE:
            return f"Ставка — от 1 до {MAX_STAKE} моментиков"
        return {"kind": "coins", "amount": amount}
    if kind == "wish":
        return {"kind": "wish", "text": A.clean_text(s.get("text"), 140)}
    return {"kind": "none"}


def stake_text(s: dict) -> str:
    if s["kind"] == "coins":
        return f"на {s['amount']} моментиков"
    if s["kind"] == "wish":
        return "на желание" + (f" («{s['text']}»)" if s.get("text") else "")
    return "просто так"


def settle(p: dict, game: str, stake: dict, winner: int | None, loser: int | None) -> None:
    """Раздать выигрыш. Моментики уже заморожены у обоих при принятии вызова."""
    names = {"rps": "Камень, ножницы, бумага", "durak": "Дурак"}
    if stake["kind"] == "coins":
        if winner:
            move(p, winner, stake["amount"] * 2, f"Победа: {names[game]}")
        else:
            for u in A.ALLOWED:
                move(p, u, stake["amount"], f"Ничья, ставка вернулась: {names[game]}")
    if stake["kind"] == "wish" and winner:
        p["owed"].append({"id": uuid.uuid4().hex[:8], "from": loser, "to": winner, "text": stake.get("text", ""),
                          "game": game, "ts": time.time(), "done": False})
    p["history"].append({"game": game, "winner": winner, "loser": loser, "draw": winner is None,
                         "stake": stake, "ts": time.time()})
    del p["history"][:-100]


def freeze(p: dict, uid: int, stake: dict, game: str) -> str | None:
    if stake["kind"] != "coins":
        return None
    if bal(p, uid) < stake["amount"]:
        return "Не хватает моментиков на ставку" if uid else ""
    move(p, uid, -stake["amount"], f"Ставка: {'КНБ' if game == 'rps' else 'Дурак'}")
    return None


def unfreeze(p: dict, uid: int, stake: dict, game: str) -> None:
    if stake["kind"] == "coins":
        move(p, uid, stake["amount"], f"Ставка вернулась: {'КНБ' if game == 'rps' else 'Дурак'}")


# ---------- представления ----------
def rps_view(g: dict | None, uid: int) -> dict | None:
    if not g:
        return None
    opp = A.partner_of(uid)
    rounds = []
    for r in g["rounds"]:
        rounds.append({"me": r["picks"].get(str(uid)), "opp": r["picks"].get(str(opp)), "winner": r["winner"]})
    return {"id": g["id"], "by": g["by"], "to": g["to"], "stake": g["stake"], "first_to": g["first_to"],
            "status": g["status"], "ts": g["ts"],
            "my_pick": g["picks"].get(str(uid)), "opp_picked": str(opp) in g["picks"],
            "score": {"me": g["score"].get(str(uid), 0), "opp": g["score"].get(str(opp), 0)},
            "rounds": rounds, "winner": g.get("winner"), "result": g.get("result")}


def durak_view(g: dict | None, uid: int) -> dict | None:
    if not g:
        return None
    out = {"id": g["id"], "by": g["by"], "to": g["to"], "stake": g["stake"], "status": g["status"],
           "settings": g["settings"], "ts": g["ts"], "result": g.get("result")}
    if g.get("state"):
        out["game"] = Durak(g["state"]).view(uid)
    return out


def public(p: dict, uid: int) -> dict:
    me, opp = uid, A.partner_of(uid)
    today = A.day_str()
    e = p["earn"].get(str(uid)) or {}
    earned = {k: (e.get(k, 0) if e.get("day") == today else 0) for k in EARN}
    return {
        "balance": {"me": bal(p, me), "opp": bal(p, opp)},
        "ledger": [x for x in p["ledger"] if x["uid"] == me][-60:][::-1],
        "earn": [{"key": k, "title": t, "amount": a, "cap": c, "got": earned[k]} for k, (a, c, t) in EARN.items()],
        "coupons": p["coupons"][::-1],
        "owed": p["owed"][::-1][:60],
        "rps": rps_view(p["rps"], uid),
        "durak": durak_view(p["durak"], uid),
        "history": p["history"][::-1][:30],
    }


def live(p: dict, uid: int) -> dict:
    return {"rps": rps_view(p["rps"], uid), "durak": durak_view(p["durak"], uid),
            "balance": {"me": bal(p, uid), "opp": bal(p, A.partner_of(uid))}}


async def h_games(request: web.Request) -> web.Response:
    store = request.app["store"]
    p = norm(store.get("play", default()))
    return A.ok(**public(p, request["uid"]))


async def h_live(request: web.Request) -> web.Response:
    p = norm(request.app["store"].get("play", default()))
    return A.ok(**live(p, request["uid"]))


def away(uid: int, sec: int = 25) -> bool:
    return time.time() - A.presence.get(uid, 0) > sec


# ---------- админ ----------
async def h_admin_coins(request: web.Request) -> web.Response:
    if request["uid"] != A.ADMIN_ID:
        return A.json_error(403, "Только для админа")
    d = await A.body(request)
    try:
        who = int(d.get("uid") or 0)
        amount = int(d.get("amount") or 0)
    except (TypeError, ValueError):
        return A.json_error(400, "Неверное число")
    if who not in A.ALLOWED or not amount or abs(amount) > 100000:
        return A.json_error(400, "Укажи кому и сколько")
    reason = A.clean_text(d.get("reason"), 80) or ("Подарок от админа" if amount > 0 else "Списание админом")
    async with request.app["store"].edit("play", default()) as p:
        norm(p)
        move(p, who, amount, reason)
        out = public(p, request["uid"])
    if d.get("notify") and who != request["uid"]:
        sign = f"+{amount}" if amount > 0 else str(amount)
        await A.notify(request.app, who, f"✨ Моментики: <b>{sign}</b> — {html.escape(reason)}", kind="games")
    return A.ok(**out)


# ---------- купоны ----------
async def h_coupon_add(request: web.Request) -> web.Response:
    uid = request["uid"]
    d = await A.body(request)
    title = A.clean_text(d.get("title"), 60)
    if len(title) < 2:
        return A.json_error(400, "Напиши, что даёт купон")
    try:
        price = int(d.get("price") or 0)
    except (TypeError, ValueError):
        price = 0
    if not 1 <= price <= 5000:
        return A.json_error(400, "Цена — от 1 до 5000 моментиков")
    c = {"id": uuid.uuid4().hex[:8], "author": uid, "title": title, "note": A.clean_text(d.get("note"), 200),
         "price": price, "status": "available", "ts": time.time()}
    async with request.app["store"].edit("play", default()) as p:
        norm(p)
        p["coupons"].append(c)
        del p["coupons"][:-200]
        out = public(p, uid)
    await A.notify(request.app, A.partner_of(uid),
                   f"🎟 {A.short_name(uid)} выставил(а) купон: <b>{html.escape(title)}</b> за {price} моментиков",
                   kind="games")
    return A.ok(**out)


async def h_coupon_act(request: web.Request) -> web.Response:
    uid = request["uid"]
    cid, act = request.match_info["id"], request.match_info.get("act", "delete")
    msg = None
    async with request.app["store"].edit("play", default()) as p:
        norm(p)
        c = next((x for x in p["coupons"] if x["id"] == cid), None)
        if not c:
            return A.json_error(404, "Купон не найден")
        if act == "delete":
            if c["author"] != uid or c["status"] != "available":
                return A.json_error(403, "Удалить можно только свой непроданный купон")
            p["coupons"].remove(c)
        elif act == "buy":
            if c["author"] == uid:
                return A.json_error(400, "Свой купон купить нельзя")
            if c["status"] != "available":
                return A.json_error(409, "Купон уже купили")
            if bal(p, uid) < c["price"]:
                return A.json_error(400, f"Не хватает моментиков: нужно {c['price']}, есть {bal(p, uid)}")
            move(p, uid, -c["price"], f"Купон: {c['title']}")
            move(p, c["author"], c["price"], f"Продан купон: {c['title']}")
            c.update({"status": "bought", "buyer": uid, "bought_at": time.time()})
            msg = (c["author"], f"🎟 {A.short_name(uid)} купил(а) твой купон «{html.escape(c['title'])}» "
                                f"(+{c['price']} моментиков)")
        elif act == "use":
            if c.get("buyer") != uid or c["status"] != "bought":
                return A.json_error(400, "Использовать можно только купленный тобой купон")
            c.update({"status": "used", "used_at": time.time()})
            msg = (c["author"], f"🎟 {A.short_name(uid)} использует купон: <b>{html.escape(c['title'])}</b>\n"
                                f"Пора исполнять!")
        else:
            return A.json_error(400, "Неизвестное действие")
        out = public(p, uid)
    if msg:
        await A.notify(request.app, msg[0], msg[1], kind="games")
    return A.ok(**out)


async def h_owed_done(request: web.Request) -> web.Response:
    uid = request["uid"]
    oid = request.match_info["id"]
    async with request.app["store"].edit("play", default()) as p:
        norm(p)
        o = next((x for x in p["owed"] if x["id"] == oid), None)
        if not o or uid not in (o["from"], o["to"]):
            return A.json_error(404, "Не найдено")
        o["done"] = not o.get("done")
        o["done_at"] = time.time() if o["done"] else None
        out = public(p, uid)
    return A.ok(**out)


# ---------- вызовы (общие для обеих игр) ----------
async def h_invite(request: web.Request) -> web.Response:
    uid = request["uid"]
    kind = request.match_info["game"]
    d = await A.body(request)
    stake = stake_of(d)
    if isinstance(stake, str):
        return A.json_error(400, stake)
    opp = A.partner_of(uid)
    if not opp:
        return A.json_error(400, "Нужен второй игрок")
    g = {"id": uuid.uuid4().hex[:8], "by": uid, "to": opp, "stake": stake, "status": "invite", "ts": time.time()}
    if kind == "rps":
        try:
            first_to = int(d.get("first_to") or 1)
        except (TypeError, ValueError):
            first_to = 1
        g.update({"first_to": first_to if first_to in (1, 2, 3) else 1, "picks": {}, "rounds": [],
                  "score": {}, "winner": None})
        title = "Камень, ножницы, бумага" + (f" до {g['first_to']} побед" if g["first_to"] > 1 else "")
    elif kind == "durak":
        mode = "perevodnoy" if d.get("mode") == "perevodnoy" else "podkidnoy"
        deck = 24 if int(d.get("deck") or 36) == 24 else 36
        g["settings"] = {"mode": mode, "deck": deck, "cheats": bool(d.get("cheats"))}
        title = "Дурак " + ("переводной" if mode == "perevodnoy" else "подкидной") + \
                f", {deck} карт" + (", с шулерами" if g["settings"]["cheats"] else "")
    else:
        return A.json_error(404, "Нет такой игры")
    async with request.app["store"].edit("play", default()) as p:
        norm(p)
        cur = p[kind]
        if cur and cur["status"] in ("invite", "playing"):
            return A.json_error(409, "Эта игра уже идёт — сначала доиграйте")
        err = freeze(p, uid, stake, kind)
        if err:
            return A.json_error(400, err)
        p[kind] = g
        out = public(p, uid)
    await A.notify(request.app, opp, f"🎲 {A.short_name(uid)} зовёт сыграть: <b>{title}</b> {stake_text(stake)}",
                   kind="games")
    return A.ok(**out)


async def h_respond(request: web.Request) -> web.Response:
    uid = request["uid"]
    kind, act = request.match_info["game"], request.match_info["act"]
    if kind not in ("rps", "durak"):
        return A.json_error(404, "Нет такой игры")
    note = None
    async with request.app["store"].edit("play", default()) as p:
        norm(p)
        g = p[kind]
        if not g or g["status"] not in ("invite", "playing"):
            return A.json_error(409, "Игры нет")
        if act == "accept":
            if g["status"] != "invite" or g["to"] != uid:
                return A.json_error(400, "Принять может только приглашённый")
            err = freeze(p, uid, g["stake"], kind)
            if err:
                return A.json_error(400, err)
            g["status"] = "playing"
            g["started"] = time.time()
            if kind == "durak":
                s = g["settings"]
                g["state"] = Durak.new([g["by"], g["to"]], s["mode"], s["deck"], s["cheats"])
            note = (g["by"], f"🎲 {A.short_name(uid)} принял(а) вызов — заходи играть!")
        elif act in ("decline", "cancel"):
            if g["status"] != "invite":
                return A.json_error(400, "Игра уже началась")
            if (act == "decline" and g["to"] != uid) or (act == "cancel" and g["by"] != uid):
                return A.json_error(400, "Нельзя")
            unfreeze(p, g["by"], g["stake"], kind)
            g["status"] = "declined" if act == "decline" else "cancelled"
            if act == "decline":
                note = (g["by"], f"🎲 {A.short_name(uid)} пока не хочет играть")
        elif act == "surrender":
            if g["status"] != "playing" or uid not in (g["by"], g["to"]):
                return A.json_error(400, "Сдаваться не в чем")
            win = A.partner_of(uid)
            g["status"] = "done"
            g["winner"] = win
            g["result"] = {"winner": win, "loser": uid, "draw": False, "surrender": True}
            if kind == "durak" and g.get("state"):
                g["state"]["status"] = "finished"
                g["state"]["winner"], g["state"]["loser"] = win, uid
            settle(p, kind, g["stake"], win, uid)
            note = (win, f"🏳️ {A.short_name(uid)} сдаётся — победа твоя!")
        elif act == "close":
            if g["status"] in ("invite", "playing"):
                return A.json_error(400, "Игра ещё идёт")
        else:
            return A.json_error(400, "Неизвестное действие")
        out = public(p, uid)
    if note:
        await A.notify(request.app, note[0], note[1], kind="games")
    return A.ok(**out)


async def h_close(request: web.Request) -> web.Response:
    """Убрать с экрана законченную партию."""
    uid = request["uid"]
    kind = request.match_info["game"]
    async with request.app["store"].edit("play", default()) as p:
        norm(p)
        g = p.get(kind)
        if g and g["status"] not in ("invite", "playing"):
            g.setdefault("seen", [])
            if uid not in g["seen"]:
                g["seen"].append(uid)
            if all(u in g["seen"] for u in A.ALLOWED):
                p[kind] = None
        out = public(p, uid)
    return A.ok(**out)


# ---------- КНБ ----------
async def h_rps_pick(request: web.Request) -> web.Response:
    uid = request["uid"]
    d = await A.body(request)
    choice = d.get("choice")
    if choice not in RPS_BEATS:
        return A.json_error(400, "Выбери камень, ножницы или бумагу")
    note = None
    async with request.app["store"].edit("play", default()) as p:
        norm(p)
        g = p["rps"]
        if not g or g["status"] != "playing" or uid not in (g["by"], g["to"]):
            return A.json_error(409, "Игра не идёт")
        if str(uid) in g["picks"]:
            return A.json_error(400, "Ты уже выбрал(а) — ждём второго")
        g["picks"][str(uid)] = choice
        opp = A.partner_of(uid)
        if str(opp) in g["picks"]:
            a, b = g["picks"][str(uid)], g["picks"][str(opp)]
            w = None if a == b else (uid if RPS_BEATS[a] == b else opp)
            g["rounds"].append({"picks": dict(g["picks"]), "winner": w, "ts": time.time()})
            g["picks"] = {}
            if w:
                g["score"][str(w)] = g["score"].get(str(w), 0) + 1
                if g["score"][str(w)] >= g["first_to"]:
                    g["status"] = "done"
                    g["winner"] = w
                    lose = A.partner_of(w)
                    g["result"] = {"winner": w, "loser": lose, "draw": False}
                    settle(p, "rps", g["stake"], w, lose)
            if away(opp):
                res = "ничья" if not w else ("ты выиграл(а)!" if w == opp else "победа за " + A.short_name(uid))
                note = (opp, f"✊ КНБ: твоя {RPS_NAMES[b]} против {RPS_GEN[a]} — {res}" if b == "paper" else f"✊ КНБ: твои {RPS_NAMES[b]} против {RPS_GEN[a]} — {res}" if b == "scissors" else f"✊ КНБ: твой камень против {RPS_GEN[a]} — {res}")
        elif away(opp, 25) and time.time() - turn_ping.get(opp, 0) > 60:
            turn_ping[opp] = time.time()
            note = (opp, f"✊ {A.short_name(uid)} уже сделал(а) выбор в «Камень, ножницы, бумага» — твой ход!")
        out = live(p, uid)
    if note:
        await A.notify(request.app, note[0], note[1], kind="games")
    return A.ok(**out)


# ---------- Дурак ----------
async def h_durak_move(request: web.Request) -> web.Response:
    uid = request["uid"]
    d = await A.body(request)
    act = d.get("action")
    card = str(d.get("card") or "")
    note = None
    extra = {}
    async with request.app["store"].edit("play", default()) as p:
        norm(p)
        g = p["durak"]
        if not g or g["status"] != "playing" or not g.get("state"):
            return A.json_error(409, "Игра не идёт")
        e = Durak(g["state"])
        if act == "attack":
            err = e.attack(uid, card)
        elif act == "defend":
            try:
                idx = int(d.get("idx"))
            except (TypeError, ValueError):
                idx = -1
            err = e.defend(uid, idx, card)
        elif act == "transfer":
            err = e.transfer(uid, card)
        elif act == "take":
            err = e.take(uid)
        elif act == "done":
            err = e.done(uid)
        elif act == "bito":
            err = e.bito(uid)
        elif act == "catch":
            err, extra = e.catch(uid)
        else:
            err = "Неизвестный ход"
        if err:
            return A.json_error(400, err)
        st = g["state"]
        opp = A.partner_of(uid)
        if st["status"] == "finished":
            g["status"] = "done"
            w, l = st.get("winner"), st.get("loser")
            g["result"] = {"winner": w, "loser": l, "draw": st.get("draw", False)}
            settle(p, "durak", g["stake"], w, l)
            if away(opp):
                txt = "ничья!" if st.get("draw") else ("ты выиграл(а)!" if w == opp else "ты остался(ась) дураком")
                note = (opp, f"🃏 Дурак закончен — {txt}")
        else:
            waiting = st["defender"] if (any(not x["d"] for x in st["table"]) and not st["taking"]) else st["attacker"]
            if waiting == opp and away(opp) and time.time() - turn_ping.get(opp, 0) > 90:
                turn_ping[opp] = time.time()
                note = (opp, f"🃏 {A.short_name(uid)} ждёт твоего хода в «Дураке»")
        out = live(p, uid)
    if note:
        await A.notify(request.app, note[0], note[1], kind="games")
    return A.ok(caught=extra or None, **out)


def setup(app: web.Application) -> None:
    r = app.router
    r.add_get("/api/games", h_games)
    r.add_get("/api/games/live", h_live)
    r.add_post("/api/coins/admin", h_admin_coins)
    r.add_post("/api/coupons", h_coupon_add)
    r.add_post("/api/coupons/{id}/{act}", h_coupon_act)
    r.add_delete("/api/coupons/{id}", h_coupon_act)
    r.add_post("/api/owed/{id}/done", h_owed_done)
    r.add_post("/api/rps/pick", h_rps_pick)
    r.add_post("/api/durak/move", h_durak_move)
    r.add_post("/api/play/{game}/close", h_close)
    r.add_post("/api/play/{game}/{act}", h_respond)
    r.add_post("/api/play/{game}", h_invite)
