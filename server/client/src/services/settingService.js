import api from './api';

export const settingService = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export default settingService;
