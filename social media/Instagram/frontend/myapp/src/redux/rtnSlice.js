import { createSlice } from "@reduxjs/toolkit";

const rtnSlice = createSlice({
    name:'realTimeNotification',
    initialState:{
        likeNotification:[], // [1,2,3]
    },
    reducers:{
        setLikeNotification:(state,action)=>{
            if(action.payload.type === 'like'){
                state.likeNotification.push(action.payload);
            }else if(action.payload.type === 'dislike'){
                state.likeNotification = state.likeNotification.filter((item)=> item.userId !== action.payload.userId);
            }
        },

        // ✅ Add Clear All notifications
        clearLikeNotifications: (state) => {
            state.likeNotification = [];
        },

        // ✅ Remove notifications related to a deleted post
        removeNotificationsByPostId: (state, action) => {
            const postId = action.payload;
            state.likeNotification = state.likeNotification.filter(
                (item) => item.postId !== postId
            );
        }
    }
});

// ✅ Export all actions
export const {
    setLikeNotification,
    clearLikeNotifications,
    removeNotificationsByPostId
} = rtnSlice.actions;

export default rtnSlice.reducer;
