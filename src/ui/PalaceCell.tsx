// One palace of the grid (SPEC §2): 5 rows × 3 columns over a trigram watermark.
//   1  score      八神   ○ ♞
//   2             天盘 长生 labels
//   3             九星   天盘 stems
//   4             地盘 长生 labels
//   5  number     八门   地盘 stems
import { Fragment } from 'react';
import { PALACE_ELEMENT, TRIGRAM, type EarthStem, type Element, type HeavenStem, type Palace, type PalaceNo, type Stem } from '../engine';
import { door, god, star, stem, stemJoiner, trigram, type Lang } from '../i18n';
import { cx } from './cx';

const ELEMENT_CLASS: Record<Element, string> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };

function Stems({ which, stems, lang }: { which: 'heaven' | 'earth'; stems: (HeavenStem | EarthStem)[]; lang: Lang }) {
  return (
    <span className={`stems ${which}`} data-k={which}>
      {stems.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && stemJoiner(lang) && <span className="joiner">{stemJoiner(lang)}</span>}
          {/* 击刑 purple wins over 入墓 green when a stem is both (SPEC §3, Q6 default) */}
          <span className={cx('stem', s.jiXing ? 'jixing' : s.ruMu && 'rumu', 'riGan' in s && s.riGan && 'rigan')}>
            {stem(lang, s.stem)}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

export function PalaceCell({ p, palace, lang }: { p: PalaceNo; palace: Palace; lang: Lang }) {
  return (
    <div className="cell" data-palace={p}>
      <span className={`watermark ${ELEMENT_CLASS[PALACE_ELEMENT[p]]}`} data-k="watermark" aria-hidden="true">
        {trigram(lang, TRIGRAM[p])}
      </span>
      <span className="score" data-k="score">{String(palace.score)}</span>
      <span className="god" data-k="god">{god(lang, palace.god, 'grid')}</span>
      <span className="marks" data-k="marks">
        {palace.kongWang && <span className="kong">○</span>}
        {palace.horse && <span className="horse">♞</span>}
      </span>
      <span className="stages heaven" data-k="heavenStages" data-cjk-ok="">{palace.heavenStages.join(' ')}</span>
      <span className="star" data-k="star">{star(lang, palace.star, 'grid')}</span>
      <Stems which="heaven" stems={palace.heaven} lang={lang} />
      <span className="stages earth" data-k="earthStages" data-cjk-ok="">{palace.earthStages.join(' ')}</span>
      <span className="num" data-k="num">{p}</span>
      <span className={cx('door', palace.menPo && 'menpo')} data-k="door">{door(lang, palace.door, 'grid')}</span>
      <Stems which="earth" stems={palace.earth} lang={lang} />
    </div>
  );
}

/** 中5: only its number and its 地盘 stem. */
export function CenterCell({ center, lang }: { center: Stem; lang: Lang }) {
  return (
    <div className="cell center" data-palace={5}>
      <span className="num" data-k="num">5</span>
      <span className="stems earth" data-k="earth">
        <span className="stem">{stem(lang, center)}</span>
      </span>
    </div>
  );
}
