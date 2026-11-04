import { Solar } from 'lunar-typescript';
import { readFileSync } from 'node:fs';
const fx = JSON.parse(readFileSync(new URL('../../fixtures/golden_charts.json', import.meta.url), 'utf8'));
let bad = 0;
for (const c of fx.cases) {
  const [d, t] = c.input.split('T'); const [y, m, dd] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number);
  const l = Solar.fromYmdHms(y, m, dd, h, mi, 0).getLunar();
  const jq = l.getPrevJieQi(false), nx = l.getNextJieQi(false);
  const got = { year: l.getYearInGanZhiExact(), month: l.getMonthInGanZhiExact(), day: l.getDayInGanZhiExact(), hour: l.getTimeInGanZhi(),
    lunar: `${l.getYearInGanZhi()}年 ${l.getMonthInChinese()}月${l.getDayInChinese()}`,
    current: jq.getName(), currentStart: jq.getSolar().toYmdHms(), next: nx.getName(), nextStart: nx.getSolar().toYmdHms() };
  const exp = { ...c.header.pillars, lunar: c.header.lunar, current: c.jieqi.current, currentStart: c.jieqi.currentStart, next: c.jieqi.next, nextStart: c.jieqi.nextStart };
  for (const k of Object.keys(exp)) if (got[k] !== exp[k]) { bad++; console.log(c.id, k, got[k], '!=', exp[k]); }
}
console.log(`${fx.cases.length} cases, ${bad} calendar mismatches vs lunar-typescript`);
