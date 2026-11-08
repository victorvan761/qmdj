// 中 | EN, top right of the teal band on both screens (SPEC §4). Each option is labelled in its own language.
import { LANGS, t, type Lang } from '../i18n';

const LABEL: Record<Lang, string> = { zh: '中', en: 'EN' };

export function LangToggle({ lang, onLang }: { lang: Lang; onLang(lang: Lang): void }) {
  return (
    <div className="lang-toggle" role="group" aria-label={t(lang, 'lang.label')}>
      {LANGS.map((l) => (
        <button key={l} type="button" aria-pressed={l === lang} lang={l === 'zh' ? 'zh-Hans' : 'en'}
          data-cjk-ok={l === 'zh' ? '' : undefined} onClick={() => onLang(l)}>
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
