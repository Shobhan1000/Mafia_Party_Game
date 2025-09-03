import { io } from "socket.io-client";

// use your Render URL instead of localhost
export const socket = io("https://mafia-server-bp45.onrender.com");
export default socket;
