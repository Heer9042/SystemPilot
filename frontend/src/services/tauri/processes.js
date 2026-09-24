import { api } from '../tauriApi';

export const processService = {
  getProcesses: () => api.getProcesses(),
  terminateProcess: (pid) => api.terminateProcess(pid),
  setProcessPriority: (pid, priority) => api.setProcessPriority(pid, priority),
  setProcessAffinity: (pid, affinityMask) => api.setProcessAffinity(pid, affinityMask),
  suspendProcess: (pid) => api.suspendProcess(pid),
  resumeProcess: (pid) => api.resumeProcess(pid),
};

export default processService;
