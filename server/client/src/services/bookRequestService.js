import api from './api';

export const bookRequestService = {
  create: (bookId) => api.post('/book-requests', { bookId }),
  getMine: () => api.get('/book-requests/my'),
  getAll: (params = {}) => api.get('/book-requests', { params }),
  approve: (id) => api.put(`/book-requests/${id}/approve`),
  reject: (id, reason) => api.put(`/book-requests/${id}/reject`, { reason }),
  cancel: (id) => api.delete(`/book-requests/${id}`),
};

export default bookRequestService;
