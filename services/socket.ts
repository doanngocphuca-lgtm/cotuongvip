import { io } from "socket.io-client";

export const socket = io("https://cotuongvip.onrender.com", {
  transports: ["websocket"],
  secure: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});