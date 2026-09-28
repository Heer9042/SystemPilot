// Unit tests for SystemPilot Semantic Versioning and Update Logic

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSemVer, compareSemVer, isNewerVersion } from '../frontend/src/services/updates/version.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('=== Running SystemPilot Versioning Tests ===\n');

// Test 1: Simple Patch Increment
assert(compareSemVer('0.0.1', '0.0.2') === -1, '0.0.1 < 0.0.2');
assert(isNewerVersion('0.0.1', '0.0.2') === true, 'isNewerVersion(0.0.1, 0.0.2) is true');

// Test 2: Double digit versions (semantic vs string comparison)
assert(compareSemVer('1.9.0', '1.10.0') === -1, '1.9.0 < 1.10.0 (semantic handling)');
assert(isNewerVersion('1.9.0', '1.10.0') === true, 'isNewerVersion(1.9.0, 1.10.0) is true');
assert(compareSemVer('1.10.0', '1.9.0') === 1, '1.10.0 > 1.9.0');

// Test 3: Major version upgrade
assert(compareSemVer('1.9.9', '2.0.0') === -1, '1.9.9 < 2.0.0');
assert(isNewerVersion('1.9.9', '2.0.0') === true, 'isNewerVersion(1.9.9, 2.0.0) is true');

// Test 4: Equal versions
assert(compareSemVer('0.0.2', '0.0.2') === 0, '0.0.2 === 0.0.2');
assert(isNewerVersion('0.0.2', '0.0.2') === false, 'isNewerVersion(0.0.2, 0.0.2) is false');

// Test 5: Leading "v" stripping
assert(compareSemVer('v0.0.2', '0.0.3') === -1, 'v0.0.2 < 0.0.3');
assert(compareSemVer('V1.0.0', 'v1.0.0') === 0, 'V1.0.0 === v1.0.0');
assert(isNewerVersion('v0.0.2', 'v0.0.3') === true, 'isNewerVersion(v0.0.2, v0.0.3) is true');

// Test 6: Pre-release version comparisons
assert(compareSemVer('1.0.0-beta.1', '1.0.0') === -1, '1.0.0-beta.1 < 1.0.0');
assert(compareSemVer('1.0.0', '1.0.0-beta.1') === 1, '1.0.0 > 1.0.0-beta.1');

// Test 7: Malformed / edge cases
assert(parseSemVer(null).raw === '0.0.0', 'parseSemVer(null) safely defaults to 0.0.0');
assert(parseSemVer('').raw === '0.0.0', 'parseSemVer("") safely defaults to 0.0.0');

console.log('\n=== Running Authoritative Version Consistency Check ===\n');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const authoritativeVersion = rootPkg.version;
assert(!!authoritativeVersion, `Authoritative version defined in package.json: v${authoritativeVersion}`);

// 1. package-lock.json
const rootLock = JSON.parse(fs.readFileSync(path.join(rootDir, 'package-lock.json'), 'utf-8'));
assert(rootLock.version === authoritativeVersion, `package-lock.json version matches (${rootLock.version} === ${authoritativeVersion})`);

// 2. frontend/package.json
const frontPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'frontend', 'package.json'), 'utf-8'));
assert(frontPkg.version === authoritativeVersion, `frontend/package.json version matches (${frontPkg.version} === ${authoritativeVersion})`);

// 3. frontend/package-lock.json
const frontLock = JSON.parse(fs.readFileSync(path.join(rootDir, 'frontend', 'package-lock.json'), 'utf-8'));
assert(frontLock.version === authoritativeVersion, `frontend/package-lock.json version matches (${frontLock.version} === ${authoritativeVersion})`);

// 4. src-tauri/Cargo.toml
const cargoToml = fs.readFileSync(path.join(rootDir, 'src-tauri', 'Cargo.toml'), 'utf-8');
const cargoMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);
const cargoVersion = cargoMatch ? cargoMatch[1] : null;
assert(cargoVersion === authoritativeVersion, `src-tauri/Cargo.toml version matches (${cargoVersion} === ${authoritativeVersion})`);

// 5. src-tauri/tauri.conf.json
const tauriConf = JSON.parse(fs.readFileSync(path.join(rootDir, 'src-tauri', 'tauri.conf.json'), 'utf-8'));
assert(tauriConf.version === authoritativeVersion, `src-tauri/tauri.conf.json version matches (${tauriConf.version} === ${authoritativeVersion})`);

// 6. release/latest.json
const latestPath = path.join(rootDir, 'release', 'latest.json');
if (fs.existsSync(latestPath)) {
  const latestJson = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
  assert(latestJson.version === authoritativeVersion, `release/latest.json version matches (${latestJson.version} === ${authoritativeVersion})`);
}

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) process.exit(1);
