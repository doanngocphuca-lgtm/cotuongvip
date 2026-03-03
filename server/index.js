const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("CotuongVIP Server is running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", (roomId) => {
    console.log("Joined room:", roomId);
    socket.join(roomId);

    const clients = io.sockets.adapter.rooms.get(roomId);
    console.log("Room size:", clients?.size);

    if (clients && clients.size === 2) {
      console.log("Game starting...");
      io.to(roomId).emit("room-ready");
    }
  });

  socket.on("move", ({ roomId, from, to, by }) => {
    socket.to(roomId).emit("opponent-move", { from, to, by });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});