// The chart screen (SPEC §2): the header card, the 节气 panel, the nine palaces and the disclaimer.
import type { ReactNode, Ref } from 'react';
import {
  GRID, PALACE, type Chart, type EarthStem, type HeavenStem, type Palace, type PalaceNo, type Stem, type WuXing,
} from './engine';

function BackIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
      <path d="M15 4 7 12l8 8" />
    </svg>
  );
}

/** ⌄⌄ pointing down (collapsed) or up (expanded). */
function DoubleChevron({ up }: { up: boolean }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"
      style={up ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="m5 6 7 6 7-6M5 12l7 6 7-6" />
    </svg>
  );
}

// ── The header card and the 节气 panel ───────────────────────────────────────────────────────────────────────

const PILLARS = [['year', '年'], ['month', '月'], ['day', '日'], ['hour', '时']] as const;

/** A label and its value, side by side. */
function Pair({ label, k, children, wide = false }: { label: string; k: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'pair wide' : 'pair'}>
      <dt>{label}</dt>
      <dd data-k={k}>{children}</dd>
    </div>
  );
}

function TermsPanel({ chart }: { chart: Chart }) {
  const j = chart.jieqi;
  return (
    <dl className="terms" data-k="terms">
      <Pair label="当前节气：" k="current">{`${j.current} ${j.currentStart}`}</Pair>
      <Pair label="下一节气：" k="next">{`${j.next} ${j.nextStart}`}</Pair>
      <Pair label="元：" k="yuan">{j.yuan}</Pair>
      <Pair label="符头：" k="fuTou">{j.fuTou}</Pair>
    </dl>
  );
}

// ── A palace of the grid: 5 rows × 3 columns over a trigram watermark ────────────────────────────────────────
//   1  score      八神   ○ ♞
//   2             天盘 长生 labels
//   3             九星   天盘 stems
//   4             地盘 长生 labels
//   5  number     八门   地盘 stems

/** The watermark is tinted by the palace's element. */
const TINT: Record<WuXing, string> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };

function Stems({ plate, stems }: { plate: 'heaven' | 'earth'; stems: (HeavenStem | EarthStem)[] }) {
  return (
    <span className={`stems ${plate}`} data-k={plate}>
      {stems.map((s, i) => {
        // 击刑 purple wins over 入墓 green when a stem is both (SPEC §3, Q6 default).
        const color = s.jiXing ? ' jixing' : s.ruMu ? ' rumu' : '';
        const square = 'riGan' in s && s.riGan ? ' rigan' : '';
        return <span key={i} className={`stem${color}${square}`}>{s.stem}</span>;
      })}
    </span>
  );
}

function PalaceCell({ p, palace }: { p: PalaceNo; palace: Palace }) {
  return (
    <div className="cell" data-palace={p}>
      <span className={`watermark ${TINT[PALACE[p].element]}`} data-k="watermark" aria-hidden="true">
        {PALACE[p].trigram}
      </span>
      <span className="score" data-k="score">{String(palace.score)}</span>
      {/* Every term prints as the engine names it, except 腾蛇: 玄天排盘 prints 螣蛇 (SPEC §6). */}
      <span className="god" data-k="god">{palace.god === '腾蛇' ? '螣蛇' : palace.god}</span>
      <span className="marks" data-k="marks">
        {palace.kongWang && <span className="kong">○</span>}
        {palace.horse && <span className="horse">♞</span>}
      </span>
      <span className="stages heaven" data-k="heavenStages">{palace.heavenStages.join(' ')}</span>
      <span className="star" data-k="star">{palace.star}</span>
      <Stems plate="heaven" stems={palace.heaven} />
      <span className="stages earth" data-k="earthStages">{palace.earthStages.join(' ')}</span>
      <span className="num" data-k="num">{p}</span>
      <span className={palace.menPo ? 'door menpo' : 'door'} data-k="door">{palace.door}</span>
      <Stems plate="earth" stems={palace.earth} />
    </div>
  );
}

/** 中5: only its number and its 地盘 stem. */
function CenterCell({ center }: { center: Stem }) {
  return (
    <div className="cell center" data-palace={5}>
      <span className="num" data-k="num">5</span>
      <span className="stems earth" data-k="earth">
        <span className="stem">{center}</span>
      </span>
    </div>
  );
}

// ── The screen ───────────────────────────────────────────────────────────────────────────────────────────────

export interface ChartScreenProps {
  chart: Chart;
  /** Whether the 节气 panel is open */
  termsOpen: boolean;
  /** The screen's heading, for focus to move to after a cast */
  headingRef?: Ref<HTMLHeadingElement>;
  onBack(): void;
  onToggleTerms(): void;
}

export function ChartScreen({ chart, termsOpen, headingRef, onBack, onToggleTerms }: ChartScreenProps) {
  const h = chart.header;
  return (
    <div className="screen chart-screen">
      <header className="band">
        <button type="button" className="back" onClick={onBack} aria-label="返回">
          <BackIcon />
        </button>
      </header>

      <main className="chart-main">
        {/* For screen readers only: 玄天排盘 shows no title here */}
        <h1 className="visually-hidden" tabIndex={-1} ref={headingRef}>排盘结果</h1>
        {/* On a wide screen held sideways this column sits beside the grid; otherwise above it. */}
        <div className="chart-side">
          <section className="card info-card" data-k="info">
            <table className="info">
              <tbody>
                <tr>
                  <th scope="row">阳历</th>
                  <td colSpan={3} data-k="solar">{h.solar}</td>
                </tr>
                <tr>
                  <th scope="row">阴历</th>
                  <td colSpan={3} data-k="lunar">{h.lunar}</td>
                </tr>
                <tr className="pillar-head">
                  {PILLARS.map(([k, label]) => <th key={k} scope="col">{label}</th>)}
                </tr>
                <tr className="pillar">
                  {PILLARS.map(([k]) => <td key={k} data-k={`${k}Stem`}>{h.pillars[k][0]}</td>)}
                </tr>
                <tr className="pillar">
                  {PILLARS.map(([k]) => <td key={k} data-k={`${k}Branch`}>{h.pillars[k][1]}</td>)}
                </tr>
              </tbody>
            </table>
            <dl className="summary">
              <Pair label="选局：" k="ju">{h.ju}</Pair>
              <Pair label="旬首：" k="xun">{h.xunShou}</Pair>
              <Pair label="值符：" k="zhiFu">{h.zhiFu}</Pair>
              <Pair label="值使：" k="zhiShi">{h.zhiShi}</Pair>
              <Pair label="局式：" k="juShi" wide>{h.juShi}</Pair>
            </dl>
          </section>

          <button type="button" className="terms-toggle" aria-expanded={termsOpen} onClick={onToggleTerms}>
            <DoubleChevron up={termsOpen} />
            <span data-k="termsToggle">{termsOpen ? '点击隐藏节气' : '点击显示节气'}</span>
            <DoubleChevron up={termsOpen} />
          </button>
          {termsOpen && <TermsPanel chart={chart} />}
        </div>

        <div className="grid">
          {GRID.map((p) =>
            p === 5
              ? <CenterCell key={p} center={chart.center} />
              : <PalaceCell key={p} p={p} palace={chart.palaces[p]} />,
          )}
        </div>

        <footer className="disclaimer" data-k="footer">排盘内容仅供娱乐，请客观科学看待，抵制封建迷信</footer>
      </main>
    </div>
  );
}
