const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get("/", (req, res) => {
  res.send("🔥 CotuongVIP Server is running");
});

/*
rooms = {
  roomId: {
    players: [socketId1, socketId2],
    turn: "red"
  }
}
*/
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // =====================
  // TẠO PHÒNG
  // =====================
  socket.on("create-room", (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8);

    rooms[roomId] = {
      players: [socket.id],
      turn: "red"
    };

    socket.join(roomId);

    callback({
      roomId,
      color: "red"
    });

    console.log("Room created:", roomId);
  });

  // =====================
  // JOIN PHÒNG
  // =====================
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
      color: "black"
    });

    io.to(roomId).emit("start-game");

    console.log("User joined:", roomId);
  });

  // =====================
  // DI CHUYỂN
  // =====================
  socket.on("move", ({ roomId, move }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Đổi lượt
    room.turn = room.turn === "red" ? "black" : "red";

    // Gửi cho cả phòng
    io.to(roomId).emit("move", {
      move,
      turn: room.turn
    });
  });

  // =====================
  // DISCONNECT
  // =====================
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

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});