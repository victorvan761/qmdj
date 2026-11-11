// The chart screen (SPEC §2): header card, 节气 panel, the nine palaces and the disclaimer.
import type { ReactNode, Ref } from 'react';
import { GRID, type Chart } from '../engine';
import { BackIcon, DoubleChevron } from './icons';
import { CenterCell, PalaceCell } from './PalaceCell';

export interface ChartScreenProps {
  chart: Chart;
  termsOpen: boolean;
  /** The screen's heading, for focus to move to after a cast */
  headingRef?: Ref<HTMLHeadingElement>;
  onBack(): void;
  onToggleTerms(): void;
}

const PILLARS = [['year', '年'], ['month', '月'], ['day', '日'], ['hour', '时']] as const;

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

        <div className="grid">
          {GRID.flat().map((p) =>
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
