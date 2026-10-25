import api from './api';
import bookRequestService from './bookRequestService';

export { bookRequestService };

export const issueService = {
  getAll: (params = {}) => api.get('/issues', { params }),
  getOverdue: (params = {}) => api.get('/issues/overdue', { params }),
  getById: (id) => api.get(`/issues/${id}`),
  create: (data) => api.post('/issues', data),
  request: (bookId) => api.post(`/issues/request`, { bookId }),
};

export const reservationService = {
  getAll: (params = {}) => api.get('/reservations', { params }),
  getMine: () => api.get('/reservations/my'),
  create: (bookId) => api.post(`/books/${bookId}/reserve`),
  getById: (id) => api.get(`/reservations/${id}`),
  cancel: (id, reason) => api.patch(`/reservations/${id}/cancel`, { reason }),
};

export const wishlistService = {
  getMine: () => api.get('/wishlist'),
  add: (bookId) => api.post(`/books/${bookId}/wishlist`),
  remove: (bookId) => api.delete(`/books/${bookId}/wishlist`),
};

export const returnService = {
  getAll: (params = {}) => api.get('/returns', { params }),
  searchLoan: (query) => api.get('/returns/search-loan', { params: { query } }),
  create: (data) => api.post('/returns', data),
};

export const fineService = {
  getAll: (params = {}) => api.get('/fines', { params }),
  payFine: (id) => api.put(`/fines/${id}/pay`),
};

export default {
  issueService,
  returnService,
  fineService,
  reservationService,
  wishlistService,
  bookRequestService,
};
