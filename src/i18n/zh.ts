// 简体中文 UI strings (SPEC §4). Engine IDs are already Chinese, so the glossary only lists display forms that differ.

export const zh = {
  'app.title': '奇门排盘',
  'input.date': '日期选择',
  'input.method': '排盘方式',
  'input.method.value': '转盘',
  'input.dingju': '定局',
  'input.dingju.value': '拆补法',
  'input.void': '标记旬空',
  'input.void.value': '时空',
  'input.lodge': '中宫寄宫',
  'input.lodge.value': '寄坤二宫',
  'input.cast': '点击起局',
  'input.reset': '重置时间',
  'chart.back': '返回',
  'chart.title': '排盘结果',
  'chart.solar': '阳历',
  'chart.lunar': '阴历',
  'chart.year': '年',
  'chart.month': '月',
  'chart.day': '日',
  'chart.hour': '时',
  'chart.ju': '选局',
  'chart.xun': '旬首',
  'chart.zhifu': '值符',
  'chart.zhishi': '值使',
  'chart.jushi': '局式',
  'chart.terms.show': '点击显示节气',
  'chart.terms.hide': '点击隐藏节气',
  'terms.current': '当前节气',
  'terms.next': '下一节气',
  'terms.yuan': '元',
  'terms.futou': '符头',
  footer: '排盘内容仅供娱乐，请客观科学看待，抵制封建迷信',
  colon: '：',
  'lang.label': '语言',
} as const;

export type UiKey = keyof typeof zh;

/** Display forms that differ from the engine ID. 玄天排盘 prints 螣蛇 where SPEC §6 and the fixtures say 腾蛇. */
export const ZH_DISPLAY: Readonly<Record<string, string>> = { 腾蛇: '螣蛇' };
