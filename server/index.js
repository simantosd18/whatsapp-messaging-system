const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "https://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active users and calls
const activeUsers = new Map(); // userId -> socketId
const activeCalls = new Map(); // callId -> callData
const userSockets = new Map(); // socketId -> userData

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User authentication and registration
  socket.on('authenticate', (userData) => {
    console.log(`User authenticated: ${userData.id} - ${userData.name}`);
    
    // Store user data
    activeUsers.set(userData.id, socket.id);
    userSockets.set(socket.id, userData);
    
    // Join user to their personal room
    socket.join(`user_${userData.id}`);
    
    // Broadcast user online status
    socket.broadcast.emit('userOnline', {
      userId: userData.id,
      userData: userData
    });
    
    // Send current online users to the newly connected user
    const onlineUsers = Array.from(activeUsers.keys());
    socket.emit('onlineUsers', onlineUsers);
    
    console.log(`Active users: ${onlineUsers.length}`);
  });

  // Chat functionality
  socket.on('joinChat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`User ${socket.id} joined chat: ${chatId}`);
  });

  socket.on('leaveChat', (chatId) => {
    socket.leave(`chat_${chatId}`);
    console.log(`User ${socket.id} left chat: ${chatId}`);
  });

  // Message handling
  socket.on('sendMessage', (messageData) => {
    console.log('Message sent:', messageData);
    
    // Broadcast message to chat participants
    socket.to(`chat_${messageData.chatId}`).emit('newMessage', {
      ...messageData,
      timestamp: new Date().toISOString()
    });
    
    // Update message status
    setTimeout(() => {
      socket.emit('messageStatus', {
        messageId: messageData.id,
        status: 'delivered'
      });
    }, 500);
    
    setTimeout(() => {
      socket.emit('messageStatus', {
        messageId: messageData.id,
        status: 'read'
      });
    }, 2000);
  });

  // Typing indicators
  socket.on('startTyping', (chatId) => {
    const userData = userSockets.get(socket.id);
    if (userData) {
      socket.to(`chat_${chatId}`).emit('userTyping', {
        userId: userData.id,
        chatId: chatId,
        isTyping: true
      });
    }
  });

  socket.on('stopTyping', (chatId) => {
    const userData = userSockets.get(socket.id);
    if (userData) {
      socket.to(`chat_${chatId}`).emit('userTyping', {
        userId: userData.id,
        chatId: chatId,
        isTyping: false
      });
    }
  });

  // ==================== CALL FUNCTIONALITY ====================

  // Initiate call
  socket.on('initiateCall', (callData) => {
    console.log('Call initiated:', callData);
    
    const { participantId, callType } = callData;
    const caller = userSockets.get(socket.id);
    const participantSocketId = activeUsers.get(participantId);
    
    if (!caller) {
      socket.emit('callError', { message: 'Caller not authenticated' });
      return;
    }
    
    if (!participantSocketId) {
      socket.emit('callError', { message: 'Participant is offline' });
      return;
    }
    
    // Create call data
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullCallData = {
      id: callId,
      callerId: caller.id,
      callerData: caller,
      participantId: participantId,
      callType: callType, // 'voice' or 'video'
      status: 'calling',
      createdAt: new Date().toISOString(),
      callerSocketId: socket.id,
      participantSocketId: participantSocketId
    };
    
    // Store active call
    activeCalls.set(callId, fullCallData);
    
    // Notify caller that call is initiated
    socket.emit('callInitiated', {
      callId: callId,
      status: 'calling',
      participant: {
        id: participantId,
        name: 'Participant' // In real app, get from database
      }
    });
    
    // Notify participant about incoming call
    io.to(participantSocketId).emit('incomingCall', {
      callId: callId,
      caller: caller,
      callType: callType,
      createdAt: fullCallData.createdAt
    });
    
    console.log(`Call ${callId} initiated from ${caller.id} to ${participantId}`);
    
    // Auto-timeout call after 30 seconds if not answered
    setTimeout(() => {
      const call = activeCalls.get(callId);
      if (call && call.status === 'calling') {
        // Call timed out
        activeCalls.delete(callId);
        
        // Notify both parties
        io.to(call.callerSocketId).emit('callEnded', {
          callId: callId,
          reason: 'timeout',
          endedAt: new Date().toISOString()
        });
        
        io.to(call.participantSocketId).emit('callEnded', {
          callId: callId,
          reason: 'timeout',
          endedAt: new Date().toISOString()
        });
        
        console.log(`Call ${callId} timed out`);
      }
    }, 30000);
  });

  // Accept call
  socket.on('acceptCall', (callId) => {
    console.log('Call accepted:', callId);
    
    const call = activeCalls.get(callId);
    if (!call) {
      socket.emit('callError', { message: 'Call not found' });
      return;
    }
    
    if (call.participantSocketId !== socket.id) {
      socket.emit('callError', { message: 'Unauthorized to accept this call' });
      return;
    }
    
    // Update call status
    call.status = 'accepted';
    call.acceptedAt = new Date().toISOString();
    activeCalls.set(callId, call);
    
    // Notify caller that call was accepted
    io.to(call.callerSocketId).emit('callAccepted', {
      callId: callId,
      acceptedAt: call.acceptedAt,
      status: 'connecting'
    });
    
    // Notify participant (confirming acceptance)
    socket.emit('callAccepted', {
      callId: callId,
      acceptedAt: call.acceptedAt,
      status: 'connecting'
    });
    
    console.log(`Call ${callId} accepted`);
    
    // Simulate connection establishment
    setTimeout(() => {
      const currentCall = activeCalls.get(callId);
      if (currentCall && currentCall.status === 'accepted') {
        currentCall.status = 'connected';
        currentCall.connectedAt = new Date().toISOString();
        activeCalls.set(callId, currentCall);
        
        // Notify both parties that call is connected
        io.to(currentCall.callerSocketId).emit('callConnected', {
          callId: callId,
          connectedAt: currentCall.connectedAt,
          status: 'connected'
        });
        
        io.to(currentCall.participantSocketId).emit('callConnected', {
          callId: callId,
          connectedAt: currentCall.connectedAt,
          status: 'connected'
        });
        
        console.log(`Call ${callId} connected`);
      }
    }, 2000);
  });

  // Reject/Decline call
  socket.on('rejectCall', (callId) => {
    console.log('Call rejected:', callId);
    
    const call = activeCalls.get(callId);
    if (!call) {
      socket.emit('callError', { message: 'Call not found' });
      return;
    }
    
    if (call.participantSocketId !== socket.id) {
      socket.emit('callError', { message: 'Unauthorized to reject this call' });
      return;
    }
    
    // Update call status
    call.status = 'rejected';
    call.rejectedAt = new Date().toISOString();
    
    // Notify caller that call was rejected
    io.to(call.callerSocketId).emit('callRejected', {
      callId: callId,
      rejectedAt: call.rejectedAt,
      reason: 'declined'
    });
    
    // Notify participant (confirming rejection)
    socket.emit('callRejected', {
      callId: callId,
      rejectedAt: call.rejectedAt,
      reason: 'declined'
    });
    
    // Remove call from active calls
    activeCalls.delete(callId);
    
    console.log(`Call ${callId} rejected`);
  });

  // End call
  socket.on('endCall', (callId) => {
    console.log('Call ended:', callId);
    
    const call = activeCalls.get(callId);
    if (!call) {
      socket.emit('callError', { message: 'Call not found' });
      return;
    }
    
    // Check if user is authorized to end this call
    if (call.callerSocketId !== socket.id && call.participantSocketId !== socket.id) {
      socket.emit('callError', { message: 'Unauthorized to end this call' });
      return;
    }
    
    // Calculate call duration if call was connected
    let duration = 0;
    if (call.connectedAt) {
      duration = Math.floor((new Date() - new Date(call.connectedAt)) / 1000);
    }
    
    // Update call status
    call.status = 'ended';
    call.endedAt = new Date().toISOString();
    call.duration = duration;
    call.endedBy = userSockets.get(socket.id)?.id;
    
    // Notify both parties that call ended
    const endCallData = {
      callId: callId,
      endedAt: call.endedAt,
      duration: duration,
      endedBy: call.endedBy,
      reason: 'ended'
    };
    
    io.to(call.callerSocketId).emit('callEnded', endCallData);
    io.to(call.participantSocketId).emit('callEnded', endCallData);
    
    // Remove call from active calls
    activeCalls.delete(callId);
    
    console.log(`Call ${callId} ended by ${call.endedBy}, duration: ${duration}s`);
  });

  // ==================== WebRTC SIGNALING ====================

  // WebRTC Offer
  socket.on('webrtcOffer', (data) => {
    console.log('WebRTC Offer:', data.callId);
    
    const call = activeCalls.get(data.callId);
    if (!call) {
      socket.emit('callError', { message: 'Call not found for WebRTC offer' });
      return;
    }
    
    // Forward offer to participant
    io.to(call.participantSocketId).emit('webrtcOffer', {
      callId: data.callId,
      offer: data.offer,
      from: call.callerId
    });
  });

  // WebRTC Answer
  socket.on('webrtcAnswer', (data) => {
    console.log('WebRTC Answer:', data.callId);
    
    const call = activeCalls.get(data.callId);
    if (!call) {
      socket.emit('callError', { message: 'Call not found for WebRTC answer' });
      return;
    }
    
    // Forward answer to caller
    io.to(call.callerSocketId).emit('webrtcAnswer', {
      callId: data.callId,
      answer: data.answer,
      from: call.participantId
    });
  });

  // ICE Candidate
  socket.on('iceCandidate', (data) => {
    console.log('ICE Candidate:', data.callId);
    
    const call = activeCalls.get(data.callId);
    if (!call) {
      socket.emit('callError', { message: 'Call not found for ICE candidate' });
      return;
    }
    
    // Forward ICE candidate to the other party
    const targetSocketId = socket.id === call.callerSocketId 
      ? call.participantSocketId 
      : call.callerSocketId;
    
    io.to(targetSocketId).emit('iceCandidate', {
      callId: data.callId,
      candidate: data.candidate,
      from: socket.id === call.callerSocketId ? call.callerId : call.participantId
    });
  });

  // ==================== CALL CONTROLS ====================

  // Toggle mute
  socket.on('toggleMute', (data) => {
    const call = activeCalls.get(data.callId);
    if (call) {
      const targetSocketId = socket.id === call.callerSocketId 
        ? call.participantSocketId 
        : call.callerSocketId;
      
      io.to(targetSocketId).emit('participantMuteToggle', {
        callId: data.callId,
        userId: userSockets.get(socket.id)?.id,
        isMuted: data.isMuted
      });
    }
  });

  // Toggle video
  socket.on('toggleVideo', (data) => {
    const call = activeCalls.get(data.callId);
    if (call) {
      const targetSocketId = socket.id === call.callerSocketId 
        ? call.participantSocketId 
        : call.callerSocketId;
      
      io.to(targetSocketId).emit('participantVideoToggle', {
        callId: data.callId,
        userId: userSockets.get(socket.id)?.id,
        isVideoEnabled: data.isVideoEnabled
      });
    }
  });

  // ==================== DISCONNECT HANDLING ====================

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    const userData = userSockets.get(socket.id);
    if (userData) {
      // Remove from active users
      activeUsers.delete(userData.id);
      userSockets.delete(socket.id);
      
      // Broadcast user offline status
      socket.broadcast.emit('userOffline', {
        userId: userData.id
      });
      
      // Handle any active calls this user was part of
      for (const [callId, call] of activeCalls.entries()) {
        if (call.callerSocketId === socket.id || call.participantSocketId === socket.id) {
          // End the call due to disconnection
          const otherSocketId = call.callerSocketId === socket.id 
            ? call.participantSocketId 
            : call.callerSocketId;
          
          io.to(otherSocketId).emit('callEnded', {
            callId: callId,
            reason: 'disconnection',
            endedAt: new Date().toISOString(),
            endedBy: userData.id
          });
          
          activeCalls.delete(callId);
          console.log(`Call ${callId} ended due to disconnection`);
        }
      }
      
      console.log(`User ${userData.name} (${userData.id}) went offline`);
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// API Routes for testing
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    activeUsers: activeUsers.size,
    activeCalls: activeCalls.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    activeUsers: Array.from(activeUsers.keys()),
    activeCalls: Array.from(activeCalls.values()).map(call => ({
      id: call.id,
      callerId: call.callerId,
      participantId: call.participantId,
      callType: call.callType,
      status: call.status,
      createdAt: call.createdAt
    })),
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📈 Stats endpoint: http://localhost:${PORT}/api/stats`);
});

module.exports = { app, server, io };