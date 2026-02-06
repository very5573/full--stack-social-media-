import Post from "../models/postModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";

export const addNewPost = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authorId = req.id;
    const { caption, imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image URL is required"
      });
    }

    // create post
    const post = await Post.create(
      [
        {
          caption: caption?.trim() || "",
          image: imageUrl,
          author: authorId
        }
      ],
      { session }
    );

    // push post into user
    await User.updateOne(
      { _id: authorId },
      { $push: { posts: post[0]._id } },
      { session }
    );

    await session.commitTransaction();

    // populate author (safe fields only)
    await post[0].populate({
      path: "author",
      select: "username profilePicture"
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: post[0]
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Add Post Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  } finally {
    session.endSession();
  }
};


export const getFeedPosts = async (req, res) => {
  try {
    const userId = req.id;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Step 1: get following list
    const user = await User.findById(userId)
      .select("following")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const followingIds = [...user.following, userId]; 
    // apne khud ke posts bhi feed me dikhenge

    // Step 2: get posts
    const posts = await Post.find({
      author: { $in: followingIds }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "author",
        select: "username profilePicture"
      })
      .populate({
        path: "comments",
        options: { sort: { createdAt: -1 }, limit: 2 },
        populate: {
          path: "author",
          select: "username profilePicture"
        }
      })
      .lean();

    return res.status(200).json({
      success: true,
      page,
      limit,
      hasMore: posts.length === limit,
      posts
    });

  } catch (error) {
    console.error("❌ Get Feed Posts Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};



export const getUserPost = async (req, res) => {
  try {
    const authorId = req.id;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 9; // Instagram grid style
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: authorId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "author",
        select: "username profilePicture"
      })
      .populate({
        path: "comments",
        options: { sort: { createdAt: -1 }, limit: 2 },
        populate: {
          path: "author",
          select: "username profilePicture"
        }
      })
      .lean();

    return res.status(200).json({
      success: true,
      page,
      limit,
      hasMore: posts.length === limit,
      posts
    });

  } catch (error) {
    console.error("❌ Get User Posts Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};



export const likeOrUnlikePost = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.id;
    const postId = req.params.id;

    const post = await Post.findById(postId)
      .select("likes author")
      .session(session);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      // 🔴 UNLIKE
      await Post.updateOne(
        { _id: postId },
        { $pull: { likes: userId } },
        { session }
      );

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: "Post unliked",
        liked: false
      });
    } else {
      // ❤️ LIKE
      await Post.updateOne(
        { _id: postId },
        { $addToSet: { likes: userId } },
        { session }
      );

      await session.commitTransaction();

      // 🔔 REAL-TIME NOTIFICATION (after commit)
      if (post.author.toString() !== userId) {
        const user = await User.findById(userId)
          .select("username profilePicture")
          .lean();

        const notification = {
          type: "like",
          userId,
          userDetails: user,
          postId,
          message: "liked your post"
        };

        const receiverSocketId = getReceiverSocketId(post.author.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("notification", notification);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Post liked",
        liked: true
      });
    }

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Like/Unlike Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  } finally {
    session.endSession();
  }
};

export const addComment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const postId = req.params.id;
    const userId = req.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required"
      });
    }

    // find post
    const post = await Post.findById(postId)
      .select("author comments")
      .session(session);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // create comment
    const [comment] = await Comment.create(
      [
        {
          text: text.trim(),
          author: userId,
          post: postId
        }
      ],
      { session }
    );

    // push comment into post
    await Post.updateOne(
      { _id: postId },
      { $push: { comments: comment._id } },
      { session }
    );

    await session.commitTransaction();

    // populate author (after commit)
    await comment.populate({
      path: "author",
      select: "username profilePicture"
    });

    // 🔔 COMMENT NOTIFICATION (Instagram behavior)
    if (post.author.toString() !== userId) {
      const user = await User.findById(userId)
        .select("username profilePicture")
        .lean();

      const notification = {
        type: "comment",
        userId,
        userDetails: user,
        postId,
        message: "commented on your post"
      };

      const receiverSocketId = getReceiverSocketId(post.author.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("notification", notification);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Comment added",
      comment
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Add Comment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  } finally {
    session.endSession();
  }
};



export const getCommentsOfPost = async (req, res) => {
  try {
    const postId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post id"
      });
    }

    // ensure post exists (important for UX)
    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // pagination (industry standard)
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(limit)
      .populate({
        path: "author",
        select: "username profilePicture"
      })
      .lean();

    return res.status(200).json({
      success: true,
      page,
      limit,
      count: comments.length,
      comments
    });

  } catch (error) {
    console.error("❌ Get Comments Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};



export const deletePost = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const postId = req.params.id;
    const userId = req.id;

    // validate id
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post id"
      });
    }

    const post = await Post.findById(postId)
      .select("author imagePublicId")
      .session(session);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // owner check
    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // 1️⃣ delete post
    await Post.deleteOne({ _id: postId }, { session });

    // 2️⃣ remove post from user
    await User.updateOne(
      { _id: userId },
      { $pull: { posts: postId } },
      { session }
    );

    // 3️⃣ delete comments
    await Comment.deleteMany({ post: postId }, { session });

    await session.commitTransaction();

    // 4️⃣ delete image from cloudinary (AFTER COMMIT)
    if (post.imagePublicId) {
      await cloudinary.uploader.destroy(post.imagePublicId);
    }

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully"
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Delete Post Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  } finally {
    session.endSession();
  }
};




export const bookmarkOrUnbookmarkPost = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const postId = req.params.id;
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post id"
      });
    }

    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    const user = await User.findById(userId)
      .select("bookmarks")
      .session(session);

    const alreadyBookmarked = user.bookmarks.includes(postId);

    if (alreadyBookmarked) {
      // 🔴 UNSAVE
      await User.updateOne(
        { _id: userId },
        { $pull: { bookmarks: postId } },
        { session }
      );

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        type: "unsaved",
        message: "Post removed from bookmarks"
      });
    } else {
      // ⭐ SAVE
      await User.updateOne(
        { _id: userId },
        { $addToSet: { bookmarks: postId } },
        { session }
      );

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        type: "saved",
        message: "Post bookmarked"
      });
    }

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Bookmark Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  } finally {
    session.endSession();
  }
};
