// The security rules that live in files: what the workflows may run, what npm may install, and who can reach the
// dev server. GitHub's own settings (the rules on main, which actions are allowed) can't be seen from here.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');

/** Every step of every workflow that runs an action: what it uses, and the step's lines from there on. */
function actionSteps(): { uses: string; lines: string }[] {
  return readdirSync(join(ROOT, '.github/workflows')).flatMap((name) => {
    const lines = read(`.github/workflows/${name}`).split('\n');
    return lines.flatMap((line, i) => {
      const uses = /^\s*(?:-\s+)?uses:\s*(\S+)/.exec(line)?.[1];
      if (!uses) return [];
      const next = lines.findIndex((l, j) => j > i && /^\s*-\s/.test(l));
      return [{ uses, lines: lines.slice(i, next === -1 ? undefined : next).join('\n') }];
    });
  });
}

/** What .npmrc sets. */
function npmSettings(): Map<string, string> {
  const settings = new Map<string, string>();
  for (const line of read('.npmrc').split('\n')) {
    const setting = /^\s*([\w-]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (setting) settings.set(setting[1]!, setting[2]!);
  }
  return settings;
}

describe('the workflows', () => {
  it('run only actions pinned to a commit', () => {
    // A tag can be moved to other code. A commit can't.
    const steps = actionSteps();
    expect(steps.length).toBeGreaterThan(0);
    for (const { uses } of steps) expect(uses).toMatch(/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/);
  });

  it('check the code out without leaving a token behind for later steps', () => {
    const checkouts = actionSteps().filter(({ uses }) => uses.startsWith('actions/checkout@'));
    expect(checkouts.length).toBeGreaterThan(0);
    for (const { lines } of checkouts) expect(lines).toMatch(/^\s*persist-credentials: false$/m);
  });

  it('have Dependabot proposing new pins and new packages', () => {
    const ecosystems = [...read('.github/dependabot.yml').matchAll(/^\s*-\s+package-ecosystem:\s*([\w-]+)/gm)].map((m) => m[1]);
    expect(ecosystems.sort()).toEqual(['github-actions', 'npm']);
  });
});

describe('npm', () => {
  it("never runs a dependency's install scripts", () => {
    expect(npmSettings().get('ignore-scripts')).toBe('true');
  });

  it("won't choose a release under a week old", () => {
    expect(Number(npmSettings().get('min-release-age'))).toBeGreaterThanOrEqual(7);
  });
});

describe('the dev and preview servers', () => {
  it('listen on this machine only', () => {
    const { configurations } = JSON.parse(read('.claude/launch.json')) as {
      configurations: { name: string; runtimeArgs: string[] }[];
    };
    expect(configurations.length).toBeGreaterThan(0);
    for (const { name, runtimeArgs } of configurations) {
      // Vite listens on this machine unless told otherwise. A bare --host means every network the machine is on.
      const host = runtimeArgs.indexOf('--host');
      if (host !== -1) expect(runtimeArgs[host + 1], name).toMatch(/^(127\.0\.0\.1|localhost|::1)$/);
    }
  });
});
