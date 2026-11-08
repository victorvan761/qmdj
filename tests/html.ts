// A small parser for react-dom/server's static markup, so UI tests can query rendered text and classes without a
// DOM. React's output is well-formed: every element closed, attributes double-quoted, text and attributes escaped.

/** CJK ideographs, radicals, kana, bopomofo, CJK symbols and punctuation, and full-width forms. */
export const CJK = /[⺀-⿿　-〿぀-ヿ㄀-ㄯ㈀-㋿㐀-䶿一-鿿豈-﫿︰-﹏＀-￯]/;

export interface El {
  tag: string;
  attrs: Record<string, string>;
  children: (El | string)[];
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'", '#39': "'", nbsp: ' ' };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#x27|#39|nbsp);/g, (_, e: string) => ENTITIES[e]);

const TOKEN = /<!--[\s\S]*?-->|<\/([\w-]+)\s*>|<([\w-]+)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g;
const ATTR = /([^\s=]+)(?:="([^"]*)")?/g;

export function parseHtml(html: string): El {
  const root: El = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  for (const m of html.matchAll(TOKEN)) {
    const top = stack[stack.length - 1];
    if (m[1]) {
      const closed = stack.pop();
      if (closed?.tag !== m[1]) throw new Error(`unexpected </${m[1]}>`);
    } else if (m[2]) {
      const attrs: Record<string, string> = {};
      for (const a of m[3].matchAll(ATTR)) attrs[a[1]] = decode(a[2] ?? '');
      const el: El = { tag: m[2], attrs, children: [] };
      top.children.push(el);
      if (!m[4] && !VOID.has(m[2])) stack.push(el);
    } else if (m[5]) {
      top.children.push(decode(m[5]));
    }
  }
  if (stack.length !== 1) throw new Error(`unclosed <${stack[stack.length - 1].tag}>`);
  return root;
}

export const text = (n: El | string): string => (typeof n === 'string' ? n : n.children.map(text).join(''));

export function findAll(scope: El, match: (e: El) => boolean): El[] {
  const out: El[] = [];
  const walk = (e: El) => {
    for (const c of e.children) {
      if (typeof c === 'string') continue;
      if (match(c)) out.push(c);
      walk(c);
    }
  };
  walk(scope);
  return out;
}

/** Exactly one match, or throw. */
export function find(scope: El, match: (e: El) => boolean, what = 'element'): El {
  const all = findAll(scope, match);
  if (all.length !== 1) throw new Error(`expected one ${what}, found ${all.length}`);
  return all[0];
}

export const hasClass = (e: El, c: string): boolean => (e.attrs.class ?? '').split(/\s+/).includes(c);

/** The element with data-k="k" inside scope. */
export const field = (scope: El, k: string): El => find(scope, (e) => e.attrs['data-k'] === k, `data-k="${k}"`);

/** Text nodes in document order, trimmed, without empty ones. */
export function textRuns(n: El | string): string[] {
  if (typeof n === 'string') return n.trim() ? [n.trim()] : [];
  return n.children.flatMap(textRuns);
}
