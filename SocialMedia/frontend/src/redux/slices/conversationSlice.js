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

  // 🔹 Only add if status is "accepted"
  if (convo.status !== "accepted") return;

  // 🔹 Prevent duplicate
  const exists = state.conversations.find((c) => c._id === convo._id);
  if (exists) return;

  // 🔹 Clean the conversation object
  const cleanConvo = { ...convo };
  if (cleanConvo.force) delete cleanConvo.force; // 🧼 remove force if present

  // 🔹 Add to top of the list
  state.conversations.unshift(cleanConvo);
  console.log("✅ Conversation added (accepted only):", cleanConvo._id);
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
    // Merge new message aur sort by createdAt (oldest → newest)
    state.messagesByConversation[conversationId] = [
      ...state.messagesByConversation[conversationId],
      message
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    console.log("🟢 Incoming socket message merged and sorted:", message._id);
  }
},



setConversationMessages: (state, action) => {
  const { conversationId, messages } = action.payload;
  if (!conversationId || !Array.isArray(messages)) return;

  // 🔹 Initialize if not exists
  if (!state.messagesByConversation[conversationId]) {
    state.messagesByConversation[conversationId] = [];
  }

  // 🔹 Filter out duplicates
  const existingIds = new Set(
    state.messagesByConversation[conversationId].map((m) => m._id)
  );
  const newMessages = messages.filter((m) => !existingIds.has(m._id));

  // 🔹 For initial fetch: replace all messages and sort by createdAt (oldest → newest)
  if (state.messagesByConversation[conversationId].length === 0) {
    state.messagesByConversation[conversationId] = [...messages].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  } else {
    // 🔹 For subsequent fetch or merge: append new messages at bottom and sort
    state.messagesByConversation[conversationId] = [
      ...state.messagesByConversation[conversationId],
      ...newMessages
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  console.log(
    "🟢 Messages set/merged and sorted for conversation:",
    conversationId
  );
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

} = conversationSlice.actions;

export default conversationSlice.reducer;
