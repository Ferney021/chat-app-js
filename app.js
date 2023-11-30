const express = require("express");

const app = express();
const http = require("http").Server(app);

const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const cors = require("cors");

app.use(express.static("public"));

/** Manage behavior of each client socket connection */
io.on("connection", (socket) => {
  console.log(`User Connected - Socket ID ${socket.id}`);

  let currentRoom = null;

  /** Process a room join request. */
  socket.on("JOIN", (roomName) => {
    let room = socket.adapter.rooms.get(roomName);

    if (room && room.size > 1) {
      io.to(socket.id).emit("ROOM_FULL", null);

      socket.broadcast.to(roomName).emit("INTRUSION_ATTEMPT", null);
    } else {
      socket.leave(currentRoom);

      socket.broadcast.to(currentRoom).emit("USER_DISCONNECTED", null);

      currentRoom = roomName;
      socket.join(currentRoom);

      io.to(socket.id).emit("ROOM_JOINED", currentRoom);

      socket.broadcast.to(currentRoom).emit("NEW_CONNECTION", null);
    }
  });

  /** Broadcast a received message to the room */
  socket.on("MESSAGE", (msg) => {
    console.log(`New Message - ${msg.text}`);
    socket.broadcast.to(currentRoom).emit("MESSAGE", msg);
  });

  /** Broadcast a new publickey to the room */
  socket.on("PUBLIC_KEY", (key) => {
    socket.broadcast.to(currentRoom).emit("PUBLIC_KEY", key);
  });

  /** Broadcast a disconnection notification to the room */
  socket.on("disconnect", () => {
    console.log("Desconexion");
    socket.broadcast.to(currentRoom).emit("USER_DISCONNECTED", null);
  });
});

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`Chat server listening on port ${port}.`);
});
