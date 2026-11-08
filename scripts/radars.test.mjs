import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { selectPapers } from './radars.mjs';

test('digest selects by discovery date, keeps provenance, and deduplicates versions', () => {
  const paper = { title: 'Study', source: 'Original lab', date: '2026-10-15', summary: 'Evidence.' };
  const first = { ...paper, url: 'https://arxiv.org/abs/2610.12345v1', firstSeen: '2026-11-02T00:00:00Z' };
  const second = { ...paper, url: 'https://arxiv.org/pdf/2610.12345v2.pdf', firstSeen: '2026-11-06T00:00:00Z' };
  const bad = { ...paper, url: 'javascript:alert(1)', firstSeen: '2026-11-08' };
  assert.deepEqual(selectPapers([first, second, bad], '2026-11-02', '2026-11-08', 8), [{
    title: 'Study', source: 'Original lab', date: '2026-10-15', discovered: '2026-11-06',
    url: second.url, summary: 'Evidence.', status: '',
  }]);
});

test('registering a private field enables it without adding it to the default digest', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'radars-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const registry = join(directory, 'fields.json');
  const fieldFile = join(directory, 'field.json');
  const field = { id: 'new-area', name: 'New area', feedEnv: 'TEST_RADAR_FEED_URL', visibility: 'private', serviceTokenEnv: 'TEST_RADAR_TOKEN' };
  await writeFile(registry, JSON.stringify({ version: 1, fields: [] }));
  await writeFile(fieldFile, JSON.stringify(field));
  const cli = fileURLToPath(new URL('./radars.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    env: { RADARS_CONFIG: registry },
  });
  const registration = run('add-field', fieldFile);
  assert.equal(registration.status, 0, registration.stderr);
  assert.deepEqual(JSON.parse(await readFile(registry, 'utf8')).fields, [field]);
  assert.equal(run('add-field', fieldFile).status, 1);
  assert.deepEqual(JSON.parse(run('digest', '--format', 'json').stdout).fields, []);
  const privateDigest = run('digest', '--format', 'json', '--include-private');
  assert.equal(privateDigest.status, 1);
  assert.match(JSON.parse(privateDigest.stdout).fields[0].error, /TEST_RADAR_FEED_URL/);
});
