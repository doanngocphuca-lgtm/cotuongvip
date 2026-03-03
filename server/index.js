const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

/* =========================
   CORS (ĐƠN GIẢN & ỔN ĐỊNH)
========================= */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/* =========================
   LƯU PHÒNG
========================= */
const rooms = {};

/* =========================
   TEST ROUTE
========================= */
app.get("/", (req, res) => {
  res.send("🔥 CotuongVIP Server is running");
});

/* =========================
   SOCKET EVENTS
========================= */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Tạo phòng
  socket.on("create-room", (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8);

    rooms[roomId] = {
      players: [socket.id],
      turn: "red"
    };

    socket.join(roomId);

    callback({ roomId, color: "red" });

    console.log("Room created:", roomId);
  });

  // Tham gia phòng
  socket.on("join-room", ({ roomId }, callback) => {
    const room = rooms[roomId];

    if (!room) {
      return callback({ error: "Room not found" });
    }

    if (room.players.length >= 2) {
      return callback({ error: "Room full" });
    }

    room.players.push(socket.id);
    socket.join(roomId);

    callback({ roomId, color: "black" });

    io.to(roomId).emit("start-game");

    console.log("User joined room:", roomId);
  });

  // Di chuyển
  socket.on("move", ({ roomId, move }) => {
    socket.to(roomId).emit("move", move);
  });

  // Ngắt kết nối
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (const roomId in rooms) {
      const room = rooms[roomId];

      if (room.players.includes(socket.id)) {
        io.to(roomId).emit("player-disconnected");
        delete rooms[roomId];
        console.log("Room deleted:", roomId);
      }
    }
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});