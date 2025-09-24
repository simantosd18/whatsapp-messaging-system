import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import chatSlice from './slices/chatSlice';
import socketSlice from './slices/socketSlice';
import uiSlice from './slices/uiSlice';
import callSlice from './slices/callSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    chat: chatSlice,
    socket: socketSlice,
    ui: uiSlice,
    call: callSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['socket/setSocket', 'call/setLocalStream', 'call/setRemoteStream', 'call/setPeerConnection'],
        ignoredPaths: ['socket.connection', 'call.localStream', 'call.remoteStream', 'call.peerConnection'],
      },
    }),
});

export default store;