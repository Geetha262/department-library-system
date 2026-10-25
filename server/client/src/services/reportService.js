import api from './api';

export const reportService = {
  getDeptBooks: () => api.get('/reports/department-books'),
  getDeptStudents: () => api.get('/reports/department-students'),
  getIssues: (params = {}) => api.get('/reports/issues', { params }),
  getReturns: (params = {}) => api.get('/reports/returns', { params }),
  getOverdue: (params = {}) => api.get('/reports/overdue', { params }),
  getFines: (params = {}) => api.get('/reports/fines', { params }),
};

export default reportService;
