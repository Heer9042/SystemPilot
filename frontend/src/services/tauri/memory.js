import { api } from '../tauriApi';

export const memoryService = {
  getDetailedMemoryStats: () => api.getDetailedMemoryStats(),
  cleanMemory: () => api.cleanMemory(),
};

export default memoryService;
