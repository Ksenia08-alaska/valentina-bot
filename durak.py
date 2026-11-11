"""Дурак на двоих: подкидной и переводной, колода 36 или 24, режим «с шулерами».

Карта — строка: ранг + масть, например "10H", "QS", "6D". Масти: S ♠, C ♣, D ♦, H ♥.

Правила (классические для двух игроков):
- Каждому по 6 карт, нижняя карта колоды открыта — её масть козырь, она уходит последней.
- Первым ходит тот, у кого младший козырь (если козырей нет ни у кого — случайно).
- Отбиваться: старшей картой той же масти или любым козырем (на козырь — старшим козырем).
- Подкидывать можно карты тех рангов, что уже лежат на столе. Всего в одном «заходе»
  атакующих карт не больше, чем было карт у отбивающегося в начале захода, и не больше 6.
- Отбивающийся может взять: тогда атакующий ещё может подкинуть (в пределах лимита) и нажать «Готово».
- Если всё отбито — «Бито», карты уходят в отбой, отбивавшийся ходит следующим.
- После захода добор до 6: сначала атакующий, потом отбивавшийся.
- Переводной: пока ни одна карта не отбита, отбивающийся может перевести, положив карту того же ранга;
  атакующий становится отбивающимся (если у него хватает карт на все карты стола).
- Конец: когда колода пуста и у игрока кончились карты — он вышел. Оставшийся с картами — дурак.
  Кончились у обоих одновременно — ничья.
- С шулерами: можно положить «неправильную» карту (подкинуть не тот ранг, отбиться не той картой,
  перевести не тем рангом). Соперник может нажать «Поймать шулера», пока заход не закончен.
  Кто ошибся (пойманный шулер или ложное обвинение) — забирает все карты со стола, ходит соперник.
"""
import random
import time

SUITS = ["S", "C", "D", "H"]
RANKS = {36: ["6", "7", "8", "9", "10", "J", "Q", "K", "A"], 24: ["9", "10", "J", "Q", "K", "A"]}
HAND = 6


def rank(c: str) -> str:
    return c[:-1]


def suit(c: str) -> str:
    return c[-1]


class Durak:
    def __init__(self, st: dict):
        self.st = st

    # ---------- создание ----------
    @staticmethod
    def new(players: list[int], mode: str = "podkidnoy", deck_size: int = 36, cheats: bool = False,
            rng: random.Random | None = None) -> dict:
        rng = rng or random.Random()
        ranks = RANKS[36 if deck_size not in RANKS else deck_size]
        deck = [r + s for s in SUITS for r in ranks]
        rng.shuffle(deck)
        st = {
            "players": list(players), "mode": mode if mode in ("podkidnoy", "perevodnoy") else "podkidnoy",
            "deck_size": len(deck), "cheats": bool(cheats), "status": "playing",
            "deck": deck, "trump_card": deck[0], "trump": suit(deck[0]), "discard": 0,
            "hands": {str(p): [] for p in players}, "table": [], "taking": False,
            "attacker": None, "defender": None, "limit": HAND, "bout": 1,
            "winner": None, "loser": None, "draw": False, "log": [], "v": 1, "started": time.time(),
        }
        g = Durak(st)
        for _ in range(HAND):
            for p in players:
                st["hands"][str(p)].append(deck.pop())
        # первый ход — у кого младший козырь
        best = None
        for p in players:
            for c in st["hands"][str(p)]:
                if suit(c) == st["trump"] and (best is None or g.val(c) < g.val(best[1])):
                    best = (p, c)
        first = best[0] if best else rng.choice(players)
        st["attacker"], st["defender"] = first, g.other(first)
        g.start_bout()
        g.log(f"ходит первым" + (f" — младший козырь {best[1]}" if best else ""), first)
        for p in players:
            g.sort_hand(p)
        return st

    # ---------- помощники ----------
    @property
    def ranks(self) -> list[str]:
        return RANKS[36] if self.st["deck_size"] == 36 else RANKS[24]

    def val(self, c: str) -> int:
        return self.ranks.index(rank(c))

    def other(self, p: int) -> int:
        a, b = self.st["players"]
        return b if p == a else a

    def hand(self, p: int) -> list[str]:
        return self.st["hands"][str(p)]

    def sort_hand(self, p: int) -> None:
        t = self.st["trump"]
        self.hand(p).sort(key=lambda c: (suit(c) == t, SUITS.index(suit(c)), self.val(c)))

    def beats(self, a: str, d: str) -> bool:
        t = self.st["trump"]
        if suit(d) == suit(a):
            return self.val(d) > self.val(a)
        return suit(d) == t and suit(a) != t

    def table_ranks(self) -> set[str]:
        out = set()
        for e in self.st["table"]:
            out.add(rank(e["a"]))
            if e["d"]:
                out.add(rank(e["d"]))
        return out

    def log(self, text: str, who: int | None = None) -> None:
        self.st["log"].append({"ts": time.time(), "text": text, "who": who})
        self.st["log"] = self.st["log"][-40:]

    def bump(self) -> None:
        self.st["v"] += 1

    def start_bout(self) -> None:
        self.st["table"] = []
        self.st["taking"] = False
        self.st["limit"] = min(HAND, len(self.hand(self.st["defender"])))

    def all_beaten(self) -> bool:
        return bool(self.st["table"]) and all(e["d"] for e in self.st["table"])

    def refill(self, first: int) -> None:
        deck = self.st["deck"]
        for p in (first, self.other(first)):
            h = self.hand(p)
            while len(h) < HAND and deck:
                h.append(deck.pop())
            self.sort_hand(p)

    def check_end(self) -> bool:
        st = self.st
        if st["deck"]:
            return False
        empty = [p for p in st["players"] if not self.hand(p)]
        if not empty:
            return False
        st["status"] = "finished"
        st["finished"] = time.time()
        if len(empty) == 2:
            st["draw"] = True
            self.log("Ничья — карты кончились у обоих")
        else:
            st["winner"] = empty[0]
            st["loser"] = self.other(empty[0])
        return True

    def end_bout_bito(self) -> None:
        st = self.st
        n = sum(2 if e["d"] else 1 for e in st["table"])
        st["discard"] += n
        att = st["attacker"]
        self.refill(att)
        st["attacker"], st["defender"] = st["defender"], att
        st["bout"] += 1
        if not self.check_end():
            self.start_bout()
        else:
            st["table"] = []

    def take_all(self, who: int) -> None:
        st = self.st
        h = self.hand(who)
        for e in st["table"]:
            h.append(e["a"])
            if e["d"]:
                h.append(e["d"])
        self.sort_hand(who)

    def end_bout_taken(self, taker: int) -> None:
        """taker забрал карты со стола; ходит соперник taker'а."""
        st = self.st
        self.take_all(taker)
        nxt = self.other(taker)
        self.refill(nxt)
        st["attacker"], st["defender"] = nxt, taker
        st["bout"] += 1
        if not self.check_end():
            self.start_bout()
        else:
            st["table"] = []

    def auto(self) -> None:
        """Автоматические завершения захода, когда ходить больше нечем."""
        st = self.st
        if st["status"] != "playing":
            return
        att, dfn = st["attacker"], st["defender"]
        if st["taking"]:
            if not self.hand(att) or len(st["table"]) >= st["limit"]:
                self.log("Карты забраны")
                self.end_bout_taken(dfn)
            return
        if self.all_beaten() and (not self.hand(att) or not self.hand(dfn) or len(st["table"]) >= st["limit"]):
            self.log("Бито")
            self.end_bout_bito()

    # ---------- действия ----------
    def _check(self, uid: int) -> str | None:
        if self.st["status"] != "playing":
            return "Игра уже закончилась"
        if uid not in self.st["players"]:
            return "Ты не в этой игре"
        return None

    def attack(self, uid: int, card: str) -> str | None:
        st = self.st
        err = self._check(uid)
        if err:
            return err
        if uid != st["attacker"]:
            return "Сейчас ходит соперник"
        if card not in self.hand(uid):
            return "У тебя нет такой карты"
        if len(st["table"]) >= st["limit"]:
            return "Больше подкидывать нельзя — лимит карт на заход"
        cheat = False
        if st["table"] and rank(card) not in self.table_ranks():
            if not st["cheats"]:
                return "Подкидывать можно только карты тех рангов, что уже на столе"
            cheat = True
        self.hand(uid).remove(card)
        st["table"].append({"a": card, "d": None, "pa": uid, "pd": None, "ca": cheat, "cd": False})
        self.log(f"{'ходит' if len(st['table']) == 1 else 'подкидывает'} {card}", uid)
        self.bump()
        self.auto()
        return None

    def defend(self, uid: int, idx: int, card: str) -> str | None:
        st = self.st
        err = self._check(uid)
        if err:
            return err
        if uid != st["defender"]:
            return "Сейчас ты атакуешь"
        if st["taking"]:
            return "Ты уже берёшь карты"
        if not (0 <= idx < len(st["table"])) or st["table"][idx]["d"]:
            return "Эта карта уже отбита"
        if card not in self.hand(uid):
            return "У тебя нет такой карты"
        e = st["table"][idx]
        cheat = False
        if not self.beats(e["a"], card):
            if not st["cheats"]:
                return "Этой картой не отбиться"
            cheat = True
        self.hand(uid).remove(card)
        e.update({"d": card, "pd": uid, "cd": cheat})
        self.log(f"кроет {e['a']} картой {card}", uid)
        self.bump()
        self.auto()
        return None

    def can_transfer_rank(self) -> str | None:
        st = self.st
        if st["mode"] != "perevodnoy" or st["taking"] or not st["table"] or any(e["d"] for e in st["table"]):
            return None
        rs = {rank(e["a"]) for e in st["table"]}
        if len(rs) != 1:
            return None
        if len(self.hand(st["attacker"])) < len(st["table"]) + 1 or len(st["table"]) + 1 > HAND:
            return None
        return rs.pop()

    def transfer(self, uid: int, card: str) -> str | None:
        st = self.st
        err = self._check(uid)
        if err:
            return err
        if st["mode"] != "perevodnoy":
            return "В подкидном переводить нельзя"
        if uid != st["defender"]:
            return "Переводить может только отбивающийся"
        if card not in self.hand(uid):
            return "У тебя нет такой карты"
        if st["taking"] or not st["table"] or any(e["d"] for e in st["table"]):
            return "Переводить можно, пока ни одна карта не отбита"
        if len(self.hand(st["attacker"])) < len(st["table"]) + 1 or len(st["table"]) + 1 > HAND:
            return "Перевести нельзя — у соперника не хватит карт"
        rs = {rank(e["a"]) for e in st["table"]}
        cheat = False
        if len(rs) != 1 or rank(card) not in rs:
            if not st["cheats"]:
                return "Перевести можно только картой того же ранга"
            cheat = True
        self.hand(uid).remove(card)
        st["table"].append({"a": card, "d": None, "pa": uid, "pd": None, "ca": cheat, "cd": False})
        st["attacker"], st["defender"] = uid, st["attacker"]
        st["limit"] = min(HAND, len(self.hand(st["defender"])) + 0)
        st["limit"] = max(st["limit"], len(st["table"]))
        self.log(f"переводит картой {card}", uid)
        self.bump()
        return None

    def take(self, uid: int) -> str | None:
        st = self.st
        err = self._check(uid)
        if err:
            return err
        if uid != st["defender"]:
            return "Брать может только отбивающийся"
        if not st["table"]:
            return "На столе нет карт"
        if st["taking"]:
            return "Ты уже берёшь"
        if self.all_beaten():
            return "Всё отбито — ждём «Бито»"
        st["taking"] = True
        self.log("берёт", uid)
        self.bump()
        self.auto()
        return None

    def done(self, uid: int) -> str | None:
        """Атакующий: «Готово» после того, как соперник решил брать (больше не подкидываю)."""
        st = self.st
        err = self._check(uid)
        if err:
            return err
        if uid != st["attacker"] or not st["taking"]:
            return "Сейчас это не нужно"
        self.log("Карты забраны")
        self.end_bout_taken(st["defender"])
        self.bump()
        return None

    def bito(self, uid: int) -> str | None:
        st = self.st
        err = self._check(uid)
        if err:
            return err
        if uid != st["attacker"]:
            return "«Бито» говорит атакующий"
        if st["taking"] or not self.all_beaten():
            return "Не все карты отбиты"
        self.log("Бито")
        self.end_bout_bito()
        self.bump()
        return None

    def catch(self, uid: int) -> tuple[str | None, dict]:
        """Поймать шулера. Возвращает (ошибка, результат)."""
        st = self.st
        err = self._check(uid)
        if err:
            return err, {}
        if not st["cheats"]:
            return "В этой игре без шулеров", {}
        if not st["table"]:
            return "На столе пусто — ловить нечего", {}
        opp = self.other(uid)
        caught = [e for e in st["table"] if (e["ca"] and e["pa"] == opp) or (e["cd"] and e["pd"] == opp)]
        loser = opp if caught else uid
        cards = [e["a"] if (e["ca"] and e["pa"] == opp) else e["d"] for e in caught]
        self.log(("ловит шулера: " + ", ".join(cards) + " — соперник забирает стол") if caught else "ловит шулера, но зря — забирает стол сам", uid)
        self.end_bout_taken(loser)
        self.bump()
        return None, {"caught": bool(caught), "loser": loser, "cards": cards}

    # ---------- вид для игрока ----------
    def view(self, uid: int) -> dict:
        st = self.st
        me, opp = uid, self.other(uid)
        my_turn_attack = st["status"] == "playing" and me == st["attacker"]
        my_turn_defend = st["status"] == "playing" and me == st["defender"] and not st["taking"]
        tr = self.can_transfer_rank() if my_turn_defend else None
        ranks_on = self.table_ranks()
        hand = self.hand(me)
        return {
            "status": st["status"], "mode": st["mode"], "deck_size": st["deck_size"], "cheats": st["cheats"],
            "trump": st["trump"], "trump_card": st["trump_card"] if st["deck"] else None,
            "deck_left": len(st["deck"]), "discard": st["discard"],
            "hand": hand, "opp_count": len(self.hand(opp)),
            "table": [{"a": e["a"], "d": e["d"]} for e in st["table"]],
            "attacker": st["attacker"], "defender": st["defender"], "taking": st["taking"], "limit": st["limit"],
            "role": "attacker" if me == st["attacker"] else "defender",
            "can": {
                "attack": my_turn_attack and len(st["table"]) < st["limit"] and (not st["table"] or st["cheats"] or any(rank(c) in ranks_on for c in hand)),
                "bito": my_turn_attack and not st["taking"] and self.all_beaten(),
                "done": my_turn_attack and st["taking"],
                "take": my_turn_defend and bool(st["table"]) and not self.all_beaten(),
                "defend": my_turn_defend and any(not e["d"] for e in st["table"]),
                "transfer": bool(my_turn_defend and st["mode"] == "perevodnoy" and (tr or (st["cheats"] and st["table"] and not any(e["d"] for e in st["table"])))),
                "transfer_rank": tr,
                "catch": st["status"] == "playing" and st["cheats"] and bool(st["table"]),
            },
            "winner": st["winner"], "loser": st["loser"], "draw": st["draw"],
            "log": st["log"][-8:], "v": st["v"], "bout": st["bout"],
        }

    def legal_attacks(self, uid: int) -> list[str]:
        st = self.st
        if uid != st["attacker"] or len(st["table"]) >= st["limit"]:
            return []
        h = self.hand(uid)
        if not st["table"]:
            return list(h)
        rs = self.table_ranks()
        return [c for c in h if rank(c) in rs]

    def legal_defences(self, uid: int) -> list[tuple[int, str]]:
        st = self.st
        if uid != st["defender"] or st["taking"]:
            return []
        out = []
        for i, e in enumerate(st["table"]):
            if not e["d"]:
                out += [(i, c) for c in self.hand(uid) if self.beats(e["a"], c)]
        return out
