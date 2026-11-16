#!/usr/bin/env node
// Verify that vendor/@connethics/arazzo-core matches its VENDOR.json (SHA-256).
//
//   npm run vendor:check
//
// When the arazzo-demo checkout is available (ARAZZO_DEMO env var, default
// ../arazzo-demo), this delegates to `scripts/sync-shared.mjs --check`, the
// reference implementation. Otherwise (CI of this repository alone) the same
// hash check is performed here: per-file SHA-256 plus the aggregate hash.
// To update the vendored copy: npm run vendor:sync (needs arazzo-demo).
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = 'arazzo-core';
const demo = path.resolve(repoRoot, process.env.ARAZZO_DEMO ?? '../arazzo-demo');
const syncScript = path.join(demo, 'scripts', 'sync-shared.mjs');

if (fs.existsSync(syncScript) && fs.existsSync(path.join(demo, 'packages', pkg, 'package.json'))) {
  const r = spawnSync(process.execPath, [syncScript, '--check', pkg, repoRoot], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

// Standalone check (same algorithm as sync-shared.mjs --check).
const destDir = path.join(repoRoot, 'vendor', '@connethics', pkg);
const vendorJsonPath = path.join(destDir, 'VENDOR.json');
if (!fs.existsSync(vendorJsonPath)) {
  console.error(`✗ ${path.relative(repoRoot, vendorJsonPath)} not found`);
  process.exit(1);
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const listFiles = (dir, base = dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p).split(path.sep).join('/')];
    })
    .sort();

const recorded = JSON.parse(fs.readFileSync(vendorJsonPath, 'utf8'));
const files = {};
for (const rel of listFiles(destDir)) if (rel !== 'VENDOR.json') files[rel] = sha256(fs.readFileSync(path.join(destDir, rel)));
const aggregate = sha256(Object.entries(files).map(([f, h]) => `${f}\0${h}\n`).join(''));
const problems = [];
for (const [f, h] of Object.entries(recorded.files ?? {})) {
  if (!(f in files)) problems.push(`missing ${f}`);
  else if (files[f] !== h) problems.push(`modified ${f}`);
}
for (const f of Object.keys(files)) if (!(f in (recorded.files ?? {}))) problems.push(`unexpected ${f}`);
if (aggregate !== recorded.sha256) problems.push('aggregate sha256 mismatch');
if (problems.length) {
  console.error(`✗ vendored ${recorded.name}@${recorded.version} differs from VENDOR.json:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ ${recorded.name}@${recorded.version} matches VENDOR.json (sha256 ${recorded.sha256.slice(0, 12)}…, standalone check)`);
