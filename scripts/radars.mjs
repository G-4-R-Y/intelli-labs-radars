import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const configPath = process.env.RADARS_CONFIG
  ? resolve(process.env.RADARS_CONFIG)
  : fileURLToPath(new URL('../config/fields.json', import.meta.url));

const text = value => typeof value === 'string' ? value.trim() : '';
const isoDay = value => {
  const day = text(value).slice(0, 10);
  const date = new Date(day);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(+date) &&
    date.toISOString().slice(0, 10) === day ? day : '';
};

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function validateField(field) {
  const envName = /^[A-Z][A-Z0-9_]*$/;
  const keys = ['id', 'name', 'feedEnv', 'visibility', 'gatewayTokenEnv', 'serviceTokenEnv', 'limit', 'enabled'];
  if (!field || typeof field !== 'object' || Object.keys(field).some(key => !keys.includes(key)) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text(field.id)) || !text(field.name) ||
      !envName.test(text(field.feedEnv)) || !['public', 'private'].includes(field.visibility) ||
      [field.gatewayTokenEnv, field.serviceTokenEnv].some(name => name !== undefined && !envName.test(text(name))) ||
      (field.visibility === 'private' && !field.gatewayTokenEnv && !field.serviceTokenEnv) ||
      (field.enabled !== undefined && typeof field.enabled !== 'boolean') ||
      (field.limit !== undefined && (!Number.isInteger(field.limit) || field.limit < 1 || field.limit > 50))) {
    throw new Error('Invalid field definition. See the field contract in README.md.');
  }
}

async function loadRegistry() {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (config.version !== 1 || !Array.isArray(config.fields)) throw new Error('Invalid field registry.');
  const ids = new Set();
  for (const field of config.fields) {
    validateField(field);
    if (ids.has(field.id)) throw new Error(`Duplicate field ID: ${field.id}`);
    ids.add(field.id);
  }
  return config;
}

async function addField(file) {
  const field = JSON.parse(await readFile(file, 'utf8'));
  validateField(field);
  // Serialize registry edits and rename atomically so a digest never reads a
  // partially written registry.
  const lock = configPath + '.lock';
  try {
    await writeFile(lock, '', { flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Registry is locked by another edit.');
    throw error;
  }
  const pending = configPath + '.' + randomUUID() + '.tmp';
  try {
    const config = await loadRegistry();
    if (config.fields.some(item => item.id === field.id)) throw new Error(`Field already exists: ${field.id}`);
    config.fields.push(field);
    await writeFile(pending, JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
    await rename(pending, configPath);
  } finally {
    await rm(pending, { force: true });
    await rm(lock, { force: true });
  }
}

function paperIdentity(url) {
  const arxiv = url.hostname === 'arxiv.org' && url.pathname.match(/^\/(?:abs|pdf)\/(.+?)(?:v\d+)?(?:\.pdf)?\/?$/);
  if (arxiv) return 'arxiv:' + arxiv[1];
  if (['doi.org', 'dx.doi.org'].includes(url.hostname)) return 'doi:' + url.pathname.slice(1).toLowerCase();
  url.hash = '';
  return url.href;
}

export function selectPapers(papers, since, through, limit) {
  const items = [];
  for (const paper of papers) {
    const url = httpsUrl(paper?.url);
    const title = text(paper?.title);
    const source = text(paper?.source);
    const date = text(paper?.date);
    const discovered = isoDay(paper?.firstSeen);
    const day = discovered || isoDay(date);
    if (!url || !title || !source || !day || day < since || day > through) continue;
    const key = paperIdentity(url);
    items.push({
      key, day, title, source, date, discovered, url: url.href,
      summary: text(paper.summary), status: text(paper.status),
    });
  }
  items.sort((a, b) => b.day.localeCompare(a.day));
  const seen = new Set();
  return items.filter(({ key }) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit).map(({ key, day, ...item }) => item);
}

async function digestField(field, since, through) {
  const origin = httpsUrl(process.env[field.feedEnv]);
  if (!origin) throw new Error(`Set ${field.feedEnv} to an HTTPS feed URL.`);
  const headers = { Accept: 'application/json' };
  for (const [key, header] of [
    ['gatewayTokenEnv', 'OAI-Sites-Authorization'],
    ['serviceTokenEnv', 'X-Radar-Service-Token'],
  ]) {
    const envName = field[key];
    if (!envName) continue;
    const value = process.env[envName];
    if (!value) throw new Error(`Set ${envName} for authenticated access.`);
    headers[header] = key === 'gatewayTokenEnv' ? `Bearer ${value}` : value;
  }
  const response = await fetch(origin, { headers, redirect: 'error', signal: AbortSignal.timeout(20_000) })
    .catch(() => { throw new Error('Feed unavailable or attempted to redirect.'); });
  if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}.`);
  const data = await response.json().catch(() => { throw new Error('Feed response was not valid JSON.'); });
  if (!Array.isArray(data?.papers)) throw new Error('Feed must return a papers array.');
  return selectPapers(data.papers, since, through, field.limit ?? 8);
}

const markdown = value => String(value).replace(/\s+/g, ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/[\\`*_\[\]~]/g, '\\$&');

function renderDigest(digest) {
  const lines = [`# Intelli Labs Research Digest (${digest.since} to ${digest.through})`];
  for (const field of digest.fields) {
    lines.push('', `## ${markdown(field.name)}`, '');
    if (field.error) lines.push(`Feed unavailable. ${markdown(field.error)}`);
    else if (!field.papers.length) lines.push('No records in this window.');
    else for (const item of field.papers) {
      const link = item.url.replace(/[()]/g, char => char === '(' ? '%28' : '%29');
      const meta = [item.source, item.date, item.status, item.discovered && `discovered ${item.discovered}`].filter(Boolean);
      lines.push(`- [${markdown(item.title)}](${link}) · ${markdown(meta.join(' · '))}`);
      if (item.summary) lines.push(`  ${markdown(item.summary)}`);
    }
  }
  return lines.join('\n') + '\n';
}

async function run() {
  const { positionals: [command, argument, ...extra], values } = parseArgs({
    allowPositionals: true,
    options: {
      since: { type: 'string' },
      through: { type: 'string' },
      format: { type: 'string', default: 'markdown' },
      'include-private': { type: 'boolean' },
    },
  });
  if (command === 'add-field' && argument && !extra.length) return addField(argument);
  const config = await loadRegistry();
  if (command === 'fields' && !argument) {
    for (const field of config.fields) console.log(`${field.id}\t${field.visibility}\t${field.enabled === false ? 'disabled' : 'enabled'}\t${field.name}`);
    return;
  }
  if (command !== 'digest' || argument || !['markdown', 'json'].includes(values.format)) {
    throw new Error('Usage: radars.mjs fields | add-field <file> | digest [--since YYYY-MM-DD] [--through YYYY-MM-DD] [--format markdown|json] [--include-private]');
  }
  const through = values.through ?? new Date().toISOString().slice(0, 10);
  if (isoDay(through) !== through) throw new Error('--through must be a calendar date (YYYY-MM-DD).');
  const since = values.since ?? new Date(Date.parse(through) - 6 * 86400000).toISOString().slice(0, 10);
  if (isoDay(since) !== since || since > through) throw new Error('--since must be a calendar date on or before --through.');

  const fields = config.fields.filter(field => field.enabled !== false &&
    (field.visibility === 'public' || values['include-private']));
  const results = await Promise.all(fields.map(async ({ id, name, visibility, ...field }) => {
    try {
      return { id, name, visibility, papers: await digestField(field, since, through) };
    } catch (error) {
      return { id, name, visibility, error: error.message };
    }
  }));
  const digest = { since, through, fields: results };
  process.stdout.write(values.format === 'json' ? JSON.stringify(digest, null, 2) + '\n' : renderDigest(digest));
  if (results.some(field => field.error)) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
