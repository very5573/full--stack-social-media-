import express from "express";
import {
  addNewPost,
  getFeedPosts,
  getUserPost,
  likeOrUnlikePost,
  addComment,
  getCommentsOfPost,
  deletePost,
  bookmarkOrUnbookmarkPost,
} from "../controller/postcontroller.js";

import { isAuthenticatedUser } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   POSTS
========================= */

// create post
router.post("/post", isAuthenticatedUser, addNewPost);

// feed posts
router.get("/feed", isAuthenticatedUser, getFeedPosts);

// logged-in user's posts
router.get("/me", isAuthenticatedUser, getUserPost);

// delete post
router.delete("/:id", isAuthenticatedUser, deletePost);

/* =========================
   LIKES
========================= */

router.put("/:id/like", isAuthenticatedUser, likeOrUnlikePost);

/* =========================
   COMMENTS
========================= */

router.post("/:id/comment", isAuthenticatedUser, addComment);
router.get("/:id/comments", isAuthenticatedUser, getCommentsOfPost);

/* =========================
   BOOKMARKS
========================= */

router.put("/:id/bookmark", isAuthenticatedUser, bookmarkOrUnbookmarkPost);

export default router;
