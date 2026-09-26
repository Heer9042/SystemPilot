#!/usr/bin/env node
/**
 * SystemPilot Universal Centralized Version Manager
 * Single Source of Truth: Root package.json
 * 
 * Synchronizes version across:
 *  - package.json
 *  - package-lock.json
 *  - frontend/package.json
 *  - frontend/package-lock.json
 *  - src-tauri/Cargo.toml
 *  - src-tauri/tauri.conf.json
 *  - SECURITY.md
 * 
 * Usage:
 *   npm run set-version -- 0.0.3
 *   npm run bump patch
 *   npm run bump minor
 *   npm run bump major
 *   npm run prebuild (or --sync)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const FILES = {
  rootPkg: path.join(ROOT_DIR, 'package.json'),
  rootLock: path.join(ROOT_DIR, 'package-lock.json'),
  frontendPkg: path.join(ROOT_DIR, 'frontend', 'package.json'),
  frontendLock: path.join(ROOT_DIR, 'frontend', 'package-lock.json'),
  cargoToml: path.join(ROOT_DIR, 'src-tauri', 'Cargo.toml'),
  tauriConf: path.join(ROOT_DIR, 'src-tauri', 'tauri.conf.json'),
  securityMd: path.join(ROOT_DIR, 'SECURITY.md'),
};

const SEMVER_REGEX = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

function getRootVersion() {
  const data = JSON.parse(fs.readFileSync(FILES.rootPkg, 'utf-8'));
  return data.version;
}

function parseSemver(v) {
  const match = String(v).trim().match(SEMVER_REGEX);
  if (!match) {
    throw new Error(`Invalid semantic version format: "${v}". Expected format: X.Y.Z or X.Y.Z-prerelease`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
    build: match[5] || null,
  };
}

function formatSemver({ major, minor, patch, prerelease, build }) {
  let v = `${major}.${minor}.${patch}`;
  if (prerelease) v += `-${prerelease}`;
  if (build) v += `+${build}`;
  return v;
}

function computeTargetVersion(input) {
  const current = getRootVersion();
  const parsed = parseSemver(current);

  if (!input || input === '--sync' || input === 'sync') {
    return current;
  }

  if (input === 'patch') {
    parsed.patch += 1;
    parsed.prerelease = null;
    parsed.build = null;
    return formatSemver(parsed);
  }
  if (input === 'minor') {
    parsed.minor += 1;
    parsed.patch = 0;
    parsed.prerelease = null;
    parsed.build = null;
    return formatSemver(parsed);
  }
  if (input === 'major') {
    parsed.major += 1;
    parsed.minor = 0;
    parsed.patch = 0;
    parsed.prerelease = null;
    parsed.build = null;
    return formatSemver(parsed);
  }

  const validated = parseSemver(input);
  return formatSemver(validated);
}

function updateFile(filePath, updater) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const updated = updater(content);
  if (content !== updated) {
    fs.writeFileSync(filePath, updated, 'utf-8');
    return true;
  }
  return false;
}

export function syncAllVersions(targetVersion) {
  const cleanVer = targetVersion.replace(/^v/i, '').trim();
  parseSemver(cleanVer); // Validates syntax

  console.log(`\n========================================================`);
  console.log(` 🔄 SystemPilot Centralized Version Synchronization`);
  console.log(` Target Version: v${cleanVer}`);
  console.log(`========================================================\n`);

  let changedCount = 0;

  // 1. Root package.json
  if (updateFile(FILES.rootPkg, content => {
    const json = JSON.parse(content);
    json.version = cleanVer;
    return JSON.stringify(json, null, 2) + '\n';
  })) changedCount++;

  // 2. Root package-lock.json
  if (updateFile(FILES.rootLock, content => {
    const json = JSON.parse(content);
    json.version = cleanVer;
    if (json.packages && json.packages['']) {
      json.packages[''].version = cleanVer;
    }
    return JSON.stringify(json, null, 2) + '\n';
  })) changedCount++;

  // 3. Frontend package.json
  if (updateFile(FILES.frontendPkg, content => {
    const json = JSON.parse(content);
    json.version = cleanVer;
    return JSON.stringify(json, null, 2) + '\n';
  })) changedCount++;

  // 4. Frontend package-lock.json
  if (updateFile(FILES.frontendLock, content => {
    const json = JSON.parse(content);
    json.version = cleanVer;
    if (json.packages && json.packages['']) {
      json.packages[''].version = cleanVer;
    }
    return JSON.stringify(json, null, 2) + '\n';
  })) changedCount++;

  // 5. src-tauri/Cargo.toml
  if (updateFile(FILES.cargoToml, content => {
    return content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${cleanVer}"`);
  })) changedCount++;

  // 6. src-tauri/tauri.conf.json
  if (updateFile(FILES.tauriConf, content => {
    const json = JSON.parse(content);
    json.version = cleanVer;
    return JSON.stringify(json, null, 2) + '\n';
  })) changedCount++;

  // 7. SECURITY.md
  if (updateFile(FILES.securityMd, content => {
    return content.replace(/\|\s*<\s*[\d\.]+\s*\|\s*:x:\s*\|/g, `| < ${cleanVer} | :x:                |`);
  })) changedCount++;

  // Post-synchronization verification
  console.log(`🔍 Verifying consistency across all metadata manifests...`);
  
  const rootV = JSON.parse(fs.readFileSync(FILES.rootPkg, 'utf-8')).version;
  const frontV = JSON.parse(fs.readFileSync(FILES.frontendPkg, 'utf-8')).version;
  const tauriV = JSON.parse(fs.readFileSync(FILES.tauriConf, 'utf-8')).version;
  const cargoMatch = fs.readFileSync(FILES.cargoToml, 'utf-8').match(/^version\s*=\s*"([^"]+)"/m);
  const cargoV = cargoMatch ? cargoMatch[1] : null;

  const mismatches = [];
  if (rootV !== cleanVer) mismatches.push(`package.json (${rootV})`);
  if (frontV !== cleanVer) mismatches.push(`frontend/package.json (${frontV})`);
  if (tauriV !== cleanVer) mismatches.push(`src-tauri/tauri.conf.json (${tauriV})`);
  if (cargoV !== cleanVer) mismatches.push(`src-tauri/Cargo.toml (${cargoV})`);

  if (mismatches.length > 0) {
    console.error(`\n❌ Version mismatch detected in: ${mismatches.join(', ')}`);
    process.exit(1);
  }

  console.log(`✅ All version fields successfully verified: v${cleanVer}`);
  console.log(`   - Root: package.json (${rootV})`);
  console.log(`   - Frontend: frontend/package.json (${frontV})`);
  console.log(`   - Rust: src-tauri/Cargo.toml (${cargoV})`);
  console.log(`   - Tauri: src-tauri/tauri.conf.json (${tauriV})`);
  console.log(`   - Security: SECURITY.md (< ${cleanVer})\n`);

  return cleanVer;
}

// CLI Execution
try {
  const arg = process.argv[2];
  const target = computeTargetVersion(arg);
  syncAllVersions(target);
} catch (err) {
  console.error(`\n❌ Error: ${err.message}\n`);
  process.exit(1);
}
