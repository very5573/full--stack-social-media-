"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import API from "../../../utils/axiosInstance";

import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CircularProgress from "@mui/material/CircularProgress";

import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "../../../redux/slices/authslice";

export default function Login() {
  const router = useRouter();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ✅ Already logged-in user → Home */
  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { email, password } = formData;

    if (!email || !password) {
      toast.error("All fields are required!");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email format!");
      return false;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters!");
      return false;
    }

    return true;
  };

  const loginHandler = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      /* 1️⃣ Login API */
      await API.post("/login", formData);

      toast.success("✅ Logged in successfully!");

      /* 2️⃣ Fetch user & wait for Redux update */
      await dispatch(fetchUser()).unwrap();

      /* 3️⃣ Redirect to home */
      router.replace("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-6">
      <div className="w-full max-w-sm space-y-8">
        <h2 className="text-center text-2xl font-bold tracking-tight text-white">
          Sign in to your account
        </h2>

        <form onSubmit={loginHandler} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-200">
              Email address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className="mt-2 w-full rounded-md bg-white/5 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-2 focus:outline-indigo-500 disabled:opacity-60"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-200">
              Password
            </label>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                className="w-full rounded-md bg-white/5 px-3 py-2 pr-10 text-white outline outline-1 outline-white/10 focus:outline-2 focus:outline-indigo-500 disabled:opacity-60"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowPassword((p) => !p)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white disabled:opacity-50"
              >
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <CircularProgress size={18} thickness={5} color="inherit" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Not a member?{" "}
          <span
            onClick={() => router.push("/auth/register")}
            className="cursor-pointer font-semibold text-indigo-400 hover:text-indigo-300"
          >
            Create an account
          </span>
        </p>
      </div>
    </div>
  );
}
