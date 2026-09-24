// Unit tests for SystemPilot Semantic Versioning and Update Logic

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

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) process.exit(1);
