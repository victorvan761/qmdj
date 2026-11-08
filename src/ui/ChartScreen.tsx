// The chart screen (SPEC §2): header card, 节气 panel, the nine palaces and the disclaimer.
import type { ReactNode, Ref } from 'react';
import { GRID, type Branch, type Chart, type Stem } from '../engine';
import {
  branch, door, ganZhi, jieqi, juShiText, juText, lunarText, star, stem, t, xunText, yuan, type Lang, type UiKey,
} from '../i18n';
import { BackIcon, DoubleChevron } from './icons';
import { LangToggle } from './LangToggle';
import { CenterCell, PalaceCell } from './PalaceCell';

export interface ChartScreenProps {
  lang: Lang;
  chart: Chart;
  termsOpen: boolean;
  /** The screen's heading, for focus to move to after a cast */
  headingRef?: Ref<HTMLHeadingElement>;
  onBack(): void;
  onToggleTerms(): void;
  onLang(lang: Lang): void;
}

const PILLARS = ['year', 'month', 'day', 'hour'] as const;

/** 'label：' as one string, so it renders as one text run. */
const labelOf = (lang: Lang, key: UiKey) => `${t(lang, key)}${t(lang, 'colon')}`;

function Pair({ label, k, children, wide = false }: { label: string; k: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'pair wide' : 'pair'}>
      <dt>{label}</dt>
      <dd data-k={k}>{children}</dd>
    </div>
  );
}

function TermsPanel({ lang, chart }: { lang: Lang; chart: Chart }) {
  const j = chart.jieqi;
  return (
    <dl className="terms" data-k="terms">
      <Pair label={labelOf(lang, 'terms.current')} k="current">{`${jieqi(lang, j.current)} ${j.currentStart}`}</Pair>
      <Pair label={labelOf(lang, 'terms.next')} k="next">{`${jieqi(lang, j.next)} ${j.nextStart}`}</Pair>
      <Pair label={labelOf(lang, 'terms.yuan')} k="yuan">{yuan(lang, j.yuan)}</Pair>
      <Pair label={labelOf(lang, 'terms.futou')} k="fuTou">{ganZhi(lang, j.fuTou)}</Pair>
    </dl>
  );
}

export function ChartScreen({ lang, chart, termsOpen, headingRef, onBack, onToggleTerms, onLang }: ChartScreenProps) {
  const h = chart.header;
  return (
    <div className={`screen chart-screen lang-${lang}`}>
      <header className="band">
        <button type="button" className="back" onClick={onBack} aria-label={t(lang, 'chart.back')}>
          <BackIcon />
        </button>
        <LangToggle lang={lang} onLang={onLang} />
      </header>

      <main className="chart-main">
        {/* For screen readers only: 玄天排盘 shows no title here */}
        <h1 className="visually-hidden" tabIndex={-1} ref={headingRef}>{t(lang, 'chart.title')}</h1>
        <section className="card info-card" data-k="info">
          <table className="info">
            <tbody>
              <tr>
                <th scope="row">{t(lang, 'chart.solar')}</th>
                <td colSpan={3} data-k="solar">{h.solar}</td>
              </tr>
              <tr>
                <th scope="row">{t(lang, 'chart.lunar')}</th>
                <td colSpan={3} data-k="lunar">{lunarText(lang, chart)}</td>
              </tr>
              <tr className="pillar-head">
                {PILLARS.map((k) => <th key={k} scope="col">{t(lang, `chart.${k}`)}</th>)}
              </tr>
              <tr className="pillar">
                {PILLARS.map((k) => <td key={k} data-k={`${k}Stem`}>{stem(lang, h.pillars[k][0] as Stem)}</td>)}
              </tr>
              <tr className="pillar">
                {PILLARS.map((k) => <td key={k} data-k={`${k}Branch`}>{branch(lang, h.pillars[k][1] as Branch)}</td>)}
              </tr>
            </tbody>
          </table>
          <dl className="summary">
            <Pair label={labelOf(lang, 'chart.ju')} k="ju">{juText(lang, chart)}</Pair>
            <Pair label={labelOf(lang, 'chart.xun')} k="xun">{xunText(lang, chart)}</Pair>
            <Pair label={labelOf(lang, 'chart.zhifu')} k="zhiFu">{star(lang, h.zhiFu, 'full')}</Pair>
            <Pair label={labelOf(lang, 'chart.zhishi')} k="zhiShi">{door(lang, h.zhiShi, 'full')}</Pair>
            <Pair label={labelOf(lang, 'chart.jushi')} k="juShi" wide>{juShiText(lang, chart)}</Pair>
          </dl>
        </section>

        <button type="button" className="terms-toggle" aria-expanded={termsOpen} onClick={onToggleTerms}>
          <DoubleChevron up={termsOpen} />
          <span data-k="termsToggle">{t(lang, termsOpen ? 'chart.terms.hide' : 'chart.terms.show')}</span>
          <DoubleChevron up={termsOpen} />
        </button>
        {termsOpen && <TermsPanel lang={lang} chart={chart} />}

        <div className="grid">
          {GRID.flat().map((p) =>
            p === 5
              ? <CenterCell key={p} center={chart.center} lang={lang} />
              : <PalaceCell key={p} p={p} palace={chart.palaces[p]} lang={lang} />,
          )}
        </div>

        <footer className="disclaimer" data-k="footer">{t(lang, 'footer')}</footer>
      </main>
    </div>
  );
}
