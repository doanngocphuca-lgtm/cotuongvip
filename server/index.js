const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Lưu danh sách phòng
const rooms = {};

/*
rooms = {
  roomId: {
    players: [socketId1, socketId2],
    board: {},
    turn: "red"
  }
}
*/

// Test route
app.get("/", (req, res) => {
  res.send("🔥 CotuongVIP Server is running");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // =============================
  // TẠO PHÒNG
  // =============================
  socket.on("create-room", (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8);

    rooms[roomId] = {
      players: [socket.id],
      board: null,
      turn: "red",
    };

    socket.join(roomId);

    callback({
      roomId,
      color: "red",
    });

    console.log("Room created:", roomId);
  });

  // =============================
  // THAM GIA PHÒNG
  // =============================
  socket.on("join-room", ({ roomId }, callback) => {
    const room = rooms[roomId];

    if (!room) {
      return callback({ error: "Phòng không tồn tại" });
    }

    if (room.players.length >= 2) {
      return callback({ error: "Phòng đã đủ người" });
    }

    room.players.push(socket.id);
    socket.join(roomId);

    callback({
      roomId,
      color: "black",
    });

    // Báo cho phòng biết đã đủ 2 người
    io.to(roomId).emit("start-game");

    console.log("User joined room:", roomId);
  });

  // =============================
  // DI CHUYỂN QUÂN CỜ
  // =============================
  socket.on("move", ({ roomId, move }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Đổi lượt
    room.turn = room.turn === "red" ? "black" : "red";

    socket.to(roomId).emit("move", {
      move,
      turn: room.turn,
    });
  });

  // =============================
  // THOÁT PHÒNG
  // =============================
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

// ⚠ QUAN TRỌNG CHO RENDER
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});