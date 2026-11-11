// One palace of the grid (SPEC §2): 5 rows × 3 columns over a trigram watermark.
//   1  score      八神   ○ ♞
//   2             天盘 长生 labels
//   3             九星   天盘 stems
//   4             地盘 长生 labels
//   5  number     八门   地盘 stems
import { PALACE_ELEMENT, TRIGRAM, type EarthStem, type Element, type God, type HeavenStem, type Palace, type PalaceNo, type Stem } from '../engine';
import { cx } from './cx';

const ELEMENT_CLASS: Record<Element, string> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };

/** Every term prints as the engine names it, except 腾蛇: 玄天排盘 prints 螣蛇 (SPEC §6). */
const godText = (god: God): string => (god === '腾蛇' ? '螣蛇' : god);

function Stems({ which, stems }: { which: 'heaven' | 'earth'; stems: (HeavenStem | EarthStem)[] }) {
  return (
    <span className={`stems ${which}`} data-k={which}>
      {stems.map((s, i) => (
        // 击刑 purple wins over 入墓 green when a stem is both (SPEC §3, Q6 default)
        <span key={i} className={cx('stem', s.jiXing ? 'jixing' : s.ruMu && 'rumu', 'riGan' in s && s.riGan && 'rigan')}>
          {s.stem}
        </span>
      ))}
    </span>
  );
}

export function PalaceCell({ p, palace }: { p: PalaceNo; palace: Palace }) {
  return (
    <div className="cell" data-palace={p}>
      <span className={`watermark ${ELEMENT_CLASS[PALACE_ELEMENT[p]]}`} data-k="watermark" aria-hidden="true">
        {TRIGRAM[p]}
      </span>
      <span className="score" data-k="score">{String(palace.score)}</span>
      <span className="god" data-k="god">{godText(palace.god)}</span>
      <span className="marks" data-k="marks">
        {palace.kongWang && <span className="kong">○</span>}
        {palace.horse && <span className="horse">♞</span>}
      </span>
      <span className="stages heaven" data-k="heavenStages">{palace.heavenStages.join(' ')}</span>
      <span className="star" data-k="star">{palace.star}</span>
      <Stems which="heaven" stems={palace.heaven} />
      <span className="stages earth" data-k="earthStages">{palace.earthStages.join(' ')}</span>
      <span className="num" data-k="num">{p}</span>
      <span className={cx('door', palace.menPo && 'menpo')} data-k="door">{palace.door}</span>
      <Stems which="earth" stems={palace.earth} />
    </div>
  );
}

/** 中5: only its number and its 地盘 stem. */
export function CenterCell({ center }: { center: Stem }) {
  return (
    <div className="cell center" data-palace={5}>
      <span className="num" data-k="num">5</span>
      <span className="stems earth" data-k="earth">
        <span className="stem">{center}</span>
      </span>
    </div>
  );
}
