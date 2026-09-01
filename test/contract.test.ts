import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as entry from '../src/index.ts';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('the entry point exports every name the README usage block imports', () => {
  // README: `import { pack, render, overlap } from '@m-sanchez/u-pack'`.
  // Nothing else imports src/index.ts, so without this a dropped re-export
  // ships green: CI's install proof only checks the module is non-empty.
  for (const name of ['pack', 'render', 'overlap', 'countWords', 'fold', 'rankItems', 'recency', 'weighted']) {
    assert.equal(typeof (entry as Record<string, unknown>)[name], 'function', `missing export: ${name}`);
  }
});

test('zero runtime dependencies', () => {
  // README and the badge both claim it; nothing enforced it.
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
  assert.deepEqual(Object.keys(pkg.peerDependencies ?? {}), []);
  assert.deepEqual(Object.keys(pkg.optionalDependencies ?? {}), []);
});
