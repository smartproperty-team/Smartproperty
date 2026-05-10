# Messaging System - Complete Implementation Guide

This document outlines the role-based messaging system with WebSocket support, typing indicators, and read status features.

## Architecture Overview

The messaging system consists of three main layers:

### 1. Backend (NestJS)

- **Entities**: Chat and Message MongoDB collections
- **Service**: Business logic including role-based access control
- **Gateway**: WebSocket server for real-time communication
- **Controller**: REST API endpoints for CRUD operations

### 2. Frontend (React)

- **Services**: API client and WebSocket client
- **Store**: Zustand store for state management
- **Components**: UI components for messaging interface

### 3. Database (MongoDB)

- **chats**: Stores conversation data with participant metadata
- **messages**: Stores individual messages with read status

## Role-Based Access Rules

The system enforces the following chat permissions:

```
Tenant / Candidate Tenant ↔ Real Estate Agent / Manager
Tenant / Candidate Tenant ↔ Rental Manager
Rental Manager ↔ Owner
Real Estate Agent / Manager ↔ Branch Manager
Real Estate Agent / Manager ↔ Owner
Branch Manager ↔ Super Administrator (escalations)
Service Provider ↔ Rental Manager
Service Provider ↔ Real Estate Agent / Manager
Support / Compliance Reviewer ↔ Super Administrator
Support / Compliance Reviewer ↔ Branch Manager or Agent
```

## Backend Implementation

### 1. Message Entity

Location: `backend/src/modules/messaging/entities/message.entity.ts`

```typescript
@Entity('messages')
export class Message {
  _id: ObjectId;
  chatId: ObjectId;
  senderId: string;
  content: string;
  status: MessageStatus; // 'sent', 'delivered', 'seen'
  readBy: Record<string, { readAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
  // ... other fields
}
```

### 2. Chat Entity

Location: `backend/src/modules/messaging/entities/chat.entity.ts`

```typescript
@Entity('chats')
export class Chat {
  _id: ObjectId;
  participantIds: string[];
  lastMessageAt: Date;
  participantMetadata: Record<
    string,
    {
      unreadCount: number;
      lastReadAt: Date;
      isActive: boolean;
    }
  >;
  // ... other fields
}
```

### 3. Messaging Service

Location: `backend/src/modules/messaging/messaging.service.ts`

Key methods:

- `sendMessage(senderId, createMessageDto)` - Send with role validation
- `getOrCreateChat(userId, recipientId)` - Get or create chat
- `getUserChats(userId, getChatsDto)` - Paginated chat list
- `getMessages(userId, chatId, page, limit)` - Paginated messages
- `markMessagesAsRead(userId, chatId, messageIds)` - Mark as read

### 4. Messaging Gateway (WebSocket)

Location: `backend/src/modules/messaging/messaging.gateway.ts`

WebSocket events:

- `connection` - User connects
- `disconnection` - User disconnects
- `chat:join` - Join chat room
- `chat:leave` - Leave chat room
- `message:typing` - Send typing indicator
- `messages:read` - Mark messages as read

### 5. REST Endpoints

```
GET    /api/messaging/chats
GET    /api/messaging/chats/:chatId
GET    /api/messaging/chats/:chatId/messages
POST   /api/messaging/messages
POST   /api/messaging/messages/read
DELETE /api/messaging/messages/:messageId
GET    /api/messaging/unread/count
```

## Frontend Implementation

### 1. Messaging Service

Location: `frontend/src/services/messaging.service.ts`

Handles HTTP requests to the messaging API:

```typescript
-getChats() -
  getChat() -
  getMessages() -
  sendMessage() -
  markAsRead() -
  deleteMessage() -
  getUnreadCount();
```

### 2. WebSocket Client

Location: `frontend/src/services/messaging.websocket.ts`

Manages WebSocket connection and events:

```typescript
-connect(token) -
  joinChat(chatId) -
  leaveChat(chatId) -
  sendTypingIndicator(chatId, isTyping) -
  markMessagesAsRead(chatId, messageIds);
```

Event listeners:

- `onNewMessage(handler)` - New message received
- `onTyping(handler)` - Typing indicator
- `onMessagesRead(handler)` - Messages marked as read
- `onActiveUsers(handler)` - Active users list
- `onUserOnline(handler)` - User came online
- `onUserOffline(handler)` - User went offline

### 3. Messaging Store (Zustand)

Location: `frontend/src/stores/messaging.store.ts`

State:

```typescript
- chats: Chat[]
- selectedChatId: string | null
- currentMessages: Message[]
- activeUsers: ActiveUser[]
- typingUsers: Set<string>
- unreadCount: number
```

Actions:

```typescript
-loadChats() -
  selectChat() -
  loadMessages() -
  sendMessage() -
  markMessagesAsRead() -
  deleteMessage() -
  startTyping() -
  stopTyping();
```

### 4. React Components

#### MessagingPage

Main container component that:

- Initializes WebSocket connection
- Subscribes to real-time events
- Manages chat selection

#### ChatList

Displays list of chats with:

- Search functionality
- Unread badge
- Online status indicator
- Last message preview

#### MessageList

Displays messages with:

- Message bubbles (different styling for sent/received)
- Timestamp
- Read status (single/double checkmark)
- Typing indicator animation
- Infinite scroll support

#### MessageInput

Input area with:

- Textarea for message content
- Send button
- Attachment button
- Typing indicator emission
- Keyboard shortcuts (Ctrl+Enter)

#### MessageItem

Individual message component with:

- Content display
- Timestamp
- Read by count
- Delete button (for own messages)
- Attachment preview

## Integration Steps

### 1. Register Messaging Module in Backend

Ensure the module is imported in `app.module.ts`:

```typescript
import { MessagingModule } from './modules/messaging/messaging.module';

@Module({
  imports: [
    // ...
    MessagingModule,
    // ...
  ],
})
export class AppModule {}
```

### 2. Add Messaging Route in Frontend

Add to your routing config (e.g., in App.tsx):

```typescript
<Route path="/messaging" element={<MessagingPage />} />
```

Wrap with authentication guard:

```typescript
<ProtectedRoute path="/messaging" element={<MessagingPage />} />
```

### 3. Connect to WebSocket

The WebSocket connection is automatically established in `MessagingPage.useEffect()` using the JWT token from localStorage.

### 4. Update API Base URL

Ensure the `API_BASE_URL` constant is set correctly in `frontend/src/config/constants.ts`:

```typescript
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
```

## Real-Time Features

### Typing Indicator

When a user starts typing:

1. Client sends `message:typing` event with `isTyping: true`
2. Server broadcasts to other participants in the chat
3. Other clients display "Someone is typing..." animation

### Read Status

When a user reads a message:

1. Client detects message visibility
2. Sends `messages:read` event with message IDs
3. Server updates message `readBy` field
4. Broadcasts to all participants
5. Senders see read/delivered status

### Active Users

- Server tracks connected users
- Broadcasts active users list to all clients
- Clients display online status in chat list

### Message Status

- `sent`: Message created on server
- `delivered`: Message received by client
- `seen`: Message read by recipient

## Error Handling

The system implements comprehensive error handling:

### Role-Based Access Denial

```typescript
if (!canSendMessage(sender.role, recipient.role)) {
  throw new ForbiddenException(
    'You do not have permission to chat with this user',
  );
}
```

### Authentication

WebSocket requires valid JWT token in handshake auth.

### Soft Deletes

Messages are soft-deleted (not permanently removed) for record keeping.

## Security Considerations

1. **JWT Authentication**: All WebSocket connections require JWT token
2. **Role-Based Access Control**: Enforced at service level
3. **User Validation**: Sender and recipient verified before message creation
4. **Participant Verification**: Users can only view chats they're part of
5. **Soft Deletes**: Allow auditing and compliance requirements

## Performance Optimizations

1. **Pagination**: Messages and chats are paginated (default 50 and 20 items)
2. **Lazy Loading**: Messages loaded on demand as user scrolls
3. **WebSocket Rooms**: Users only receive events for chats they joined
4. **Unread Counts**: Updated only when necessary
5. **Index Optimization**: Consider adding MongoDB indexes on frequently queried fields

## Testing

### Backend Testing

```bash
npm run test --prefix backend
npm run test:e2e --prefix backend
```

### Frontend Testing

```bash
npm run test --prefix frontend
```

## Troubleshooting

### WebSocket Connection Issues

1. Check JWT token is valid
2. Verify CORS configuration in gateway
3. Ensure token is passed in auth header

### Messages Not Appearing

1. Check user has permission to chat (role validation)
2. Verify JWT token is not expired
3. Check database connection

### Typing Indicator Not Showing

1. Verify WebSocket is connected
2. Check user has joined the chat room
3. Verify typing event is being emitted

## Future Enhancements

1. **Message Reactions**: Emojis on messages
2. **Group Chats**: Multiple participants
3. **File Uploads**: Share documents and images
4. **Message Search**: Full-text search across chats
5. **Notifications**: Push and email notifications
6. **Message Encryption**: End-to-end encryption
7. **Mobile App**: React Native version
8. **Voice/Video**: Real-time call capability
