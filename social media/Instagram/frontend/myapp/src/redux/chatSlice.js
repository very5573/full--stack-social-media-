import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    onlineUsers: [],
    messages: [],
  },
  reducers: {
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setMessages: (state, action) => {
      if (Array.isArray(action.payload)) {
        // set full message list (on fetch)
        state.messages = action.payload;
      } else {
        // append new real-time message
        state.messages.push(action.payload);
      }
    },
  },
});

export const { setOnlineUsers, setMessages } = chatSlice.actions;
export default chatSlice.reducer;
