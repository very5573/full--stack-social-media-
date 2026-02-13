import mongoose from "mongoose";
import Conversation from "../models/Conversationmodel.js";
import Message from "../models/Messagemodel.js";

const sendMessageService = async ({
  senderId,
  receiverId,
  text,
  conversationId,
}) => {
  if (!text) throw new Error("Text is required");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let conversation;
    let isNew = false;

    // 1️⃣ Get or create conversation
    if (conversationId) {
      conversation = await Conversation.findById(conversationId).session(session);
      if (!conversation) throw new Error("Conversation not found");
    } else {
      if (!receiverId) throw new Error("receiverId required");

      conversation = await Conversation.findOne({
        members: { $all: [senderId, receiverId] },
      }).session(session);

      if (!conversation) {
        const created = await Conversation.create(
          [
            {
              members: [senderId, receiverId],
              status: "pending",
              initiatedBy: senderId,
            },
          ],
          { session },
        );
        conversation = created[0];
        isNew = true;
      }
    }

    // 2️⃣ Security check
    const isMember = conversation.members.some(
      id => id.toString() === senderId.toString(),
    );
    if (!isMember) throw new Error("Not allowed");

    const actualReceiverId = conversation.members.find(
      id => id.toString() !== senderId.toString(),
    );
    if (!actualReceiverId) throw new Error("Receiver not found");

    // 3️⃣ Create message
    const createdMessage = await Message.create(
      [
        {
          conversationId: conversation._id,
          senderId,
          receiverId: actualReceiverId,
          text,
          read: false,
          delivered: false,
        },
      ],
      { session },
    );

    const message = createdMessage[0];

    // 4️⃣ Update conversation lastMessage
    await Conversation.findByIdAndUpdate(
      conversation._id,
      {
        lastMessage: message._id,
        lastMessageAt: message.createdAt,
      },
      { session },
    );

    // ✅ Commit transaction
    await session.commitTransaction();
    session.endSession();

    // 🚫 NO populate here (best practice)

    return {
      message,                  // ✅ raw message (lightweight)
      conversationId: conversation._id,
      receiverId: actualReceiverId,
      isNew,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export default sendMessageService;
