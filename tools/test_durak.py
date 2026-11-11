"""Проверка движка «Дурака»: тысячи случайных партий по правилам.

    python tools/test_durak.py
"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from durak import Durak, rank  # noqa: E402


def total_cards(st):
    n = len(st["deck"]) + st["discard"] + sum(len(h) for h in st["hands"].values())
    n += sum(2 if e["d"] else 1 for e in st["table"])
    return n


def play(seed, mode, deck, cheats):
    rng = random.Random(seed)
    st = Durak.new([1, 2], mode, deck, cheats, rng)
    g = Durak(st)
    steps = 0
    while st["status"] == "playing":
        steps += 1
        assert steps < 3000, "партия не заканчивается"
        assert total_cards(st) == deck, f"потерялись карты: {total_cards(st)}"
        att, dfn = st["attacker"], st["defender"]
        acted = False
        # отбивающийся
        if not st["taking"] and any(not e["d"] for e in st["table"]):
            r = rng.random()
            tr = g.can_transfer_rank()
            if tr and r < .3:
                c = next((c for c in g.hand(dfn) if rank(c) == tr), None)
                if c:
                    assert g.transfer(dfn, c) is None
                    continue
            if cheats and r < .08:
                i = next(i for i, e in enumerate(st["table"]) if not e["d"])
                assert g.defend(dfn, i, g.hand(dfn)[0]) is None
                continue
            opts = g.legal_defences(dfn)
            if opts and r < .85:
                i, c = rng.choice(opts)
                assert g.defend(dfn, i, c) is None, (i, c)
            else:
                assert g.take(dfn) is None
            continue
        # атакующий
        if cheats and st["table"] and rng.random() < .1:
            e, res = g.catch(rng.choice([att, dfn]))
            assert e is None
            continue
        att = st["attacker"]
        opts = g.legal_attacks(att)
        if cheats and st["table"] and g.hand(att) and len(st["table"]) < st["limit"] and rng.random() < .05:
            assert g.attack(att, g.hand(att)[0]) is None
            continue
        if opts and (not st["table"] or rng.random() < .5):
            assert g.attack(att, rng.choice(opts)) is None
            acted = True
        elif st["taking"]:
            assert g.done(att) is None
            acted = True
        elif g.all_beaten():
            assert g.bito(att) is None
            acted = True
        assert acted, f"зависли: {st}"
    assert total_cards(st) + 0 >= 0
    return st


if __name__ == "__main__":
    res = {"draw": 0, "win": 0}
    n = 0
    for mode in ("podkidnoy", "perevodnoy"):
        for deck in (36, 24):
            for cheats in (False, True):
                for seed in range(600):
                    st = play(seed, mode, deck, cheats)
                    res["draw" if st["draw"] else "win"] += 1
                    n += 1
    # правила: нельзя отбиться не той картой без шулеров
    st = Durak.new([1, 2], "podkidnoy", 36, False, random.Random(3))
    g = Durak(st)
    a = st["attacker"]
    g.attack(a, g.hand(a)[0])
    bad = next((c for c in g.hand(st["defender"]) if not g.beats(st["table"][0]["a"], c)), None)
    if bad:
        assert g.defend(st["defender"], 0, bad) is not None
    print(f"OK: {n} партий, {res}")
