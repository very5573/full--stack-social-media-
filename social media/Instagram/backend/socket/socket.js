import express from "express";
import { Server } from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);

const userSocketMap = {}; // userId => Set of socketIds

const io = new Server(server, {
  cors: {
    origin: process.env.URL || "http://localhost:3000", // fallback
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Utility: get all socketIds for a receiver
const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId]
    ? Array.from(userSocketMap[receiverId])
    : [];
};

// Connection logic
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (!userId) {
    console.warn("User ID missing in socket connection");
    return;
  }

  // Add socket to map
  if (!userSocketMap[userId]) {
    userSocketMap[userId] = new Set();
  }
  userSocketMap[userId].add(socket.id);

  // Notify all clients about updated online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Optional: Handle custom events like direct notifications
  socket.on("sendNotification", ({ receiverId, notification }) => {
    const receiverSockets = getReceiverSocketId(receiverId);
    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("notification", notification);
    });
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    userSocketMap[userId]?.delete(socket.id);

    if (userSocketMap[userId]?.size === 0) {
      delete userSocketMap[userId];
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, server, io, getReceiverSocketId };
