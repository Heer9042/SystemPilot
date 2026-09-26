// SystemPilot Canonical In-App Update Service
// Coordinates GitHub Releases, SHA-256 Verification, Tauri Native Integration, and UI State

import { api } from '../tauriApi';
import { getCurrentAppVersion, isNewerVersion, APP_VERSION } from './version';
import {
  UpdateStatus,
  UpdateChannel,
  GITHUB_API_LATEST_RELEASE,
  GITHUB_RELEASES_URL,
} from './updateTypes';

class UpdateService {
  constructor() {
    this.state = {
      status: UpdateStatus.IDLE,
      currentVersion: APP_VERSION,
      latestRelease: null,
      error: null,
      progress: null,
      lastChecked: null,
      autoCheckEnabled: true,
      dismissedVersion: null,
      skippedVersion: null,
      modalOpen: false,
      bannerVisible: false,
      isChecking: false,
      channel: UpdateChannel.STABLE,
      verifiedInstallerPath: null,
      verifiedSha256: null,
    };
    this.listeners = new Set();
    this.initialized = false;
  }

  /**
   * Subscribe to updater state changes (used by React hook useUpdater)
   */
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (e) {
        console.error('Updater listener error:', e);
      }
    }
  }

  updateState(partial) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  /**
   * Initializes the updater service, loads settings from SQLite, and triggers non-blocking background check
   */
  async init() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      // 1. Fetch exact runtime version from backend
      const currentVer = await getCurrentAppVersion();

      // 2. Attach native progress event listener from Rust
      try {
        await api.listenUpdateProgress((payload) => {
          if (!payload) return;
          const stage = payload.stage;
          let nextStatus = this.state.status;

          if (stage === 'downloading') {
            nextStatus = UpdateStatus.DOWNLOADING;
          } else if (stage === 'verifying') {
            nextStatus = UpdateStatus.VERIFYING;
          } else if (stage === 'ready') {
            nextStatus = UpdateStatus.RESTART_REQUIRED;
          }

          const downloadedBytes = payload.downloaded_bytes || 0;
          const totalBytes = payload.total_bytes || 0;
          const downloadedMb = downloadedBytes > 0 ? (downloadedBytes / (1024 * 1024)).toFixed(1) : null;
          const totalMb = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : null;
          const percentage = Math.round(payload.percentage || 0);

          let progressText = payload.message || 'Processing update...';
          if (downloadedMb && totalMb && parseFloat(totalMb) > 0) {
            progressText = `Downloaded: ${downloadedMb} MB / ${totalMb} MB (${percentage}%)`;
          }

          this.updateState({
            status: nextStatus,
            progress: {
              percentage,
              downloadedBytes,
              totalBytes,
              downloadedMb,
              totalMb,
              text: progressText,
            },
          });
        });
      } catch (e) {
        console.warn('Could not bind update-progress event listener:', e);
      }
      
      // 3. Fetch persistence from SQLite
      let autoCheck = true;
      let lastChecked = null;
      let dismissed = null;
      let skipped = null;

      try {
        const settings = await api.getSettings();
        if (settings) {
          if (settings.auto_check_updates !== undefined) {
            autoCheck = settings.auto_check_updates === 'true';
          }
          if (settings.last_update_check) {
            lastChecked = new Date(settings.last_update_check);
          }
          dismissed = settings.dismissed_update_version || null;
          skipped = settings.skipped_update_version || null;
        }
      } catch (e) {
        console.warn('Could not read updater settings from SQLite:', e);
      }

      this.updateState({
        currentVersion: currentVer,
        autoCheckEnabled: autoCheck,
        lastChecked,
        dismissedVersion: dismissed,
        skippedVersion: skipped,
      });

      // 4. Background non-blocking check if enabled and network is available
      if (autoCheck) {
        // Run after initial rendering has settled (3.5s delay)
        setTimeout(() => {
          this.checkForUpdates({ isManual: false, silent: true });
        }, 3500);
      }
    } catch (e) {
      console.error('Updater initialization error:', e);
    }
  }

  /**
   * Check official update metadata (latest.json or GitHub API) for newer versions
   */
  async checkForUpdates({ isManual = false, silent = false } = {}) {
    if (this.state.isChecking) return;

    // Check offline status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateState({
        status: isManual ? UpdateStatus.OFFLINE : UpdateStatus.IDLE,
        isChecking: false,
        error: 'No internet connection. SystemPilot is operating in offline mode.',
        modalOpen: isManual,
      });
      return;
    }

    this.updateState({
      status: UpdateStatus.CHECKING,
      isChecking: true,
      error: null,
      modalOpen: isManual ? true : this.state.modalOpen,
    });

    const now = new Date();

    try {
      let releaseInfo = null;
      let latestVersion = null;
      let hasUpdate = false;

      // 1. First attempt: Check direct HTTPS latest.json release manifest
      try {
        const manifestController = new AbortController();
        const mTimeout = setTimeout(() => manifestController.abort(), 6000);
        const manifestUrl = 'https://raw.githubusercontent.com/Heer9042/SystemPilot/main/release/latest.json';
        const mResp = await fetch(manifestUrl, {
          signal: manifestController.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });
        clearTimeout(mTimeout);

        if (mResp.ok) {
          const mData = await mResp.json();
          if (mData.version && mData.downloadUrl) {
            latestVersion = mData.version.replace(/^v/i, '').trim();
            const currentVersion = this.state.currentVersion;
            hasUpdate = isNewerVersion(currentVersion, latestVersion);

            releaseInfo = {
              version: latestVersion,
              rawTag: `v${latestVersion}`,
              name: `SystemPilot v${latestVersion}`,
              publishedAt: mData.publishedAt ? new Date(mData.publishedAt).toLocaleDateString() : 'Recent',
              body: mData.releaseNotes || 'Performance optimizations, security improvements, and bug fixes.',
              htmlUrl: `https://github.com/Heer9042/SystemPilot/releases/tag/v${latestVersion}`,
              downloadUrl: mData.downloadUrl,
              expectedSha256: mData.sha256 || null,
              mandatory: Boolean(mData.mandatory),
            };
          }
        }
      } catch (e) {
        console.warn('latest.json manifest check skipped:', e);
      }

      // 2. Fallback to GitHub Releases API if manifest was not resolved
      if (!releaseInfo) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(GITHUB_API_LATEST_RELEASE, {
          signal: controller.signal,
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            this.updateState({
              status: UpdateStatus.UP_TO_DATE,
              isChecking: false,
              lastChecked: now,
              error: null,
            });
            return;
          }
          if (response.status === 403 || response.status === 429) {
            throw new Error('Update server request limit reached. Please try again later.');
          }
          throw new Error(`Update server returned status ${response.status}`);
        }

        const data = await response.json();
        const latestTag = data.tag_name || '';
        latestVersion = latestTag.replace(/^v/i, '').trim();
        const currentVersion = this.state.currentVersion;
        hasUpdate = isNewerVersion(currentVersion, latestVersion);

        const assets = Array.isArray(data.assets) ? data.assets : [];
        const exeAsset = assets.find(a => a.name?.toLowerCase().endsWith('.exe'));
        const msiAsset = assets.find(a => a.name?.toLowerCase().endsWith('.msi'));
        const zipAsset = assets.find(a => a.name?.toLowerCase().endsWith('.zip'));
        const sha256Asset = assets.find(a => a.name?.toLowerCase() === 'sha256sums.txt');
        
        let expectedSha256 = null;
        if (sha256Asset && sha256Asset.browser_download_url) {
          try {
            const sumResp = await fetch(sha256Asset.browser_download_url);
            if (sumResp.ok) {
              const sumText = await sumResp.text();
              const targetFilename = exeAsset?.name || msiAsset?.name;
              if (targetFilename) {
                const match = sumText.split('\n').find(line => line.includes(targetFilename));
                if (match) {
                  expectedSha256 = match.trim().split(/\s+/)[0];
                }
              }
            }
          } catch (e) {
            console.warn('Could not fetch SHA256SUMS.txt manifest:', e);
          }
        }

        const downloadUrl = exeAsset?.browser_download_url || msiAsset?.browser_download_url || data.html_url || GITHUB_RELEASES_URL;

        releaseInfo = {
          version: latestVersion,
          rawTag: latestTag,
          name: data.name || `SystemPilot v${latestVersion}`,
          publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString() : 'Recent',
          body: data.body || 'Performance optimizations, security improvements, and bug fixes.',
          htmlUrl: data.html_url || GITHUB_RELEASES_URL,
          downloadUrl,
          expectedSha256,
          exeAsset,
          msiAsset,
          zipAsset,
          mandatory: false,
        };
      }

      // Persist last_update_check timestamp in SQLite
      try {
        await api.setSetting('last_update_check', now.toISOString());
      } catch (e) {}

      if (hasUpdate && releaseInfo) {
        const isSkipped = this.state.skippedVersion === latestVersion;
        const isDismissed = this.state.dismissedVersion === latestVersion;

        const shouldShowBanner = !isSkipped && (!isDismissed || isManual);
        const shouldOpenModal = isManual;

        this.updateState({
          status: UpdateStatus.AVAILABLE,
          latestRelease: releaseInfo,
          lastChecked: now,
          isChecking: false,
          bannerVisible: shouldShowBanner,
          modalOpen: shouldOpenModal,
          error: null,
        });
      } else {
        this.updateState({
          status: UpdateStatus.UP_TO_DATE,
          latestRelease: null,
          lastChecked: now,
          isChecking: false,
          bannerVisible: false,
          error: null,
        });
      }
    } catch (err) {
      console.warn('Update check failed gracefully:', err);
      const isAbort = err.name === 'AbortError';
      const userMessage = isAbort
        ? 'Update check timed out. Please verify your internet connection.'
        : (err.message || 'Unable to connect to update service.');

      this.updateState({
        status: isManual ? UpdateStatus.ERROR : UpdateStatus.IDLE,
        isChecking: false,
        error: userMessage,
        modalOpen: isManual,
      });
    }
  }

  /**
   * User clicked "Update Now" — Performs direct in-app download and verification without opening browser
   */
  async downloadAndInstallUpdate() {
    if (!this.state.latestRelease) return;

    const { downloadUrl, expectedSha256 } = this.state.latestRelease;

    this.updateState({
      status: UpdateStatus.DOWNLOADING,
      error: null,
      progress: { percentage: 5, text: 'Connecting to secure update service...' },
      modalOpen: true,
    });

    try {
      if (api.isNative()) {
        const verificationResult = await api.downloadAndVerifyUpdate(downloadUrl, expectedSha256);
        
        if (verificationResult && verificationResult.is_verified) {
          this.updateState({
            status: UpdateStatus.RESTART_REQUIRED,
            verifiedInstallerPath: verificationResult.local_path,
            verifiedSha256: verificationResult.calculated_sha256,
            progress: { percentage: 100, text: 'Update package verified successfully. Ready to install.' },
          });
        } else {
          throw new Error(verificationResult?.error_message || 'Verification of downloaded package failed.');
        }
      } else {
        // In web preview fallback
        setTimeout(() => {
          this.updateState({
            status: UpdateStatus.RESTART_REQUIRED,
            progress: { percentage: 100, text: 'Update package verified. Ready to apply.' },
          });
        }, 1500);
      }
    } catch (e) {
      console.error('Update download/verification failed:', e);
      this.updateState({
        status: UpdateStatus.ERROR,
        error: e.message || 'Failed to download and verify the update.',
      });
    }
  }

  /**
   * User clicked "Restart & Apply Update"
   */
  async restartAndApplyUpdate() {
    if (!this.state.verifiedInstallerPath) {
      // If path not set, fallback to download
      return this.downloadAndInstallUpdate();
    }

    this.updateState({
      status: UpdateStatus.INSTALLING,
      progress: { percentage: 100, text: 'Starting update installation and restarting SystemPilot...' },
    });

    try {
      if (api.isNative()) {
        await api.installUpdateAndRestart(this.state.verifiedInstallerPath);
      }
    } catch (e) {
      this.updateState({
        status: UpdateStatus.ERROR,
        error: `Could not start update installer: ${e.message || e}`,
      });
    }
  }

  /**
   * User clicked "Later" - dismisses notification for current session / version
   */
  async dismissUpdate() {
    const version = this.state.latestRelease?.version;
    this.updateState({
      modalOpen: false,
      bannerVisible: false,
      dismissedVersion: version,
    });

    if (version) {
      try {
        await api.setSetting('dismissed_update_version', version);
      } catch (e) {}
    }
  }

  /**
   * User clicked "Skip this version" - skips this specific version permanently
   */
  async skipVersion(versionToSkip) {
    const version = versionToSkip || this.state.latestRelease?.version;
    this.updateState({
      modalOpen: false,
      bannerVisible: false,
      skippedVersion: version,
    });

    if (version) {
      try {
        await api.setSetting('skipped_update_version', version);
      } catch (e) {}
    }
  }

  /**
   * Opens official GitHub release page or release notes in default browser
   */
  async openReleaseNotes(url) {
    let targetUrl = url || this.state.latestRelease?.htmlUrl || GITHUB_RELEASES_URL;
    
    // Safety check: Never open a direct binary download URL in the browser
    if (targetUrl.includes('/releases/download/')) {
      if (this.state.latestRelease?.rawTag) {
        targetUrl = `https://github.com/Heer9042/SystemPilot/releases/tag/${this.state.latestRelease.rawTag}`;
      } else {
        targetUrl = this.state.latestRelease?.htmlUrl || GITHUB_RELEASES_URL;
      }
    }

    try {
      await api.openReleaseNotes(targetUrl);
    } catch (e) {
      if (typeof window !== 'undefined') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  }

  /**
   * Toggle automatic update checking preference
   */
  async setAutoCheck(enabled) {
    this.updateState({ autoCheckEnabled: enabled });
    try {
      await api.setSetting('auto_check_updates', String(enabled));
    } catch (e) {}
  }

  openModal() {
    this.updateState({ modalOpen: true });
  }

  closeModal() {
    this.updateState({ modalOpen: false });
  }
}

export const updateService = new UpdateService();
