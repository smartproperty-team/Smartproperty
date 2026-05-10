# Messaging System - Quick Start Guide

## Overview

This is a complete role-based messaging system with WebSocket support, typing indicators, and message read status tracking.

## What's Included

### Backend (NestJS)

- [x] Message entity with read status tracking
- [x] Chat entity for conversation management
- [x] Role-based access control rules
- [x] Messaging service with business logic
- [x] WebSocket gateway for real-time communication
- [x] REST API endpoints for messaging operations
- [x] MongoDB integration

### Frontend (React)

- [x] Messaging API service client
- [x] WebSocket client
- [x] Zustand store for state management
- [x] Complete UI components (ChatList, MessageList, MessageInput)
- [x] Typing indicators
- [x] Read status indicators
- [x] Mobile-responsive design

## Setup Instructions

### Backend Setup

1. **Verify Module Import** (Already done)
   - Check `backend/src/app.module.ts` has `MessagingModule` imported

2. **Create Collections** (if needed)

   ```bash
   cd backend
   npm run seed
   ```

3. **Install Dependencies** (already in package.json)

   ```bash
   npm install
   ```

4. **Run Backend Development Server**
   ```bash
   npm run start:dev
   ```

### Frontend Setup

1. **Verify Components** (Already created)
   - Components are in `frontend/src/components/messaging/`
   - Store is in `frontend/src/stores/messaging.store.ts`
   - Services are in `frontend/src/services/`

2. **Check Dependencies**
   Ensure `socket.io-client` is installed:

   ```bash
   cd frontend
   npm install socket.io-client
   ```

3. **Add Route** to your App.tsx:

   ```typescript
   import { MessagingPage } from './components/messaging';

   // In your routing
   <Route path="/messaging" element={<ProtectedRoute element={<MessagingPage />} />} />
   ```

4. **Set API Base URL**
   In `frontend/src/config/constants.ts`:

   ```typescript
   export const API_BASE_URL =
     process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
   ```

5. **Run Frontend Development Server**
   ```bash
   npm run dev
   ```

## Testing the Messaging System

### 1. Test Role-Based Access

```bash
# Create two test users with different roles
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tenant@test.com",
    "password": "Test123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "tenant"
  }'

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@test.com",
    "password": "Test123!",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "real_estate_agent"
  }'
```

### 2. Test Sending a Message

```bash
# Login as tenant
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tenant@test.com", "password": "Test123!"}' \
  -s | jq -r '.access_token')

# Send message to agent (should succeed - tenant can chat with agent)
curl -X POST http://localhost:3000/api/messaging/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "recipientId": "agent-user-id",
    "content": "Hello, I am interested in the property"
  }'
```

### 3. Test WebSocket Connection

1. Open browser to `http://localhost:5173/messaging` (or your frontend URL)
2. Login as a test user
3. Select or create a chat
4. Send a message
5. Switch to another browser window logged in as another user
6. Verify message appears in real-time
7. Type in message input to verify typing indicator
8. Message should show read status when viewed

## API Documentation

### REST Endpoints

#### Get All Chats

```
GET /api/messaging/chats?page=1&limit=20&search=optional
Authorization: Bearer {token}
Response:
{
  "chats": [...],
  "total": 5
}
```

#### Get Chat Details

```
GET /api/messaging/chats/:chatId
Authorization: Bearer {token}
Response:
{
  "chat": {...},
  "participant": {...}
}
```

#### Get Messages in Chat (Paginated)

```
GET /api/messaging/chats/:chatId/messages?page=1&limit=50
Authorization: Bearer {token}
Response:
{
  "messages": [...],
  "total": 145
}
```

#### Send Message

```
POST /api/messaging/messages
Authorization: Bearer {token}
Body:
{
  "recipientId": "user-id",
  "content": "Hello!",
  "attachments": [],
  "mentions": [],
  "replyToId": "optional-message-id"
}
Response: Message object
```

#### Mark Messages as Read

```
POST /api/messaging/messages/read
Authorization: Bearer {token}
Body:
{
  "chatId": "chat-id",
  "messageIds": ["msg1", "msg2"]
}
```

#### Delete Message

```
DELETE /api/messaging/messages/:messageId
Authorization: Bearer {token}
Response: { "success": true }
```

#### Get Unread Count

```
GET /api/messaging/unread/count
Authorization: Bearer {token}
Response: { "unreadCount": 5 }
```

### WebSocket Events

#### Connect

```typescript
await messagingWebSocket.connect(token);
```

#### Join Chat Room

```typescript
messagingWebSocket.joinChat(chatId);
```

#### Send Typing Indicator

```typescript
messagingWebSocket.sendTypingIndicator(chatId, true); // start typing
messagingWebSocket.sendTypingIndicator(chatId, false); // stop typing
```

#### Subscribe to New Messages

```typescript
messagingWebSocket.onNewMessage((message) => {
  console.log('New message:', message);
});
```

#### Subscribe to Typing Indicator

```typescript
messagingWebSocket.onTyping((data) => {
  console.log(`${data.userId} is typing:`, data.isTyping);
});
```

#### Subscribe to Read Status

```typescript
messagingWebSocket.onMessagesRead((data) => {
  console.log(`Messages read by ${data.userId}`);
});
```

## Role-Based Access Control

### Allowed Chat Pairs

- **Tenant** ↔ Real Estate Agent, Rental Manager
- **Real Estate Agent** ↔ Tenant, Branch Manager, Owner, Service Provider
- **Rental Manager** ↔ Tenant, Owner, Service Provider
- **Owner** ↔ Rental Manager, Real Estate Agent
- **Branch Manager** ↔ Real Estate Agent, Super Admin
- **Service Provider** ↔ Rental Manager, Real Estate Agent
- **Super Admin** ↔ All roles
- **Support/Compliance** ↔ Super Admin, Branch Manager, Agents

## Common Issues & Solutions

### Issue: WebSocket connects but messages don't appear

**Solution:**

1. Verify JWT token is valid
2. Check browser console for errors
3. Ensure recipient has permission to chat with sender based on roles
4. Verify MongoDB is connected

### Issue: Typing indicator doesn't show

**Solution:**

1. Check WebSocket is connected
2. Verify you've called `joinChat(chatId)` first
3. Check other user is subscribed to `onTyping` event

### Issue: "You do not have permission to chat with this user"

**Solution:**
Check the role-based access rules. Ensure both users' roles are in the allowed pairs list.

### Issue: Messages not persisting

**Solution:**

1. Verify MongoDB connection string is correct
2. Check `messages` collection exists in database
3. Review backend logs for errors

## Database Schema

### chats Collection

```typescript
{
  _id: ObjectId,
  participantIds: [userId1, userId2],
  lastMessageAt: Date,
  lastMessageContent: string,
  lastMessageSenderId: string,
  createdAt: Date,
  updatedAt: Date,
  isDeleted: false,
  participantMetadata: {
    "userId1": {
      unreadCount: 0,
      lastReadAt: Date,
      isActive: false
    },
    "userId2": {
      unreadCount: 1,
      lastReadAt: Date,
      isActive: true
    }
  }
}
```

### messages Collection

```typescript
{
  _id: ObjectId,
  chatId: ObjectId,
  senderId: string,
  content: string,
  status: "sent" | "delivered" | "seen",
  readBy: {
    "userId1": { readAt: Date },
    "userId2": { readAt: Date }
  },
  createdAt: Date,
  updatedAt: Date,
  isDeleted: false,
  attachments: [],
  mentions: [],
  replyToId: ObjectId (optional)
}
```

## Performance Tips

1. **Use Pagination**: Always use page/limit parameters for large chat lists
2. **Lazy Load Messages**: Messages are paginated (default 50 items)
3. **Clean Up Subscriptions**: Unsubscribe from WebSocket events when component unmounts
4. **Index Database**: Add MongoDB indexes on frequently queried fields:
   ```javascript
   db.messages.createIndex({ chatId: 1, createdAt: -1 });
   db.chats.createIndex({ participantIds: 1, lastMessageAt: -1 });
   ```

## Next Steps

1. Test the messaging system with multiple users
2. Integrate into your main navigation
3. Add notification badges to messaging icon
4. Consider adding message search functionality
5. Add support for file/image attachments
6. Implement push notifications for new messages
