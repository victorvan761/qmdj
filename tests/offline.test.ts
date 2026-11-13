// SPEC §11: the app installs to the home screen and opens with no network. The service worker runs here in a
// fake worker scope (fake caches and network), and the real build is checked for a complete offline copy.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { runInNewContext } from 'node:vm';
import { build } from 'vite';
import { describe, expect, it, vi } from 'vitest';
import { writeServiceWorker } from '../vite.config';

const ROOT = join(import.meta.dirname, '..');
const WORKER = readFileSync(join(ROOT, 'src/sw.js'), 'utf8');
const BASE = 'https://example.github.io/qmdj/';
const FILES = ['./', './assets/index-abc.js', './icon-192.png'];
/** The cache that holds one version of the copy at BASE. */
const copy = (version: string, scope = BASE) => `qimen ${scope} ${version}`;

type Init = { method?: string; mode?: string; cache?: string; origin?: string };

/** Enough of the Fetch API's Request for sw.js: relative URLs resolve against the worker's folder. */
class FakeRequest {
  readonly url: string;
  readonly method: string;
  readonly mode: string;
  readonly cache: string;
  readonly origin: string | undefined; // the Origin header
  constructor(input: string | FakeRequest, init: Init = {}) {
    this.url = new URL(typeof input === 'string' ? input : input.url, BASE).href;
    this.method = init.method ?? 'GET';
    this.mode = init.mode ?? 'cors';
    this.cache = init.cache ?? 'default';
    this.origin = init.origin;
  }
}

type Event = { request?: FakeRequest; waitUntil(p: Promise<unknown>): void; respondWith(p: Promise<unknown>): void };

/**
 * Loads a service worker into a fake worker scope: src/sw.js as version 'v2' keeping FILES, or a built sw.js given
 * as `source`. Responses are plain strings; `online` switches the network. Like `vite preview`, the server sends
 * `Vary: Origin`, so a lookup misses when the Origin headers differ, unless it passes ignoreVary.
 */
function worker(existingCaches: string[] = [], source?: string) {
  type Entry = { body: string; origin: string | undefined };
  const stores = new Map<string, Map<string, Entry>>(existingCaches.map((name) => [name, new Map()]));
  const key = (r: string | FakeRequest, ignoreSearch = false) => {
    const url = new URL(typeof r === 'string' ? r : r.url, BASE);
    if (ignoreSearch) url.search = '';
    return url.href;
  };
  const net = { online: true, failing: new Set<string>(), fetched: [] as FakeRequest[] };
  const fetch = async (r: FakeRequest) => {
    net.fetched.push(r);
    if (!net.online || net.failing.has(r.url)) throw new TypeError('network down');
    return `network: ${r.url}`;
  };
  const caches = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        async addAll(requests: FakeRequest[]) {
          const bodies = await Promise.all(requests.map(fetch)); // all or nothing, like the real Cache
          requests.forEach((r, i) => store.set(key(r), { body: bodies[i]!, origin: r.origin }));
        },
        async match(r: string | FakeRequest, options?: { ignoreSearch?: boolean; ignoreVary?: boolean }) {
          const entry = store.get(key(r, options?.ignoreSearch));
          const origin = typeof r === 'string' ? undefined : r.origin;
          return entry && (options?.ignoreVary || entry.origin === origin) ? entry.body : undefined;
        },
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  const handlers: Record<string, (e: Event) => void> = {};
  const self = {
    location: new URL('sw.js', BASE),
    registration: { scope: BASE },
    addEventListener: (type: string, fn: (e: Event) => void) => (handlers[type] = fn),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  const scope = { self, caches, fetch, Request: FakeRequest, URL };
  // The build writes VERSION and FILES in front of src/sw.js; here the scope supplies them.
  runInNewContext(source ?? WORKER, source ? scope : { ...scope, VERSION: 'v2', FILES });

  /** Fires an event; resolves to what the worker answered with, or undefined when it let the request through. */
  async function fire(type: string, request?: FakeRequest): Promise<unknown> {
    let waited: Promise<unknown> | undefined;
    let answer: Promise<unknown> | undefined;
    handlers[type]!({ request, waitUntil: (p) => (waited = p), respondWith: (p) => (answer = p) });
    await waited;
    return answer;
  }
  // A page's own subresources: index.html loads its script and stylesheet with `crossorigin`, so they carry Origin.
  const get = (url: string, mode = 'cors') =>
    fire('fetch', new FakeRequest(url, { mode, origin: mode === 'navigate' ? undefined : new URL(BASE).origin }));
  return { stores, net, self, fire, get };
}

describe('sw.js · the offline copy', () => {
  it('install downloads every file past the HTTP cache, then waits for the next launch', async () => {
    const w = worker();
    await w.fire('install');
    expect(w.net.fetched.map((r) => r.url)).toEqual(FILES.map((f) => new URL(f, BASE).href));
    expect(w.net.fetched.every((r) => r.cache === 'reload')).toBe(true);
    expect(w.stores.get(copy('v2'))?.size).toBe(FILES.length);
    // Taking over now would let activate delete the files of a page that is still open.
    expect(w.self.skipWaiting).not.toHaveBeenCalled();
  });

  it('a failed download fails the install, so the previous copy stays in charge', async () => {
    const w = worker([copy('v1')]);
    w.net.failing.add(`${BASE}assets/index-abc.js`);
    await expect(w.fire('install')).rejects.toThrow('network down');
    expect(w.stores.has(copy('v1'))).toBe(true);
  });

  it('activate deletes older copies of this app only, not other sites on the same origin', async () => {
    // Other Pages sites of the same GitHub user, including one in a subfolder of this one.
    const others = [copy('v1', 'https://example.github.io/qmdj-staging/'), copy('v1', `${BASE}beta/`), 'other-app'];
    const w = worker([copy('v1'), ...others]);
    await w.fire('install');
    await w.fire('activate');
    expect([...w.stores.keys()].sort()).toEqual([copy('v2'), ...others].sort());
    // Open pages stay with the copy they started on until the next launch.
    expect(w.self.clients.claim).not.toHaveBeenCalled();
  });

  it('with no network, the app and its files come from the copy', async () => {
    const w = worker();
    await w.fire('install');
    w.net.online = false;
    const page = `network: ${BASE}`;
    expect(await w.get(BASE, 'navigate')).toBe(page);
    expect(await w.get(`${BASE}?source=homescreen`, 'navigate')).toBe(page);
    expect(await w.get(`${BASE}index.html`, 'navigate')).toBe(page);
    expect(await w.get(`${BASE}assets/index-abc.js`)).toBe(`network: ${BASE}assets/index-abc.js`);
    expect(await w.get(`${BASE}icon-192.png?v=2`)).toBe(`network: ${BASE}icon-192.png`);
  });

  it('a file outside the copy comes from the network', async () => {
    const w = worker();
    await w.fire('install');
    expect(await w.get(`${BASE}new.png`)).toBe(`network: ${BASE}new.png`);
  });

  it('leaves other sites and non-GET requests alone', async () => {
    const w = worker();
    await w.fire('install');
    expect(await w.get('https://other.example/x.js')).toBeUndefined();
    expect(await w.fire('fetch', new FakeRequest(BASE, { method: 'POST' }))).toBeUndefined();
  });
});

/** Every file under a folder, as '/'-separated paths relative to it. */
const filesIn = (dir: string) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(dir, join(e.parentPath, e.name)));

/** What the build wrote in front of a built sw.js. */
function stamp(dir: string): { VERSION: string; FILES: string[] } {
  const sw = readFileSync(join(dir, 'sw.js'), 'utf8');
  const { VERSION, FILES } = runInNewContext(`${sw.split('\n').slice(0, 2).join('\n')}\n({ VERSION, FILES })`);
  return { VERSION, FILES: [...FILES] };
}

describe('writeServiceWorker · the build step', () => {
  /**
   * Runs the build step on a folder holding these files, as the files the build wrote, each file's content being
   * its own path unless given. `leftOver` files are in the folder too, but the build didn't write them.
   */
  function stamped(files: string[], contents: Record<string, string> = {}, sw = WORKER, leftOver: string[] = []) {
    const dir = mkdtempSync(join(tmpdir(), 'qimen-site-'));
    try {
      for (const file of [...files, ...leftOver]) {
        mkdirSync(join(dir, file, '..'), { recursive: true });
        writeFileSync(join(dir, file), contents[file] ?? file);
      }
      writeServiceWorker(dir, sw, files);
      return { ...stamp(dir), sw: readFileSync(join(dir, 'sw.js'), 'utf8') };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  const SITE = ['index.html', 'assets/b.js', 'assets/a.css', 'icon-192.png', 'fonts/sub/b.woff2'];

  it("keeps the page as './' and every other file, subfolders too, sorted, in front of the worker", () => {
    const { FILES: kept, sw } = stamped(SITE);
    expect(kept).toEqual(['./', './assets/a.css', './assets/b.js', './fonts/sub/b.woff2', './icon-192.png']);
    expect(sw.split('\n').slice(2).join('\n')).toBe(WORKER);
  });

  it('leaves out an older sw.js, source maps, dotfiles and dot-folders', () => {
    const extras = ['sw.js', 'assets/b.js.map', '.DS_Store', 'fonts/.DS_Store', '.git/x'];
    expect(stamped([...SITE, ...extras]).FILES).toEqual(stamped(SITE).FILES);
  });

  it('leaves out files an earlier build left in the folder, from the list and from the version', () => {
    const leftOver = ['assets/index-old.js', 'old-icon.png'];
    expect(stamped(SITE, {}, WORKER, leftOver)).toEqual(stamped(SITE));
  });

  it('gives the same version for the same site, and a new one when the page, any file or the worker changes', () => {
    const version = stamped(SITE).VERSION;
    expect(version).toMatch(/^[0-9a-f]{12}$/);
    expect(stamped(SITE).VERSION).toBe(version);
    expect(stamped(SITE, { 'index.html': 'a new page' }).VERSION).not.toBe(version);
    expect(stamped(SITE, { 'fonts/sub/b.woff2': 'a new font' }).VERSION).not.toBe(version);
    expect(stamped([...SITE, 'new.png']).VERSION).not.toBe(version);
    expect(stamped(SITE, {}, `${WORKER}\n// changed`).VERSION).not.toBe(version);
  });

  it('gives a new version when a file moves between names and contents that run together the same', () => {
    const page = { 'index.html': 'page' };
    expect(stamped(['a', 'index.html'], { ...page, a: 'bc' }).VERSION)
      .not.toBe(stamped(['ab', 'index.html'], { ...page, ab: 'c' }).VERSION);
  });

  it('refuses a site with no page', () => {
    expect(() => stamped(['assets/b.js'])).toThrow('no index.html');
  });
});

/** Width, height and PNG color type (2 = opaque RGB). */
function pngInfo(file: string) {
  const buf = readFileSync(join(ROOT, 'public', file));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}

describe('home-screen install', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'public/manifest.webmanifest'), 'utf8'));
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

  it('the manifest opens the app full screen from its own folder', () => {
    expect(manifest).toMatchObject({ name: '奇门排盘', start_url: './', scope: './', display: 'standalone' });
  });

  it('every manifest icon exists at its stated size', () => {
    for (const icon of manifest.icons as { src: string; sizes: string }[]) {
      const { width, height } = pngInfo(icon.src);
      expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
    }
  });

  it('the iPhone icon is 180×180 and opaque (iOS turns transparency black)', () => {
    expect(pngInfo('apple-touch-icon.png')).toEqual({ width: 180, height: 180, colorType: 2 });
  });

  it('index.html links the manifest and icons, and each file exists', () => {
    const links = Object.fromEntries([...html.matchAll(/<link rel="([^"]+)"[^>]*href="\/([^"]+)"/g)].map((m) => [m[1], m[2]]));
    expect(links).toEqual({ manifest: 'manifest.webmanifest', icon: 'icon-192.png', 'apple-touch-icon': 'apple-touch-icon.png' });
    for (const file of Object.values(links)) expect(() => readFileSync(join(ROOT, 'public', file!))).not.toThrow();
  });
});

describe('the built site', () => {
  it('sw.js keeps every built file except itself, and installs them all', { timeout: 60_000 }, async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'qimen-build-'));
    // A file from an earlier build, in a folder the build doesn't empty first: the copy must not keep it.
    const leftOver = 'assets/index-old.js';
    mkdirSync(join(outDir, 'assets'));
    writeFileSync(join(outDir, leftOver), 'an earlier build');
    try {
      await build({ root: ROOT, logLevel: 'silent', build: { outDir, emptyOutDir: false } });
      const { VERSION, FILES: kept } = stamp(outDir);
      expect(VERSION).toMatch(/^[0-9a-f]{12}$/);
      const built = filesIn(outDir).filter((f) => f !== leftOver);
      const expected = built.filter((f) => f !== 'sw.js' && f !== 'index.html').map((f) => `./${f}`);
      expect([...kept].sort()).toEqual(['./', ...expected].sort());
      // The page, its script and stylesheet, the manifest and the three icons.
      expect(kept).toHaveLength(7);

      // The worker as built runs, and its install asks for exactly those files.
      const w = worker([], readFileSync(join(outDir, 'sw.js'), 'utf8'));
      await w.fire('install');
      expect(w.net.fetched.map((r) => r.url)).toEqual(kept.map((f) => new URL(f, BASE).href));
      expect([...w.stores.keys()]).toEqual([copy(VERSION)]);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
