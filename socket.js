import { io } from 'socket.io-client';

const SOCKET_URL = "https://mafia-server-bp45.onrender.com";

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;