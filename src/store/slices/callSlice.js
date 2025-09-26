import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks for call operations
export const initiateCall = createAsyncThunk(
  'call/initiate',
  async ({ participantId, callType }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const callData = {
        id: `call_${Date.now()}`,
        callerId: auth.user.id,
        participantId,
        callType, // 'voice' or 'video'
        status: 'calling',
        createdAt: new Date().toISOString(),
      };
      
      // In a real app, this would make an API call
      // await callAPI.initiateCall(callData);
      
      return callData;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to initiate call');
    }
  }
);

export const acceptCall = createAsyncThunk(
  'call/accept',
  async (callId, { rejectWithValue }) => {
    try {
      // In a real app, this would make an API call
      // await callAPI.acceptCall(callId);
      
      return { callId, acceptedAt: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to accept call');
    }
  }
);

export const declineCall = createAsyncThunk(
  'call/decline',
  async (callId, { rejectWithValue }) => {
    try {
      // In a real app, this would make an API call
      // await callAPI.declineCall(callId);
      
      return { callId, declinedAt: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to decline call');
    }
  }
);

export const endCall = createAsyncThunk(
  'call/end',
  async (callId, { rejectWithValue }) => {
    try {
      // In a real app, this would make an API call
      // await callAPI.endCall(callId);
      
      return { callId, endedAt: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to end call');
    }
  }
);

const callSlice = createSlice({
  name: 'call',
  initialState: {
    // Current active call
    activeCall: null,
    
    // Call history
    callHistory: [],
    
    // Call states
    isCallModalOpen: false,
    callStatus: 'idle', // idle, calling, ringing, connecting, connected, ended, failed
    callType: null, // voice, video
    callDuration: 0,
    
    // Call participants
    caller: null,
    participant: null,
    
    // Media states
    isMuted: false,
    isVideoEnabled: true,
    isSpeakerOn: false,
    isCameraLoading: false,
    cameraError: null,
    
    // UI states
    isMinimized: false,
    showControls: true,
    
    // WebRTC states
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    
    // Socket states
    isConnected: false,
    
    // Loading and error states
    loading: false,
    error: null,
  },
  reducers: {
    // Call modal management
    openCallModal: (state, action) => {
      state.isCallModalOpen = true;
      state.callType = action.payload.callType;
      state.participant = action.payload.participant;
      state.callStatus = 'calling';
      state.isMinimized = false;
    },
    
    closeCallModal: (state) => {
      state.isCallModalOpen = false;
      state.callStatus = 'idle';
      state.activeCall = null;
      state.callDuration = 0;
      state.isMinimized = false;
      state.showControls = true;
      // Reset media states
      state.isMuted = false;
      state.isVideoEnabled = true;
      state.isSpeakerOn = false;
      state.cameraError = null;
    },
    
    // Call status management
    setCallStatus: (state, action) => {
      state.callStatus = action.payload;
      if (action.payload === 'connected') {
        state.callDuration = 0;
      }
    },
    
    // Call duration
    incrementCallDuration: (state) => {
      if (state.callStatus === 'connected') {
        state.callDuration += 1;
      }
    },
    
    // Media controls
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },
    
    toggleVideo: (state) => {
      state.isVideoEnabled = !state.isVideoEnabled;
    },
    
    toggleSpeaker: (state) => {
      state.isSpeakerOn = !state.isSpeakerOn;
    },
    
    // Camera states
    setCameraLoading: (state, action) => {
      state.isCameraLoading = action.payload;
    },
    
    setCameraError: (state, action) => {
      state.cameraError = action.payload;
      state.isCameraLoading = false;
    },
    
    // UI controls
    toggleMinimize: (state) => {
      state.isMinimized = !state.isMinimized;
    },
    
    setShowControls: (state, action) => {
      state.showControls = action.payload;
    },
    
    // WebRTC stream management
    setLocalStream: (state, action) => {
      state.localStream = action.payload;
    },
    
    setRemoteStream: (state, action) => {
      state.remoteStream = action.payload;
    },
    
    setPeerConnection: (state, action) => {
      state.peerConnection = action.payload;
    },
    
    // Socket connection
    setSocketConnected: (state, action) => {
      state.isConnected = action.payload;
    },
    
    // Incoming call handling
    receiveIncomingCall: (state, action) => {
      const { callData } = action.payload;
      state.activeCall = callData;
      state.isCallModalOpen = true;
      state.callStatus = 'ringing';
      state.callType = callData.callType;
      state.caller = callData.caller;
      state.isMinimized = false;
    },
    
    // Call history
    addToCallHistory: (state, action) => {
      state.callHistory.unshift(action.payload);
      // Keep only last 50 calls
      if (state.callHistory.length > 50) {
        state.callHistory = state.callHistory.slice(0, 50);
      }
    },
    
    // WebRTC signaling
    handleWebRTCOffer: (state, action) => {
      // Handle incoming WebRTC offer
      state.callStatus = 'connecting';
    },
    
    handleWebRTCAnswer: (state, action) => {
      // Handle WebRTC answer
      state.callStatus = 'connected';
    },
    
    handleICECandidate: (state, action) => {
      // Handle ICE candidate
    },
    
    // Error handling
    clearError: (state) => {
      state.error = null;
    },
    
    // Reset call state
    resetCallState: (state) => {
      state.activeCall = null;
      state.callStatus = 'idle';
      state.callDuration = 0;
      state.caller = null;
      state.participant = null;
      state.isMuted = false;
      state.isVideoEnabled = true;
      state.isSpeakerOn = false;
      state.cameraError = null;
      state.isCameraLoading = false;
      state.isMinimized = false;
      state.showControls = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initiate Call
      .addCase(initiateCall.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiateCall.fulfilled, (state, action) => {
        state.loading = false;
        state.activeCall = action.payload;
        state.callStatus = 'calling';
        state.isCallModalOpen = true;
        state.callType = action.payload.callType;
      })
      .addCase(initiateCall.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.callStatus = 'failed';
      })
      
      // Accept Call
      .addCase(acceptCall.pending, (state) => {
        state.loading = true;
        state.callStatus = 'connecting';
      })
      .addCase(acceptCall.fulfilled, (state, action) => {
        state.loading = false;
        state.callStatus = 'connected';
        state.callDuration = 0;
      })
      .addCase(acceptCall.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.callStatus = 'failed';
      })
      
      // Decline Call
      .addCase(declineCall.fulfilled, (state, action) => {
        state.callStatus = 'ended';
        state.isCallModalOpen = false;
        state.activeCall = null;
        
        // Add to call history
        if (state.activeCall) {
          state.callHistory.unshift({
            ...state.activeCall,
            status: 'declined',
            endedAt: action.payload.declinedAt,
          });
        }
      })
      
      // End Call
      .addCase(endCall.fulfilled, (state, action) => {
        // Add to call history
        if (state.activeCall) {
          state.callHistory.unshift({
            ...state.activeCall,
            status: 'ended',
            duration: state.callDuration,
            endedAt: action.payload.endedAt,
          });
        }
        
        // Reset call state
        state.activeCall = null;
        state.callStatus = 'ended';
        state.isCallModalOpen = false;
        state.callDuration = 0;
        state.isMinimized = false;
        state.showControls = true;
        state.isMuted = false;
        state.isVideoEnabled = true;
        state.isSpeakerOn = false;
        state.cameraError = null;
        state.isCameraLoading = false;
        state.caller = null;
        state.participant = null;
        state.localStream = null;
        state.remoteStream = null;
        state.peerConnection = null;
      });
  },
});

export const {
  openCallModal,
  closeCallModal,
  setCallStatus,
  incrementCallDuration,
  toggleMute,
  toggleVideo,
  toggleSpeaker,
  setCameraLoading,
  setCameraError,
  toggleMinimize,
  setShowControls,
  setLocalStream,
  setRemoteStream,
  setPeerConnection,
  setSocketConnected,
  receiveIncomingCall,
  addToCallHistory,
  handleWebRTCOffer,
  handleWebRTCAnswer,
  handleICECandidate,
  clearError,
  resetCallState,
} = callSlice.actions;

export default callSlice.reducer;