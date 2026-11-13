import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { defineConfig } from 'vitest/config';

/** Every file under a folder, as '/'-separated paths relative to it. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'));
}

/**
 * Writes sw.js into a built site (SPEC §11): the worker, src/sw.js, with two lines in front. FILES lists what to
 * keep on the device: the page as './', then every other file the build wrote except sw.js itself, source maps and
 * dotfiles (.DS_Store). Files an earlier build left in the folder aren't kept. VERSION hashes the worker and all of
 * those files, so any change ships as a new version.
 */
export function writeServiceWorker(site: string, worker: string, written: readonly string[]): void {
  const files = [...new Set(written)]
    .filter((file) => file !== 'sw.js' && !file.endsWith('.map') && !file.split('/').some((part) => part.startsWith('.')))
    .sort();
  if (!files.includes('index.html')) throw new Error(`no index.html in ${site}: sw.js would keep a site with no page`);

  // Each part goes in with its name and length in front, so no two different sites hash the same.
  const hash = createHash('sha256');
  const add = (name: string, content: string | Buffer) =>
    hash.update(`${name}\0${Buffer.byteLength(content)}\0`).update(content);
  add('sw.js', worker);
  for (const file of files) add(file, readFileSync(join(site, file)));
  const version = hash.digest('hex').slice(0, 12);
  const urls = ['./', ...files.filter((file) => file !== 'index.html').map((file) => `./${file}`)];
  writeFileSync(
    join(site, 'sw.js'),
    `const VERSION = ${JSON.stringify(version)};\nconst FILES = ${JSON.stringify(urls)};\n${worker}`,
  );
}

/**
 * Runs writeServiceWorker once the site is written, with the files this build wrote: the bundle, and what Vite
 * copied from public/. Builds only: the dev server has no sw.js.
 */
function offlineCopy(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'offline-copy',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    writeBundle(_options, bundle) {
      const { publicDir, build } = config;
      const copied = build.copyPublicDir && publicDir && existsSync(publicDir) ? filesUnder(publicDir) : [];
      const worker = readFileSync(resolve(config.root, 'src/sw.js'), 'utf8');
      writeServiceWorker(resolve(config.root, build.outDir), worker, [...Object.keys(bundle), ...copied]);
    },
  };
}

export default defineConfig({
  // Relative asset paths, so the built site works from any folder.
  base: './',
  plugins: [react(), offlineCopy()],
  // lunar-typescript ships as one ~425 kB module that can't be tree-shaken; the whole app is ~175 kB gzipped.
  build: { chunkSizeWarningLimit: 600 },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
});
