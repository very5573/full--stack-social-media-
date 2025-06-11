import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  onlineUsers: [],
  messages: [],
};

const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const { setOnlineUsers, setMessages, clearMessages } = messageSlice.actions;

export default messageSlice.reducer;
