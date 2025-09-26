// Real Socket.IO service for production-ready calling functionality
import { io } from 'socket.io-client';
import store from '../store/store';
import { 
  addMessage, 
  updateMessageStatus, 
  addOnlineUser, 
  removeOnlineUser, 
  setOnlineUsers,
  setTyping 
} from '../store/slices/chatSlice';
import {
  receiveIncomingCall,
  setCallStatus,
  handleWebRTCOffer,
  handleWebRTCAnswer,
  handleICECandidate,
  setSocketConnected,
  closeCallModal,
  addToCallHistory,
  resetCallState
} from '../store/slices/callSlice';
import { addNotification } from '../store/slices/uiSlice';
import toast from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.currentUser = null;
  }

  connect(token) {
    try {
      // Get current user from store
      const state = store.getState();
      this.currentUser = state.auth.user;
      
      if (!this.currentUser) {
        console.error('No user data available for socket connection');
        return;
      }

      console.log('Connecting to Socket.IO server...');
      
      // Initialize socket connection
      this.socket = io('http://localhost:3001', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.setupEventListeners();
      
    } catch (error) {
      console.error('Socket connection error:', error);
      store.dispatch(setSocketConnected(false));
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket.IO connected:', this.socket.id);
      this.connected = true;
      this.reconnectAttempts = 0;
      store.dispatch(setSocketConnected(true));
      
      // Authenticate user with server
      this.socket.emit('authenticate', this.currentUser);
      
      toast.success('Connected to server');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      this.connected = false;
      store.dispatch(setSocketConnected(false));
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnection();
      }
      
      toast.error('Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connected = false;
      store.dispatch(setSocketConnected(false));
      this.handleReconnection();
    });

    // User presence events
    this.socket.on('onlineUsers', (users) => {
      console.log('Online users received:', users);
      store.dispatch(setOnlineUsers(users));
    });

    this.socket.on('userOnline', (data) => {
      console.log('User came online:', data.userId);
      store.dispatch(addOnlineUser(data.userId));
      toast.success(`${data.userData?.name || 'User'} is now online`);
    });

    this.socket.on('userOffline', (data) => {
      console.log('User went offline:', data.userId);
      store.dispatch(removeOnlineUser(data.userId));
    });

    // Message events
    this.socket.on('newMessage', (messageData) => {
      console.log('New message received:', messageData);
      store.dispatch(addMessage({
        chatId: messageData.chatId,
        message: messageData
      }));
    });

    this.socket.on('messageStatus', (statusData) => {
      console.log('Message status update:', statusData);
      store.dispatch(updateMessageStatus(statusData));
    });

    // Typing events
    this.socket.on('userTyping', (data) => {
      console.log('User typing:', data);
      store.dispatch(setTyping({
        chatId: data.chatId,
        userId: data.userId,
        isTyping: data.isTyping
      }));
    });

    // ==================== CALL EVENTS ====================

    // Incoming call
    this.socket.on('incomingCall', (callData) => {
      console.log('Incoming call received:', callData);
      
      store.dispatch(receiveIncomingCall({
        callData: {
          id: callData.callId,
          callerId: callData.caller.id,
          caller: callData.caller,
          callType: callData.callType,
          status: 'ringing',
          createdAt: callData.createdAt
        }
      }));
      
      // Show notification
      toast.success(`Incoming ${callData.callType} call from ${callData.caller.name}`);
    });

    // Call initiated confirmation
    this.socket.on('callInitiated', (data) => {
      console.log('Call initiated:', data);
      store.dispatch(setCallStatus('calling'));
    });

    // Call accepted
    this.socket.on('callAccepted', (data) => {
      console.log('Call accepted:', data);
      store.dispatch(setCallStatus('connecting'));
      toast.success('Call accepted');
    });

    // Call connected
    this.socket.on('callConnected', (data) => {
      console.log('Call connected:', data);
      store.dispatch(setCallStatus('connected'));
      toast.success('Call connected');
    });

    // Call rejected
    this.socket.on('callRejected', (data) => {
      console.log('Call rejected:', data);
      store.dispatch(addToCallHistory({
        id: data.callId,
        status: 'rejected',
        endedAt: data.rejectedAt,
        reason: data.reason
      }));
      store.dispatch(closeCallModal());
      toast.error('Call was declined');
    });

    // Call ended
    this.socket.on('callEnded', (data) => {
      console.log('Call ended:', data);
      
      store.dispatch(addToCallHistory({
        id: data.callId,
        status: 'ended',
        duration: data.duration,
        endedAt: data.endedAt,
        endedBy: data.endedBy,
        reason: data.reason
      }));
      
      store.dispatch(closeCallModal());
      
      const reason = data.reason === 'timeout' ? 'Call timed out' :
                    data.reason === 'disconnection' ? 'Call ended due to disconnection' :
                    'Call ended';
      
      toast.info(reason);
    });

    // ==================== WebRTC SIGNALING ====================

    this.socket.on('webrtcOffer', (data) => {
      console.log('WebRTC offer received:', data);
      store.dispatch(handleWebRTCOffer({
        callId: data.callId,
        offer: data.offer,
        from: data.from
      }));
    });

    this.socket.on('webrtcAnswer', (data) => {
      console.log('WebRTC answer received:', data);
      store.dispatch(handleWebRTCAnswer({
        callId: data.callId,
        answer: data.answer,
        from: data.from
      }));
    });

    this.socket.on('iceCandidate', (data) => {
      console.log('ICE candidate received:', data);
      store.dispatch(handleICECandidate({
        callId: data.callId,
        candidate: data.candidate,
        from: data.from
      }));
    });

    // ==================== CALL CONTROLS ====================

    this.socket.on('participantMuteToggle', (data) => {
      console.log('Participant mute toggle:', data);
      toast.info(`${data.userId} ${data.isMuted ? 'muted' : 'unmuted'} their microphone`);
    });

    this.socket.on('participantVideoToggle', (data) => {
      console.log('Participant video toggle:', data);
      toast.info(`${data.userId} turned ${data.isVideoEnabled ? 'on' : 'off'} their camera`);
    });

    // ==================== ERROR HANDLING ====================

    this.socket.on('callError', (error) => {
      console.error('Call error:', error);
      toast.error(`Call error: ${error.message}`);
      store.dispatch(resetCallState());
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error('Connection error occurred');
    });
  }

  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.connected && this.socket) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      toast.error('Unable to reconnect to server');
    }
  }

  // ==================== CHAT METHODS ====================

  joinChat(chatId) {
    if (this.socket && this.connected) {
      console.log('Joining chat:', chatId);
      this.socket.emit('joinChat', chatId);
    }
  }

  leaveChat(chatId) {
    if (this.socket && this.connected) {
      console.log('Leaving chat:', chatId);
      this.socket.emit('leaveChat', chatId);
    }
  }

  sendMessage(chatId, message) {
    if (this.socket && this.connected) {
      console.log('Sending message:', { chatId, message });
      this.socket.emit('sendMessage', {
        ...message,
        chatId,
        timestamp: new Date().toISOString()
      });
    }
  }

  startTyping(chatId) {
    if (this.socket && this.connected) {
      this.socket.emit('startTyping', chatId);
    }
  }

  stopTyping(chatId) {
    if (this.socket && this.connected) {
      this.socket.emit('stopTyping', chatId);
    }
  }

  // ==================== CALL METHODS ====================

  initiateCall(participantId, callType = 'voice') {
    if (this.socket && this.connected) {
      console.log('Initiating call:', { participantId, callType });
      this.socket.emit('initiateCall', {
        participantId,
        callType,
        timestamp: new Date().toISOString()
      });
    } else {
      toast.error('Not connected to server');
    }
  }

  acceptCall(callId) {
    if (this.socket && this.connected) {
      console.log('Accepting call:', callId);
      this.socket.emit('acceptCall', callId);
    }
  }

  rejectCall(callId) {
    if (this.socket && this.connected) {
      console.log('Rejecting call:', callId);
      this.socket.emit('rejectCall', callId);
    }
  }

  endCall(callId) {
    if (this.socket && this.connected) {
      console.log('Ending call:', callId);
      this.socket.emit('endCall', callId);
    }
  }

  // ==================== WebRTC SIGNALING METHODS ====================

  sendWebRTCOffer(callId, offer) {
    if (this.socket && this.connected) {
      console.log('Sending WebRTC offer:', callId);
      this.socket.emit('webrtcOffer', {
        callId,
        offer,
        timestamp: new Date().toISOString()
      });
    }
  }

  sendWebRTCAnswer(callId, answer) {
    if (this.socket && this.connected) {
      console.log('Sending WebRTC answer:', callId);
      this.socket.emit('webrtcAnswer', {
        callId,
        answer,
        timestamp: new Date().toISOString()
      });
    }
  }

  sendICECandidate(callId, candidate) {
    if (this.socket && this.connected) {
      console.log('Sending ICE candidate:', callId);
      this.socket.emit('iceCandidate', {
        callId,
        candidate,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ==================== CALL CONTROL METHODS ====================

  toggleMute(callId, isMuted) {
    if (this.socket && this.connected) {
      this.socket.emit('toggleMute', {
        callId,
        isMuted,
        timestamp: new Date().toISOString()
      });
    }
  }

  toggleVideo(callId, isVideoEnabled) {
    if (this.socket && this.connected) {
      this.socket.emit('toggleVideo', {
        callId,
        isVideoEnabled,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ==================== UTILITY METHODS ====================

  isConnected() {
    return this.connected && this.socket?.connected;
  }

  getSocketId() {
    return this.socket?.id;
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentUser = null;
      store.dispatch(setSocketConnected(false));
    }
  }

  // Force reconnection
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Create singleton instance
export const socketService = new SocketService();
export default socketService;