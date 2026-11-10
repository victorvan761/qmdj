// Build step for the offline copy (SPEC §11): writes dist/sw.js from src/sw.js plus the list of files to keep.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/** The URLs the service worker keeps, relative to it: the page itself as './', then every other built file. */
export function precacheList(files: readonly string[]): string[] {
  const kept = files.filter((f) => f !== 'index.html' && f !== 'sw.js' && !f.endsWith('.map'));
  return ['./', ...[...kept].sort().map((f) => `./${f}`)];
}

/** src/sw.js with its two inputs declared in front. */
export function serviceWorkerSource(template: string, version: string, files: readonly string[]): string {
  return `const VERSION = ${JSON.stringify(version)};\nconst FILES = ${JSON.stringify(files)};\n${template}`;
}

export function offline(): Plugin {
  let root = '';
  let publicDir = '';
  return {
    name: 'qimen-offline',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      root = config.root;
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      if (!('index.html' in bundle)) this.error('index.html is not in the bundle yet; sw.js would miss it');
      // The version hashes every file and sw.js itself, so any change to the site ships a new version.
      const template = readFileSync(join(root, 'src/sw.js'), 'utf8');
      const hash = createHash('sha256').update(template);
      const files: string[] = [];
      for (const [name, out] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) {
        files.push(name);
        hash.update(name).update(out.type === 'chunk' ? out.code : out.source);
      }
      const publicFiles = readdirSync(publicDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
        .map((entry) => entry.name)
        .sort();
      for (const name of publicFiles) {
        files.push(name);
        hash.update(name).update(readFileSync(join(publicDir, name)));
      }
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: serviceWorkerSource(template, hash.digest('hex').slice(0, 12), precacheList(files)),
      });
    },
  };
}
