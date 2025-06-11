// index.js
import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";

import { app, server } from "./socket/socket.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));

// ✅ CORS updated with fallback
const corsOptions = {
  origin: process.env.URL || "http://localhost:3000",
  credentials: true,
};
app.use(cors(corsOptions));

// ✅ Routes

app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/message", messageRoute);

// ✅ Start server
server.listen(PORT, () => {
  connectDB();
  console.log(`Server listen at port ${PORT}`);
});
