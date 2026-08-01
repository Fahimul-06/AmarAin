import { io, Socket } from 'socket.io-client';

const TOKEN_KEY = 'amar_ain_access_token';
let socket: Socket | null = null;

export function getRealtimeSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: localStorage.getItem(TOKEN_KEY) }),
    });
  }
  if (!socket.connected) {
    socket.auth = { token: localStorage.getItem(TOKEN_KEY) };
    socket.connect();
  }
  return socket;
}

export function disconnectRealtimeSocket() {
  socket?.disconnect();
  socket = null;
}
