import { api } from '../tauriApi';

export const databaseService = {
  getSettings: () => api.getSettings(),
  setSetting: (key, value) => api.setSetting(key, value),
};

export default databaseService;
