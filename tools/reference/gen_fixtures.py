"""Write fixtures/golden_charts.json from the reference engine.

R* cases: the six 玄天排盘 screenshots (engine output is identical to the transcription; verify.py proves it).
D* cases: edge cases computed with the spec's default rules, not yet confirmed in 玄天排盘.
"""
import json
from pathlib import Path
from engine import chart

CASES = [
    ("R1", (1996, 6, 20, 18, 16), True, "Reference screenshot", None),
    ("R2", (1960, 8, 29, 6, 5), True, "Reference screenshot", None),
    ("R3", (1960, 7, 19, 7, 32), True, "Reference screenshot (闰六月 year, regular 六月)", None),
    ("R4", (1991, 11, 9, 9, 5), True, "Reference screenshot", None),
    ("R5", (1998, 3, 18, 11, 30), True, "Reference screenshot (甲 day: no 日干 square)", None),
    ("R6", (1990, 8, 17, 2, 10), True, "Reference screenshot (旬首 in 中5: 值符 芮禽, 值使 死门)", None),
    ("D1", (2026, 11, 4, 8, 0), False, "甲 hour → 伏吟: stars, 天盘 stems and doors all at home", None),
    ("D2", (2026, 11, 4, 16, 0), False, "Hour stem 戊 sits in 中5 → 值符 天蓬 moves to 坤2", None),
    ("D3", (2026, 11, 4, 0, 0), False, "值使 count lands on 5 → 死门 stays in 坤2", None),
    ("D4", (2026, 11, 4, 6, 0), False, "天盘 庚 in 艮8 is both 击刑 and 入墓 → counted twice (score 25)", "Q6"),
    ("D5", (2026, 11, 4, 4, 0), False, "巽4 stacks 空亡, 门迫, 击刑, 入墓 → score 6.25", "Q6"),
    ("D6", (2025, 8, 1, 12, 0), False, "Leap month: 阴历 shows 闰六月", None),
    ("D7", (2026, 11, 5, 23, 30), False, "23:00 starts the next day: 日柱 甲申, 阴遁8局", "Q1"),
    ("D8", (2026, 11, 7, 16, 30), False, "Before 立冬 (17:52): still 霜降, 月柱 戊戌", "Q2"),
    ("D9", (2026, 11, 7, 19, 30), False, "After 立冬: 月柱 己亥, 阴遁9局", "Q2"),
    ("D10", (2027, 2, 4, 8, 30), False, "Before 立春 (09:46): 年柱 丙午, 大寒", "Q3"),
    ("D11", (2027, 2, 4, 10, 30), False, "After 立春: 年柱 丁未, 阳遁5局; 阴历 still 丙午年 腊月", "Q3"),
    ("D12", (2027, 2, 3, 20, 0), False, "Input read as Beijing time: 大寒, 阳遁3局", "Q4"),
    ("D13", (1990, 8, 17, 3, 30), False, "No DST adjustment: 时柱 丙寅", "Q5"),
]


def palace_out(pl):
    return {
        "god": pl["god"], "star": pl["star"], "door": pl["door"], "menPo": pl["menPo"],
        "heaven": [{"stem": f["stem"], "jiXing": f["jixing"], "ruMu": f["rumu"], "riGan": f["self"]} for f in pl["heaven"]],
        "earth": [{"stem": f["stem"], "jiXing": f["jixing"], "ruMu": f["rumu"]} for f in pl["earth"]],
        "heavenStages": ["".join(s) for s in pl["heavenStages"]],
        "earthStages": ["".join(s) for s in pl["earthStages"]],
        "kongWang": pl["kongWang"], "horse": pl["horse"], "score": pl["score"],
    }


cases = []
for cid, dt, confirmed, note, q in CASES:
    c = chart(*dt)
    y, m, d, h, mi = dt
    cases.append({
        "id": cid,
        "input": f"{y:04d}-{m:02d}-{d:02d}T{h:02d}:{mi:02d}",
        "confirmedInReference": confirmed,
        "note": note,
        "openQuestion": q,
        "header": {
            "solar": c["input"], "lunar": c["lunar"],
            "pillars": dict(zip(["year", "month", "day", "hour"], c["pillars"])),
            "ju": c["ju"], "xunShou": c["xunShou"], "zhiFu": c["zhiFu"], "zhiShi": c["zhiShi"],
            "juShi": "转盘-拆补-寄坤二宫",
        },
        "lunarParts": c["lunarParts"],
        "jieqi": {"current": c["term"]["name"], "currentStart": c["term"]["start"],
                  "next": c["term"]["next"], "nextStart": c["term"]["nextStart"],
                  "yuan": c["yuan"], "fuTou": c["futou"]},
        "derived": {"dun": c["dun"], "juNumber": c["juNumber"], "zhiFuPalace": c["zhiFuPalace"],
                    "zhiShiPalace": c["zhiShiPalace"], "kongWangBranches": c["kongWang"], "horseBranch": c["horse"]},
        "center": c["center"],
        "palaces": {str(p): palace_out(c["palaces"][p]) for p in [4, 9, 2, 3, 7, 8, 1, 6]},
    })

out = {
    "meta": {
        "description": "Golden charts for the 玄天排盘-compatible 奇门遁甲 app. R* = transcribed from reference screenshots; D* = computed with the spec's default rules (unconfirmed).",
        "settings": {"method": "转盘", "dingJu": "拆补", "kongWang": "时空", "centerLodge": "寄坤二宫",
                     "ziHour": "23:00 starts the next day", "termSwitch": "exact 节气 instant",
                     "clock": "input is Beijing wall-clock time (UTC+8), no DST or 真太阳时"},
        "palaceOrderOnScreen": [4, 9, 2, 3, 5, 7, 8, 1, 6],
        "stemOrderInSlot": "for two-stem slots, the 中5 stem comes first, then the 坤2 stem",
        "stagesOrder": "per palace branch order: 1子 8寅丑 3卯 4辰巳 9午 2未申 7酉 6亥戌",
        "calendarLibrary": "lunar_python 1.4.8 (same algorithm and output as lunar-typescript 1.8.6)",
    },
    "cases": cases,
}
OUT = Path(__file__).resolve().parents[2] / "fixtures" / "golden_charts.json"
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"wrote {len(cases)} cases")
