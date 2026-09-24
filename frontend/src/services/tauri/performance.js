import { api } from '../tauriApi';

export const performanceService = {
  getPowerPlans: () => api.getPowerPlans(),
  setPowerPlan: (guid) => api.setPowerPlan(guid),
  runCpuBenchmark: () => api.runCpuBenchmark(),
  runMemoryBenchmark: () => api.runMemoryBenchmark(),
  runDiskBenchmark: () => api.runDiskBenchmark(),
  startCpuStress: (threads) => api.startCpuStress(threads),
  stopCpuStress: () => api.stopCpuStress(),
  getBenchmarkHistory: () => api.getBenchmarkHistory(),
};

export default performanceService;
