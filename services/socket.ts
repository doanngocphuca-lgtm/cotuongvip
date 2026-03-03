import { io } from "socket.io-client";

export const socket = io("https://cotuongvip.onrender.com", {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: false // QUAN TRỌNG
});

socket.on("connect", () => {
  console.log("✅ CONNECTED:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ DISCONNECTED:", reason);
});

socket.on("connect_error", (err) => {
  console.log("⚠ CONNECT ERROR:", err.message);
});