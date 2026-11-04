"""Reference engine for the 玄天排盘-compatible chart (时家奇门 · 转盘 · 拆补 · 时空 · 寄坤二宫).

Used only to verify the spec's rules against the reference screenshots and to
generate golden fixtures. The production app re-implements the same rules.
"""
from lunar_python import Solar

STEMS = "甲乙丙丁戊己庚辛壬癸"
BRANCHES = "子丑寅卯辰巳午未申酉戌亥"
QIYI = "戊己庚辛壬癸丁丙乙"            # 三奇六仪, laid on the 地盘 in this order
RING = [1, 8, 3, 4, 9, 2, 7, 6]        # outer palaces, clockwise on the south-up grid
HOME_STAR = {1: "天蓬", 8: "天任", 3: "天冲", 4: "天辅", 9: "天英", 2: "天芮", 7: "天柱", 6: "天心", 5: "天禽"}
HOME_DOOR = {1: "休门", 8: "生门", 3: "伤门", 4: "杜门", 9: "景门", 2: "死门", 7: "惊门", 6: "开门"}
GODS = ["值符", "腾蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"]

# 拆补法: 节气 -> (阴/阳, 上元, 中元, 下元)
JU = {
    "冬至": ("阳", 1, 7, 4), "小寒": ("阳", 2, 8, 5), "大寒": ("阳", 3, 9, 6),
    "立春": ("阳", 8, 5, 2), "雨水": ("阳", 9, 6, 3), "惊蛰": ("阳", 1, 7, 4),
    "春分": ("阳", 3, 9, 6), "清明": ("阳", 4, 1, 7), "谷雨": ("阳", 5, 2, 8),
    "立夏": ("阳", 4, 1, 7), "小满": ("阳", 5, 2, 8), "芒种": ("阳", 6, 3, 9),
    "夏至": ("阴", 9, 3, 6), "小暑": ("阴", 8, 2, 5), "大暑": ("阴", 7, 1, 4),
    "立秋": ("阴", 2, 5, 8), "处暑": ("阴", 1, 4, 7), "白露": ("阴", 9, 3, 6),
    "秋分": ("阴", 7, 1, 4), "寒露": ("阴", 6, 9, 3), "霜降": ("阴", 5, 8, 2),
    "立冬": ("阴", 6, 9, 3), "小雪": ("阴", 5, 8, 2), "大雪": ("阴", 4, 7, 1),
}
YUAN_NAMES = ["上元", "中元", "下元"]

BRANCH_PALACE = {"子": 1, "丑": 8, "寅": 8, "卯": 3, "辰": 4, "巳": 4, "午": 9, "未": 2, "申": 2, "酉": 7, "戌": 6, "亥": 6}
# order in which the gray 长生 labels are printed (left-to-right position of the branch on the grid)
PALACE_BRANCHES = {1: "子", 8: "寅丑", 3: "卯", 4: "辰巳", 9: "午", 2: "未申", 7: "酉", 6: "亥戌"}
HORSE = {**dict.fromkeys("申子辰", "寅"), **dict.fromkeys("寅午戌", "申"),
         **dict.fromkeys("巳酉丑", "亥"), **dict.fromkeys("亥卯未", "巳")}
JIXING = {"戊": 3, "己": 2, "庚": 8, "辛": 9, "壬": 4, "癸": 4}             # 六仪击刑
TOMB = {"乙": 6, "丙": 6, "丁": 8, "戊": 6, "己": 8, "庚": 8, "辛": 4, "壬": 4, "癸": 2}  # 入墓
CHANGSHENG_START = {"甲": "亥", "乙": "午", "丙": "寅", "丁": "酉", "戊": "寅", "己": "酉",
                    "庚": "巳", "辛": "子", "壬": "申", "癸": "卯"}
STAGES = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"]
STAGE_SHORT = ["长", "沐", "冠", "临", "旺", "衰", "病", "死", "墓", "绝", "胎", "养"]
DOOR_ELEMENT = {"休门": "水", "生门": "土", "伤门": "木", "杜门": "木", "景门": "火", "死门": "土", "惊门": "金", "开门": "金"}
PALACE_ELEMENT = {1: "水", 2: "土", 3: "木", 4: "木", 6: "金", 7: "金", 8: "土", 9: "火"}
KE = {"木": "土", "土": "水", "水": "火", "火": "金", "金": "木"}  # X 克 KE[X]


def idx60(gz):
    s, b = STEMS.index(gz[0]), BRANCHES.index(gz[1])
    return next(n for n in range(60) if n % 10 == s and n % 12 == b)


def gz60(n):
    return STEMS[n % 10] + BRANCHES[n % 12]


def stage(stem, branch):
    start = BRANCHES.index(CHANGSHENG_START[stem])
    b = BRANCHES.index(branch)
    yang = STEMS.index(stem) % 2 == 0
    return (b - start) % 12 if yang else (start - b) % 12


def ring_shift(p, k):
    return RING[(RING.index(p) + k) % 8]


def chart(y, mo, d, h, mi, s=0, zi_rollover_23=True, term_rule="exact"):
    """term_rule="exact": 节气, 年柱, 月柱 switch at the exact 节气 instant (spec default).
    term_rule="day": they switch at 00:00 of the 节气 day (alternative, for open-question tests only)."""
    lunar = Solar.fromYmdHms(y, mo, d, h, mi, s).getLunar()
    exact = term_rule == "exact"
    pillars = [lunar.getYearInGanZhiExact() if exact else lunar.getYearInGanZhiByLiChun(),
               lunar.getMonthInGanZhiExact() if exact else lunar.getMonthInGanZhi(),
               lunar.getDayInGanZhiExact() if zi_rollover_23 else lunar.getDayInGanZhiExact2(),
               lunar.getTimeInGanZhi()]
    day_gz, hour_gz = pillars[2], pillars[3]

    # 节气 and 元 from the day's 符头
    jq = lunar.getPrevJieQi(not exact)
    nxt = lunar.getNextJieQi(not exact)
    term = jq.getName()
    dn = idx60(day_gz)
    futou = gz60(dn - (dn % 10) % 5)
    yuan = {"子": 0, "午": 0, "卯": 0, "酉": 0, "寅": 1, "申": 1, "巳": 1, "亥": 1}.get(futou[1], 2)
    dun, *nums = JU[term]
    ju = nums[yuan]
    yang = dun == "阳"

    # 地盘
    earth = {}
    for i, stem in enumerate(QIYI):
        p = ((ju - 1 + i) % 9) + 1 if yang else ((ju - 1 - i) % 9) + 1
        earth[p] = stem
    palace_of = {v: k for k, v in earth.items()}

    # 旬首 / 值符 / 值使
    hn = idx60(hour_gz)
    xun = hn // 10
    xun_yi = QIYI[xun]
    xun_label = gz60(xun * 10) + xun_yi
    p0 = palace_of[xun_yi]
    home = 2 if p0 == 5 else p0
    zhifu_star = HOME_STAR[p0]
    zhishi_door = HOME_DOOR[home]
    empty = [BRANCHES[(xun * 10 + 10) % 12], BRANCHES[(xun * 10 + 11) % 12]]

    # 天盘 (stars rotate as a ring; 天禽 rides with 天芮)
    hour_stem = hour_gz[0] if hour_gz[0] != "甲" else xun_yi
    target = palace_of[hour_stem]
    target = 2 if target == 5 else target
    k = RING.index(target) - RING.index(home)
    star_at, heaven_at = {}, {}
    for h0 in RING:
        q = ring_shift(h0, k)
        star_at[q] = "芮禽" if h0 == 2 else HOME_STAR[h0]
        heaven_at[q] = earth[5] + earth[2] if h0 == 2 else earth[h0]

    # 八门 (值使 walks the 洛书 order 1..9 incl. 5, 阳顺阴逆, from the 旬首's own palace)
    steps = hn % 10
    pd = ((p0 - 1 + steps) % 9) + 1 if yang else ((p0 - 1 - steps) % 9) + 1
    door_landing = pd
    pd = 2 if pd == 5 else pd
    kd = RING.index(pd) - RING.index(home)
    door_at = {ring_shift(h0, kd): HOME_DOOR[h0] for h0 in RING}

    # 八神 (值符 god where the 值符 star landed; 阳顺阴逆)
    god_at = {}
    for i, g in enumerate(GODS):
        god_at[RING[(RING.index(target) + (i if yang else -i)) % 8]] = g

    horse_palace = BRANCH_PALACE[HORSE[hour_gz[1]]]
    empty_palaces = {BRANCH_PALACE[b] for b in empty}
    day_stem = day_gz[0]

    palaces = {}
    for p in RING:
        tp = heaven_at[p]
        dp = (earth[5] + earth[2]) if p == 2 else earth[p]
        door = door_at[p]
        menpo = KE[DOOR_ELEMENT[door]] == PALACE_ELEMENT[p]
        tp_flags = [{"stem": c,
                     "jixing": JIXING.get(c) == p,
                     "rumu": TOMB.get(c) == p,
                     "self": c == day_stem and day_stem != "甲"} for c in tp]
        dp_flags = [{"stem": c, "jixing": JIXING.get(c) == p, "rumu": TOMB.get(c) == p} for c in dp]
        n = int(p in empty_palaces) + int(menpo) + sum(int(f["jixing"]) + int(f["rumu"]) for f in tp_flags)
        palaces[p] = {
            "palace": p,
            "god": god_at[p],
            "star": star_at[p],
            "door": door,
            "heaven": tp_flags,
            "earth": dp_flags,
            "heavenStages": [[STAGE_SHORT[stage(c, b)] for b in PALACE_BRANCHES[p]] for c in tp],
            "earthStages": [[STAGE_SHORT[stage(c, b)] for b in PALACE_BRANCHES[p]] for c in dp],
            "kongWang": p in empty_palaces,
            "horse": p == horse_palace,
            "menPo": menpo,
            "score": 100 / (2 ** n),
        }

    lunar_str = f"{lunar.getYearInGanZhi()}年 {lunar.getMonthInChinese()}月{lunar.getDayInChinese()}"
    lunar_parts = {"yearGanZhi": lunar.getYearInGanZhi(), "month": abs(lunar.getMonth()),
                   "leap": lunar.getMonth() < 0, "day": lunar.getDay()}
    return {
        "input": f"{y:04d}-{mo:02d}-{d:02d} {h:02d}:{mi:02d}:{s:02d}",
        "lunar": lunar_str, "lunarParts": lunar_parts,
        "pillars": pillars,
        "term": {"name": term, "start": jq.getSolar().toYmdHms(), "next": nxt.getName(), "nextStart": nxt.getSolar().toYmdHms()},
        "futou": futou, "yuan": YUAN_NAMES[yuan],
        "ju": f"{dun}遁{ju}局", "dun": dun, "juNumber": ju,
        "xunShou": xun_label, "zhiFu": "芮禽" if zhifu_star == "天禽" else zhifu_star, "zhiShi": zhishi_door,
        "zhiFuPalace": target, "zhiShiPalace": pd, "zhiShiLanding": door_landing,
        "kongWang": empty, "horse": HORSE[hour_gz[1]],
        "center": earth[5],
        "palaces": palaces,
    }


def render_palace(pl):
    """Compact string matching the transcription format used in verify.py."""
    def stems(flags, heaven):
        out = ""
        for f in flags:
            out += f["stem"]
            if f["rumu"]: out += "{g}"
            if f["jixing"]: out += "{p}"
            if heaven and f["self"]: out += "{s}"
        return out
    marks = ("○" if pl["kongWang"] else "") + ("♞" if pl["horse"] else "")
    score = ("%g" % pl["score"])
    return "|".join([
        score, pl["god"], marks, pl["star"], stems(pl["heaven"], True),
        " ".join("".join(x) for x in pl["heavenStages"]),
        pl["door"] + ("{r}" if pl["menPo"] else ""), stems(pl["earth"], False),
        " ".join("".join(x) for x in pl["earthStages"]),
    ])
