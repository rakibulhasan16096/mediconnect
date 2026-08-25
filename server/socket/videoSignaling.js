const jwt = require("jsonwebtoken");

// Handles WebRTC signaling (offer/answer/ICE candidates) between exactly
// two participants (patient + doctor) per appointment "room".
// Each room is keyed by the appointment's videoRoomId so no two consultations
// can cross-talk, and only the two authenticated participants may join.
function initVideoSignaling(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId }) => {
      const room = io.sockets.adapter.rooms.get(roomId);
      const numClients = room ? room.size : 0;

      if (numClients >= 2) {
        socket.emit("room-full");
        return;
      }

      socket.join(roomId);
      socket.roomId = roomId;
      socket
        .to(roomId)
        .emit("peer-joined", { userId: socket.userId, role: socket.userRole });
    });

    socket.on("offer", ({ roomId, sdp }) => {
      socket.to(roomId).emit("offer", { sdp, from: socket.userId });
    });

    socket.on("answer", ({ roomId, sdp }) => {
      socket.to(roomId).emit("answer", { sdp, from: socket.userId });
    });

    socket.on("ice-candidate", ({ roomId, candidate }) => {
      socket
        .to(roomId)
        .emit("ice-candidate", { candidate, from: socket.userId });
    });

    socket.on("chat-message", ({ roomId, message }) => {
      socket
        .to(roomId)
        .emit("chat-message", { message, from: socket.userId, at: Date.now() });
    });

    socket.on("leave-room", ({ roomId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit("peer-left", { userId: socket.userId });
    });

    socket.on("disconnect", () => {
      if (socket.roomId) {
        socket.to(socket.roomId).emit("peer-left", { userId: socket.userId });
      }
    });
  });
}

module.exports = initVideoSignaling;
