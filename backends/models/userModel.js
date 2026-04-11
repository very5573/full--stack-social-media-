import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, sparse: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    bio: { type: String, maxlength: 200, default: "" },
    gender: { type: String, enum: ["male", "female", "other"] },
    avatar: { public_id: String, url: String },
    profilePicture: String,
    isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// 🔐 Hash password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// 🔑 Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ✅ Generate Access Token
userSchema.methods.getAccessToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "15m" }
  );
};

// ✅ Generate Refresh Token
userSchema.methods.getRefreshToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || "7d" }
  );
};

// Clear refresh token
userSchema.methods.clearRefreshToken = async function () {
  this.refreshToken = null;
  await this.save({ validateBeforeSave: false });
};

// 🔹 Named exports for tokens (so sendToken can import)
export const generateAccessToken = (user) => user.getAccessToken();
export const generateRefreshToken = (user) => user.getRefreshToken();

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
