// Canonical SystemPilot Semantic Versioning Engine
// Single source of truth for runtime version parsing and comparison

import { api } from '../tauriApi.js';

// Fallback version matching package.json and Cargo.toml
export const FALLBACK_VERSION = '0.0.3';

/**
 * Parses a semantic version string into structured parts.
 * Supports standard semver: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
 * @param {string} verStr 
 * @returns {{ major: number, minor: number, patch: number, prerelease: string|null, raw: string }}
 */
export function parseSemVer(verStr) {
  if (!verStr || typeof verStr !== 'string') {
    return { major: 0, minor: 0, patch: 0, prerelease: null, raw: '0.0.0' };
  }

  // Remove leading 'v' or 'V' and trim whitespace
  const clean = verStr.trim().replace(/^v/i, '');
  
  // Split pre-release / build metadata
  const [mainPart, ...rest] = clean.split('-');
  const prerelease = rest.length > 0 ? rest.join('-').split('+')[0] : null;

  const parts = mainPart.split('.').map(p => parseInt(p, 10) || 0);
  
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    prerelease,
    raw: clean,
  };
}

/**
 * Compares two semantic version strings.
 * Returns:
 *   -1 if v1 < v2
 *    0 if v1 === v2
 *    1 if v1 > v2
 * @param {string} v1 
 * @param {string} v2 
 * @returns {number}
 */
export function compareSemVer(v1, v2) {
  const p1 = parseSemVer(v1);
  const p2 = parseSemVer(v2);

  if (p1.major !== p2.major) {
    return p1.major > p2.major ? 1 : -1;
  }
  if (p1.minor !== p2.minor) {
    return p1.minor > p2.minor ? 1 : -1;
  }
  if (p1.patch !== p2.patch) {
    return p1.patch > p2.patch ? 1 : -1;
  }

  // If numeric parts are equal, check pre-release
  // A version without a pre-release tag is greater than one with a pre-release tag (e.g. 1.0.0 > 1.0.0-beta)
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && !p2.prerelease) return -1;
  if (p1.prerelease && p2.prerelease) {
    return p1.prerelease.localeCompare(p2.prerelease);
  }

  return 0;
}

/**
 * Checks if latestVersion is strictly newer than currentVersion.
 * @param {string} currentVersion 
 * @param {string} latestVersion 
 * @returns {boolean}
 */
export function isNewerVersion(currentVersion, latestVersion) {
  return compareSemVer(currentVersion, latestVersion) < 0;
}

/**
 * Retrieves the current installed version from native backend or fallback.
 * @returns {Promise<string>}
 */
export async function getCurrentAppVersion() {
  try {
    const info = await api.getAppVersion();
    if (info && info.version) {
      return info.version;
    }
  } catch (e) {
    // Non-fatal, fallback to bundled version
  }
  return FALLBACK_VERSION;
}
