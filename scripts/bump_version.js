#!/usr/bin/env node
// SystemPilot Universal Synchronized Version Manager
// Keeps version identical across: root package.json, frontend/package.json, src-tauri/Cargo.toml, src-tauri/tauri.conf.json, and SECURITY.md

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const FILES = {
  rootPkg: path.join(ROOT_DIR, 'package.json'),
  frontendPkg: path.join(ROOT_DIR, 'frontend', 'package.json'),
  cargoToml: path.join(ROOT_DIR, 'src-tauri', 'Cargo.toml'),
  tauriConf: path.join(ROOT_DIR, 'src-tauri', 'tauri.conf.json'),
  securityMd: path.join(ROOT_DIR, 'SECURITY.md'),
};

function getRootVersion() {
  const data = JSON.parse(fs.readFileSync(FILES.rootPkg, 'utf-8'));
  return data.version;
}

function parseSemver(v) {
  const clean = v.replace(/^v/i, '');
  const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

function formatSemver({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function computeTargetVersion(input) {
  const current = getRootVersion();
  const parsed = parseSemver(current);

  if (!input || input === '--sync') {
    return current;
  }

  if (input === 'patch') {
    parsed.patch += 1;
    return formatSemver(parsed);
  }
  if (input === 'minor') {
    parsed.minor += 1;
    parsed.patch = 0;
    return formatSemver(parsed);
  }
  if (input === 'major') {
    parsed.major += 1;
    parsed.minor = 0;
    parsed.patch = 0;
    return formatSemver(parsed);
  }

  return input.replace(/^v/i, '');
}

function updateFile(filePath, updater) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] File does not exist: ${filePath}`);
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
  const cleanVer = targetVersion.replace(/^v/i, '');
  console.log(`\n🔄 Synchronizing SystemPilot Version to: v${cleanVer}`);

  let changedCount = 0;

  // 1. Root package.json
  if (updateFile(FILES.rootPkg, content => {
    const json = JSON.parse(content);
    json.version = cleanVer;
    return JSON.stringify(json, null, 2) + '\n';
  })) changedCount++;

  // 2. Frontend package.json
  if (updateFile(FILES.frontendPkg, content => {
    const json = JSON.parse(content);
    json.version = cleanVer;
    return JSON.stringify(json, null, 2) + '\n';
  })) changedCount++;

  // 3. src-tauri/Cargo.toml
  if (updateFile(FILES.cargoToml, content => {
    return content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${cleanVer}"`);
  })) changedCount++;

  // 4. src-tauri/tauri.conf.json
  if (updateFile(FILES.tauriConf, content => {
    const json = JSON.parse(content);
    json.version = cleanVer;
    return JSON.stringify(json, null, 2) + '\n';
  })) changedCount++;

  // 5. SECURITY.md
  if (updateFile(FILES.securityMd, content => {
    return content.replace(/\|\s*<\s*[\d\.]+\s*\|\s*:x:\s*\|/g, `| < ${cleanVer} | :x:                |`);
  })) changedCount++;

  console.log(`✅ Version synchronization complete! (${changedCount} files updated)`);
  console.log(`   - Root: package.json (${cleanVer})`);
  console.log(`   - Frontend: frontend/package.json (${cleanVer})`);
  console.log(`   - Rust: src-tauri/Cargo.toml (${cleanVer})`);
  console.log(`   - Tauri: src-tauri/tauri.conf.json (${cleanVer})`);
  console.log(`   - Security: SECURITY.md (< ${cleanVer})\n`);

  return cleanVer;
}

// Direct Execution CLI
const arg = process.argv[2];
const target = computeTargetVersion(arg || '0.0.2');
syncAllVersions(target);
