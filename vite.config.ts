import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Writes sw.js into a built site (SPEC §11): the worker, src/sw.js, with two lines in front. FILES lists what to
 * keep on the device: the page as './', then every other file of the site except sw.js itself, source maps and
 * dotfiles (.DS_Store). VERSION hashes the worker and all of those files, so any change ships as a new version.
 */
export function writeServiceWorker(site: string, worker: string): void {
  const files = readdirSync(site, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(site, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .filter((file) => file !== 'sw.js' && !file.endsWith('.map') && !file.split('/').some((part) => part.startsWith('.')))
    .sort();
  if (!files.includes('index.html')) throw new Error(`no index.html in ${site}: sw.js would keep a site with no page`);

  const hash = createHash('sha256').update(worker);
  for (const file of files) hash.update(file).update(readFileSync(join(site, file)));
  const version = hash.digest('hex').slice(0, 12);
  const urls = ['./', ...files.filter((file) => file !== 'index.html').map((file) => `./${file}`)];
  writeFileSync(
    join(site, 'sw.js'),
    `const VERSION = ${JSON.stringify(version)};\nconst FILES = ${JSON.stringify(urls)};\n${worker}`,
  );
}

/** Runs writeServiceWorker once the site is written. Builds only: the dev server has no sw.js. */
function offlineCopy(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'offline-copy',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    writeBundle() {
      const worker = readFileSync(resolve(config.root, 'src/sw.js'), 'utf8');
      writeServiceWorker(resolve(config.root, config.build.outDir), worker);
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
