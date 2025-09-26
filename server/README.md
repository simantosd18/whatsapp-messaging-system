# WhatsApp Clone Socket.IO Server

A comprehensive Socket.IO server for handling real-time calling functionality in the WhatsApp clone application.

## Features

### 🔥 Core Functionality
- **Real-time Communication**: WebSocket-based messaging and calling
- **User Authentication**: Socket-based user registration and management
- **Online Status**: Real-time online/offline user tracking
- **Chat Management**: Join/leave chat rooms with typing indicators

### 📞 Advanced Calling System
- **Call Initiation**: Voice and video call support
- **Call States**: calling → connecting → connected → ended
- **Call Controls**: Mute, video toggle, speaker controls
- **Call History**: Automatic call logging with duration tracking
- **Auto-timeout**: 30-second call timeout for unanswered calls

### 🌐 WebRTC Signaling
- **Offer/Answer Exchange**: Complete WebRTC negotiation
- **ICE Candidate Handling**: Network connectivity establishment
- **Media Stream Management**: Audio/video stream coordination

### 🛡️ Error Handling & Security
- **Authorization Checks**: Verify user permissions for call actions
- **Error Messages**: Comprehensive error feedback
- **Disconnection Handling**: Graceful cleanup on user disconnect
- **Call Validation**: Prevent unauthorized call operations

## Installation

```bash
cd server
npm install
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and statistics.

### Statistics
```
GET /api/stats
```
Returns active users and calls information.

## Socket Events

### Authentication
- `authenticate` - Register user with server
- `userOnline` - Broadcast when user comes online
- `userOffline` - Broadcast when user goes offline
- `onlineUsers` - Send list of online users

### Chat Events
- `joinChat` - Join a chat room
- `leaveChat` - Leave a chat room
- `sendMessage` - Send message to chat
- `newMessage` - Receive new message
- `startTyping` - Start typing indicator
- `stopTyping` - Stop typing indicator
- `userTyping` - Typing status update

### Call Events
- `initiateCall` - Start a new call
- `incomingCall` - Receive incoming call notification
- `acceptCall` - Accept an incoming call
- `rejectCall` - Reject an incoming call
- `endCall` - End an active call
- `callInitiated` - Call initiation confirmation
- `callAccepted` - Call acceptance notification
- `callRejected` - Call rejection notification
- `callConnected` - Call connection established
- `callEnded` - Call termination notification

### WebRTC Signaling
- `webrtcOffer` - Send WebRTC offer
- `webrtcAnswer` - Send WebRTC answer
- `iceCandidate` - Exchange ICE candidates

### Call Controls
- `toggleMute` - Toggle microphone mute
- `toggleVideo` - Toggle video on/off
- `participantMuteToggle` - Participant mute status
- `participantVideoToggle` - Participant video status

## Data Structures

### Call Object
```javascript
{
  id: "call_timestamp_randomId",
  callerId: "user123",
  callerData: { id, name, avatar },
  participantId: "user456",
  callType: "voice" | "video",
  status: "calling" | "accepted" | "connected" | "ended" | "rejected",
  createdAt: "2023-12-01T10:00:00.000Z",
  acceptedAt: "2023-12-01T10:00:05.000Z",
  connectedAt: "2023-12-01T10:00:07.000Z",
  endedAt: "2023-12-01T10:05:30.000Z",
  duration: 323, // seconds
  endedBy: "user123",
  callerSocketId: "socket123",
  participantSocketId: "socket456"
}
```

### User Object
```javascript
{
  id: "user123",
  name: "John Doe",
  email: "john@example.com",
  avatar: "https://example.com/avatar.jpg"
}
```

## Configuration

The server runs on port 3001 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=4000 npm start
```

## CORS Configuration

The server is configured to accept connections from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (React dev server)
- `https://localhost:5173` (HTTPS Vite)

## Error Handling

The server provides comprehensive error handling for:
- Invalid call IDs
- Unauthorized call operations
- Offline participants
- WebRTC signaling errors
- Socket disconnections

## Logging

The server logs all major events:
- User connections/disconnections
- Call state changes
- WebRTC signaling events
- Error conditions

## Testing

Use the health check endpoint to verify server status:
```bash
curl http://localhost:3001/api/health
```

Use the stats endpoint to monitor active connections:
```bash
curl http://localhost:3001/api/stats
```