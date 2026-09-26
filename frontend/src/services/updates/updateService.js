// SystemPilot Canonical In-App Update Service
// Coordinates GitHub Releases, SHA-256 Verification, Tauri Native Integration, and UI State

import { api } from '../tauriApi';
import { getCurrentAppVersion, isNewerVersion } from './version';
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
      currentVersion: '0.0.2',
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

          this.updateState({
            status: nextStatus,
            progress: {
              percentage: Math.round(payload.percentage || 0),
              downloadedBytes: payload.downloaded_bytes || 0,
              totalBytes: payload.total_bytes || 0,
              text: payload.message || 'Processing update...',
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
   * Check GitHub Releases for newer official versions
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
          // No releases published yet on this repository
          this.updateState({
            status: UpdateStatus.UP_TO_DATE,
            isChecking: false,
            lastChecked: now,
            error: null,
          });
          return;
        }
        if (response.status === 403 || response.status === 429) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
        throw new Error(`GitHub server returned status ${response.status}`);
      }

      const data = await response.json();
      const latestTag = data.tag_name || '';
      const latestVersion = latestTag.replace(/^v/i, '').trim();
      const currentVersion = this.state.currentVersion;

      const hasUpdate = isNewerVersion(currentVersion, latestVersion);

      // Identify Windows Release Assets
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

      const releaseInfo = {
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
      };

      // Persist last_update_check timestamp in SQLite
      try {
        await api.setSetting('last_update_check', now.toISOString());
      } catch (e) {}

      if (hasUpdate) {
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
        : (err.message || 'Unable to connect to update server.');

      this.updateState({
        status: isManual ? UpdateStatus.ERROR : UpdateStatus.IDLE,
        isChecking: false,
        error: userMessage,
        modalOpen: isManual,
      });
    }
  }

  /**
   * User clicked "Update Now" — Performs secure in-app download and verification
   */
  async downloadAndInstallUpdate() {
    if (!this.state.latestRelease) return;

    const { downloadUrl, expectedSha256 } = this.state.latestRelease;

    this.updateState({
      status: UpdateStatus.DOWNLOADING,
      error: null,
      progress: { percentage: 10, text: 'Connecting to official release repository...' },
      modalOpen: true,
    });

    try {
      // If native Tauri environment is available, download and verify via native engine
      if (api.isNative()) {
        const verificationResult = await api.downloadAndVerifyUpdate(downloadUrl, expectedSha256);
        
        if (verificationResult && verificationResult.is_verified) {
          this.updateState({
            status: UpdateStatus.RESTART_REQUIRED,
            verifiedInstallerPath: verificationResult.local_path,
            verifiedSha256: verificationResult.calculated_sha256,
            progress: { percentage: 100, text: 'Update package verified. Ready to apply.' },
          });
        } else {
          throw new Error(verificationResult?.error_message || 'Verification of downloaded binary failed.');
        }
      } else {
        // In browser development mock fallback
        setTimeout(() => {
          this.updateState({
            status: UpdateStatus.RESTART_REQUIRED,
            progress: { percentage: 100, text: 'Simulated update download completed.' },
          });
        }, 1500);
      }
    } catch (e) {
      console.error('Update download/verification failed:', e);
      this.updateState({
        status: UpdateStatus.ERROR,
        error: e.message || 'Failed to securely download and verify the update.',
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
      progress: { percentage: 100, text: 'Launching Windows installer and restarting...' },
    });

    try {
      if (api.isNative()) {
        await api.installUpdateAndRestart(this.state.verifiedInstallerPath);
      }
    } catch (e) {
      this.updateState({
        status: UpdateStatus.ERROR,
        error: `Failed to launch installer: ${e.message || e}`,
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
    const targetUrl = url || this.state.latestRelease?.htmlUrl || GITHUB_RELEASES_URL;
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
