import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    image: {
      type: String, // cloudinary secure_url
      required: true,
    },

    imagePublicId: {
      type: String, // cloudinary public_id (delete ke liye)
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  {
    timestamps: true,
  }
);

/* =========================
   INDEXES (PERFORMANCE)
========================= */
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ likes: 1 });

const Post = mongoose.models.Post || mongoose.model("Post", postSchema);
export default Post;
