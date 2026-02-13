import { formatUser } from "../utils/formatUser.js";
import bcrypt from "bcryptjs";

const sendToken = async (user, statusCode, res) => {
  try {
    // 🔐 Generate tokens
    const accessToken = user.getAccessToken();
    const refreshToken = user.getRefreshToken();

    // 💾 Hash refresh token before saving in DB
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    user.refreshToken = hashedRefreshToken;
    await user.save({ validateBeforeSave: false });

    const isProduction = process.env.NODE_ENV === "production";

    // 🍪 Cookie options (Production SAFE → force None for cross-domain)
    const cookieOptions = (expiresIn) => ({
      expires: new Date(Date.now() + expiresIn),
      httpOnly: true,          // JS cannot access cookie
      secure: isProduction,    // ✅ Only HTTPS in production
      sameSite: "None",        // ✅ Required for cross-domain cookies
      path: "/",
    });

    // 🚀 Send response + set cookies
    res
      .status(statusCode)
      .cookie("accessToken", accessToken, cookieOptions(15 * 60 * 1000)) // 15 min
      .cookie(
        "refreshToken",
        refreshToken,  // Keep cookie as plain JWT for client usage, DB has hash
        cookieOptions(7 * 24 * 60 * 60 * 1000) // 7 days
      )
      .json({
        success: true,
        user: formatUser(user),
      });

    // 📝 Debugging logs only in production
    if (isProduction) {
      console.log("✅ Tokens sent for user:", user.email);
      console.log("🔐 Access Token (cookie):", accessToken);
      console.log("🔐 Refresh Token (cookie):", refreshToken);
      console.log("🍪 Cookie Options (Access):", cookieOptions(15 * 60 * 1000));
      console.log("🍪 Cookie Options (Refresh):", cookieOptions(7 * 24 * 60 * 60 * 1000));
    }
  } catch (err) {
    console.error("💥 sendToken error:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while sending tokens",
    });
  }
};

export default sendToken;
