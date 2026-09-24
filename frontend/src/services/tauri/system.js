import { api } from '../tauriApi';

export const systemService = {
  getSystemStats: () => api.getSystemStats(),
  getCpuInfo: () => api.getCpuInfo(),
  getGpuInfo: () => api.getGpuInfo(),
  getDiskDetails: () => api.getDiskDetails(),
  getNetworkDetails: () => api.getNetworkDetails(),
  getHardwareSummary: () => api.getHardwareSummary(),
  getSecurityStatus: () => api.getSecurityStatus(),
};

export default systemService;
