import { createSlice } from "@reduxjs/toolkit";

// ================= STATE =================
const initialState = {
  conversations: [],
  pendingRequests: [],
  selectedConversationId: null,
  messagesByConversation: {},
};

const conversationSlice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    // ================= CONVERSATIONS =================

    addConversationIfNotExists: (state, action) => {
      const convo = action.payload;
      if (!convo?._id) return;

      // केवल accepted conversation add करें
      if (convo.status !== "accepted") return;

      const exists = state.conversations.find((c) => c._id === convo._id);
      if (!exists) {
        state.conversations.unshift(convo);
        console.log("✅ New conversation added:", convo._id);
      }
    },

    setSelectedConversationId: (state, action) => {
      state.selectedConversationId = action.payload;
      console.log("📌 Selected conversation:", action.payload);
    },

    // ================= MESSAGES =================

    addMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      if (!conversationId || !message?._id) return;

      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }

      const exists = state.messagesByConversation[conversationId].some(
        (m) => m._id === message._id
      );

      if (!exists) {
        state.messagesByConversation[conversationId].push(message);
        console.log("🟢 addMessage:", message._id);
      }
    },
  


    addIncomingMessage: (state, action) => {
      const message = action.payload;
      const conversationId = message?.conversationId;

      if (!conversationId || !message?._id) return;

      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }

      const exists = state.messagesByConversation[conversationId].some(
        (m) => m._id === message._id
      );

      if (!exists) {
        state.messagesByConversation[conversationId].push(message);
        console.log("🟢 Incoming socket message:", message._id);
      }
    },

    setConversationMessages: (state, action) => {
      const { conversationId, messages } = action.payload;
      if (!conversationId || !Array.isArray(messages)) return;

      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }

      const existingIds = new Set(
        state.messagesByConversation[conversationId].map((m) => m._id)
      );

      const newMessages = messages.filter((m) => !existingIds.has(m._id));
      state.messagesByConversation[conversationId].push(...newMessages);

      console.log("🟢 Messages merged for conversation:", conversationId);
    },

    // ================= REQUESTS =================

    addRequest: (state, action) => {
      const convo = action.payload;
      if (!convo?._id) return;

      const exists = state.pendingRequests.find((r) => r._id === convo._id);
      if (!exists) {
        state.pendingRequests.unshift(convo);
        console.log("📨 New request:", convo._id);
      }
    },

    removeRequest: (state, action) => {
      state.pendingRequests = state.pendingRequests.filter(
        (r) => r._id !== action.payload
      );
      console.log("❌ Request removed:", action.payload);
    },
    // conversationSlice.js

  deleteMessages: (state, action) => {
    const { conversationId, messageIds } = action.payload;
    if (!state.messagesByConversation[conversationId]) return;
    state.messagesByConversation[conversationId] = state.messagesByConversation[conversationId].filter(
      (msg) => !messageIds.includes(msg._id)
    );
  },

  removeConversation: (state, action) => {
  const conversationId = action.payload;

  // 1️⃣ Inbox se conversation remove
  state.conversations = state.conversations.filter(
    (c) => c._id !== conversationId
  );

  // 2️⃣ Messages bhi Redux state se delete
  delete state.messagesByConversation[conversationId];

  // 3️⃣ Agar ye selected conversation thi, to clear selection
  if (state.selectedConversationId === conversationId) {
    state.selectedConversationId = null;
  }

  console.log("❌ Conversation removed from inbox:", conversationId);
},




    acceptConversationSuccess: (state, action) => {
      const convo = action.payload;
      if (!convo?._id) return;

      // Remove from pending
      state.pendingRequests = state.pendingRequests.filter(
        (r) => r._id !== convo._id
      );

      // Add as accepted
      const exists = state.conversations.find((c) => c._id === convo._id);
      if (!exists) {
        state.conversations.unshift({ ...convo, status: "accepted" });
      }

      console.log("✅ Conversation accepted:", convo._id);
    },

    rejectConversationSuccess: (state, action) => {
      const conversationId = action.payload;
      state.pendingRequests = state.pendingRequests.filter(
        (r) => r._id !== conversationId
      );
      console.log("❌ Conversation rejected:", conversationId);
    },

    // ================= 🔥 RESET (LOGOUT FIX) =================
    resetConversationState: () => initialState,
  },
});

export const {
  addConversationIfNotExists,
  setSelectedConversationId,
  addMessage,
  addIncomingMessage,
  setConversationMessages,
  addRequest,
  removeRequest,
  acceptConversationSuccess,
  rejectConversationSuccess,
  resetConversationState,
  deleteMessages,
    removeConversation, // ✅ MUST ADD

} = conversationSlice.actions;

export default conversationSlice.reducer;
