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

/* TEST ROUTE */
app.get("/", (req, res) => {
  res.send("🔥 CotuongVIP Server is running");
});

/* ROOMS */
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create-room", (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8);

    rooms[roomId] = {
      players: [socket.id],
      turn: "red"
    };

    socket.join(roomId);

    callback({ roomId, color: "red" });
  });

  socket.on("join-room", ({ roomId }, callback) => {
    const room = rooms[roomId];

    if (!room) return callback({ error: "Room not found" });
    if (room.players.length >= 2) return callback({ error: "Room full" });

    room.players.push(socket.id);
    socket.join(roomId);

    callback({ roomId, color: "black" });

    io.to(roomId).emit("start-game");
  });

  socket.on("move", ({ roomId, move }) => {
    socket.to(roomId).emit("move", move);
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.players.includes(socket.id)) {
        io.to(roomId).emit("player-disconnected");
        delete rooms[roomId];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});