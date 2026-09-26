import { useState, useEffect } from 'react';
import { updateService } from '../services/updates/updateService';

/**
 * React hook to bind components to the central updateService
 */
export function useUpdater() {
  const [state, setState] = useState(updateService.state);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = updateService.subscribe((newState) => {
      setState(newState);
    });

    // Ensure update service is initialized once
    updateService.init();

    return unsubscribe;
  }, []);

  return {
    ...state,
    checkForUpdates: (opts) => updateService.checkForUpdates(opts),
    downloadAndInstallUpdate: () => updateService.downloadAndInstallUpdate(),
    restartAndApplyUpdate: () => updateService.restartAndApplyUpdate(),
    dismissUpdate: () => updateService.dismissUpdate(),
    skipVersion: (ver) => updateService.skipVersion(ver),
    openReleaseNotes: (url) => updateService.openReleaseNotes(url),
    setAutoCheck: (enabled) => updateService.setAutoCheck(enabled),
    openModal: () => updateService.openModal(),
    closeModal: () => updateService.closeModal(),
  };
}
