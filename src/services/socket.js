// Mock socket service for frontend-only demo
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
  addToCallHistory
} from '../store/slices/callSlice';
import { addNotification } from '../store/slices/uiSlice';
import toast from 'react-hot-toast';

class MockSocketService {
  constructor() {
    this.connected = false;
    this.listeners = new Map();
  }

  connect(token) {
    console.log('Mock socket connecting...');
    this.connected = true;
    store.dispatch(setSocketConnected(true));
    
    // Simulate connection delay
    setTimeout(() => {
      console.log('Mock socket connected');
      this.emit('connect');
      
      // Mock some online users
      store.dispatch(setOnlineUsers(['2', '3', '4']));
    }, 1000);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  // Message methods
  sendMessage(chatId, message) {
    console.log('Mock sending message:', { chatId, message });
    
    // Simulate message delivery
    setTimeout(() => {
      this.emit('messageStatus', {
        messageId: message.id,
        status: 'delivered'
      });
    }, 1000);
    
    // Simulate read receipt
    setTimeout(() => {
      this.emit('messageStatus', {
        messageId: message.id,
        status: 'read'
      });
    }, 3000);
  }

  joinChat(chatId) {
    console.log('Mock joining chat:', chatId);
  }

  leaveChat(chatId) {
    console.log('Mock leaving chat:', chatId);
  }

  // Typing methods
  startTyping(chatId) {
    console.log('Mock start typing in chat:', chatId);
  }

  stopTyping(chatId) {
    console.log('Mock stop typing in chat:', chatId);
  }

  // Call methods
  initiateCall(userId, type = 'voice') {
    console.log('Mock initiating call:', { userId, type });
    
    // Simulate call initiation
    setTimeout(() => {
      this.emit('callInitiated', {
        callId: `call_${Date.now()}`,
        callerId: store.getState().auth.user?.id,
        participantId: userId,
        callType: type,
        status: 'calling'
      });
    }, 500);
    
    // Simulate call connection after some time
    setTimeout(() => {
      store.dispatch(setCallStatus('connecting'));
    }, 2000);
    
    setTimeout(() => {
      store.dispatch(setCallStatus('connected'));
    }, 4000);
  }

  acceptCall(callId) {
    console.log('Mock accepting call:', callId);
    
    // Simulate call acceptance
    setTimeout(() => {
      this.emit('callAccepted', { callId });
      store.dispatch(setCallStatus('connecting'));
    }, 500);
    
    setTimeout(() => {
      store.dispatch(setCallStatus('connected'));
    }, 2000);
  }

  rejectCall(callId) {
    console.log('Mock rejecting call:', callId);
    
    // Simulate call rejection
    setTimeout(() => {
      this.emit('callRejected', { callId });
      store.dispatch(closeCallModal());
    }, 500);
  }

  endCall(callId) {
    console.log('Mock ending call:', callId);
    
    // Simulate call ending
    setTimeout(() => {
      this.emit('callEnded', { callId });
      store.dispatch(closeCallModal());
    }, 500);
  }

  // WebRTC signaling (mock)
  sendOffer(callId, offer) {
    console.log('Mock sending WebRTC offer:', { callId, offer });
    
    // Simulate receiving answer
    setTimeout(() => {
      this.emit('webrtcAnswer', {
        callId,
        answer: { type: 'answer', sdp: 'mock-answer-sdp' }
      });
      store.dispatch(handleWebRTCAnswer({ callId, answer: 'mock-answer' }));
    }, 1000);
  }

  sendAnswer(callId, answer) {
    console.log('Mock sending WebRTC answer:', { callId, answer });
    store.dispatch(handleWebRTCAnswer({ callId, answer }));
  }

  sendIceCandidate(callId, candidate) {
    console.log('Mock sending ICE candidate:', { callId, candidate });
    store.dispatch(handleICECandidate({ callId, candidate }));
  }

  disconnect() {
    console.log('Mock socket disconnecting...');
    this.connected = false;
    store.dispatch(setSocketConnected(false));
    this.listeners.clear();
  }
}

export const socketService = new MockSocketService();
export default socketService;