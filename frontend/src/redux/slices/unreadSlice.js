import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  count: 0,
};

const unreadSlice = createSlice({
  name: "unread",
  initialState,
  reducers: {
    setUnreadCount: (state, action) => {
      state.count = action.payload;
    },
    resetUnread: (state) => {
      state.count = 0;
    },
  },
});

export const { setUnreadCount, resetUnread } = unreadSlice.actions;
export default unreadSlice.reducer;