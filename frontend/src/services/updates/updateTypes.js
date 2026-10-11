// SystemPilot Update Status & Action Enums

export const UpdateStatus = {
  IDLE: 'idle',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  UP_TO_DATE: 'up_to_date',
  DOWNLOADING: 'downloading',
  VERIFYING: 'verifying',
  INSTALLING: 'installing',
  RESTART_REQUIRED: 'restart_required',
  ERROR: 'error',
  OFFLINE: 'offline',
};

export const UpdateChannel = {
  STABLE: 'stable',
};

export const REPO_OWNER = 'Heer9042';
export const REPO_NAME = 'SystemPilot';
export const GITHUB_API_LATEST_RELEASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
export const GITHUB_RELEASES_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`;
export const GITHUB_LATEST_MANIFEST = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest/download/latest.json`;
