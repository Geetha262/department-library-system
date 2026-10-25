import { Server } from 'socket.io';

let io = null;

export const initSocket = (server, clientUrl) => {
  io = new Server(server, {
    cors: {
      origin: clientUrl || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('join_user_room', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect handling
    });
  });

  console.log('[Socket.IO] Real-time WebSocket server initialized');
  return io;
};

export const getIO = () => io;

export const emitEvent = (eventName, data, room = null) => {
  if (!io) return;
  if (room) {
    io.to(room).emit(eventName, data);
  } else {
    io.emit(eventName, data);
  }
};
