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
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);

    const clients = io.sockets.adapter.rooms.get(roomId);
    const size = clients ? clients.size : 0;

    console.log("Room:", roomId, "Size:", size);

    // 🔥 Thay vì room-ready
    io.to(roomId).emit("room-update", size);
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