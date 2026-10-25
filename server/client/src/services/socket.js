import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const SOCKET_URL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000';

    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Real-time connection established:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection warning:', err.message);
    });
  }
  return socket;
};

export const subscribeToEvents = (handlers = {}) => {
  const s = getSocket();

  if (handlers.onBookUpdated) s.on('book_updated', handlers.onBookUpdated);
  if (handlers.onRequestUpdated) s.on('request_updated', handlers.onRequestUpdated);
  if (handlers.onReservationUpdated) s.on('reservation_updated', handlers.onReservationUpdated);
  if (handlers.onIssueUpdated) s.on('issue_updated', handlers.onIssueUpdated);

  return () => {
    if (handlers.onBookUpdated) s.off('book_updated', handlers.onBookUpdated);
    if (handlers.onRequestUpdated) s.off('request_updated', handlers.onRequestUpdated);
    if (handlers.onReservationUpdated) s.off('reservation_updated', handlers.onReservationUpdated);
    if (handlers.onIssueUpdated) s.off('issue_updated', handlers.onIssueUpdated);
  };
};
