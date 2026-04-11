import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../utils/axiosInstance";
import { addConversationIfNotExists } from "./conversationSlice";

// ================= FETCH =================
export const fetchMessageRequests = createAsyncThunk(
  "chatAction/fetchMessageRequests",
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await API.get(`/users/requests/${userId}`);

      // 👇 add isSeen flag
      return (data.requests || []).map((r) => ({
        ...r,
        isSeen: r.isSeen ?? false,
      }));
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ================= ACCEPT =================
export const acceptRequest = createAsyncThunk(
  "chatAction/acceptRequest",
  async (conversationId, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await API.put(`/accept/${conversationId}`);

      if (data.conversation?._id) {
        dispatch(addConversationIfNotExists(data.conversation));
      }

      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ================= REJECT =================
export const rejectRequest = createAsyncThunk(
  "chatAction/rejectRequest",
  async (conversationId, { rejectWithValue }) => {
    try {
      await API.put(`/reject/${conversationId}`);
      return conversationId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ================= SLICE =================
const chatActionSlice = createSlice({
  name: "chatAction",
  initialState: {
    requests: [],
    loadingRequests: false,
    error: null,
  },

  reducers: {
    clearChatActionError: (state) => {
      state.error = null;
    },

    // 🔥 MARK ALL AS SEEN
    markAllSeen: (state) => {
      state.requests = state.requests.map((r) => ({
        ...r,
        isSeen: true,
      }));
    },
  },

  extraReducers: (builder) => {
    builder
      // FETCH
      .addCase(fetchMessageRequests.pending, (state) => {
        state.loadingRequests = true;
      })
      .addCase(fetchMessageRequests.fulfilled, (state, action) => {
        state.loadingRequests = false;
        state.requests = action.payload;
      })
      .addCase(fetchMessageRequests.rejected, (state, action) => {
        state.loadingRequests = false;
        state.error = action.payload;
      })

      // ACCEPT
      .addCase(acceptRequest.fulfilled, (state, action) => {
        const id = action.payload?.conversation?._id;
        state.requests = state.requests.filter((r) => r._id !== id);
      })

      // REJECT
      .addCase(rejectRequest.fulfilled, (state, action) => {
        state.requests = state.requests.filter(
          (r) => r._id !== action.payload
        );
      });
  },
});

export const { clearChatActionError, markAllSeen } =
  chatActionSlice.actions;

export default chatActionSlice.reducer;