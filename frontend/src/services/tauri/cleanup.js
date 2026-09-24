import { api } from '../tauriApi';

export const cleanupService = {
  scanCleanableItems: () => api.scanCleanableItems(),
  executeCleanup: (categoryIds) => api.executeCleanup(categoryIds),
  getCleanupHistory: () => api.getCleanupHistory(),
};

export default cleanupService;
