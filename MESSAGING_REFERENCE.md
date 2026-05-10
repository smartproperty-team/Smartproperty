# Messaging System - File Structure & Quick Reference

## 📁 Project Structure

```
backend/src/modules/messaging/
├── entities/
│   ├── chat.entity.ts              # Chat data model
│   ├── message.entity.ts           # Message data model
│   └── index.ts                    # Entity exports
├── dto/
│   ├── create-message.dto.ts       # Message creation validation
│   ├── get-chats.dto.ts            # Chat query validation
│   ├── message-response.dto.ts     # API response format
│   └── index.ts                    # DTO exports
├── messaging.access-rules.ts       # Role-based access rules
├── messaging.service.ts            # Business logic
├── messaging.gateway.ts            # WebSocket server
├── messaging.controller.ts         # REST endpoints
└── messaging.module.ts             # NestJS module

frontend/src/
├── components/messaging/
│   ├── ChatList.tsx                # Chat list with search
│   ├── MessageItem.tsx             # Individual message
│   ├── MessageList.tsx             # Message display list
│   ├── MessageInput.tsx            # Input with typing
│   ├── MessagingPage.tsx           # Main container
│   └── index.ts                    # Component exports
├── services/
│   ├── messaging.service.ts        # HTTP API client
│   └── messaging.websocket.ts      # WebSocket client
└── stores/
    └── messaging.store.ts          # Zustand state

docs/
├── MESSAGING_SYSTEM.md             # Full documentation
├── MESSAGING_ARCHITECTURE.md       # Diagrams & flows
└── (other docs)

root/
├── MESSAGING_QUICK_START.md        # Quick start guide
├── MESSAGING_DEPLOYMENT_CHECKLIST.md
└── MESSAGING_IMPLEMENTATION_SUMMARY.md
```

## 🚀 Quick Start Commands

### Backend

```bash
# Start development server
npm run start:dev --prefix backend

# Run tests
npm run test --prefix backend

# Run e2e tests
npm run test:e2e --prefix backend

# Check TypeScript
npx tsc --noEmit --project backend/tsconfig.json
```

### Frontend

```bash
# Install dependencies (includes socket.io-client)
npm install

# Start dev server
npm run dev --prefix frontend

# Run tests
npm run test --prefix frontend

# Build for production
npm run build --prefix frontend
```

## 📚 Key Files to Know

| Purpose          | File                                                       | Language         |
| ---------------- | ---------------------------------------------------------- | ---------------- |
| Messages stored  | `backend/src/modules/messaging/entities/message.entity.ts` | TypeScript       |
| Chats stored     | `backend/src/modules/messaging/entities/chat.entity.ts`    | TypeScript       |
| Role rules       | `backend/src/modules/messaging/messaging.access-rules.ts`  | TypeScript       |
| Business logic   | `backend/src/modules/messaging/messaging.service.ts`       | TypeScript       |
| Real-time server | `backend/src/modules/messaging/messaging.gateway.ts`       | TypeScript       |
| REST endpoints   | `backend/src/modules/messaging/messaging.controller.ts`    | TypeScript       |
| API client       | `frontend/src/services/messaging.service.ts`               | TypeScript       |
| WebSocket client | `frontend/src/services/messaging.websocket.ts`             | TypeScript       |
| State management | `frontend/src/stores/messaging.store.ts`                   | TypeScript       |
| UI components    | `frontend/src/components/messaging/*.tsx`                  | TypeScript/React |

## 🔌 API Quick Reference

### Send a Message

```typescript
// Frontend
const store = useMessagingStore();
await store.sendMessage(recipientId, 'Hello there!');

// or direct service
import messagingService from '@/services/messaging.service';
messagingService.setToken(token);
await messagingService.sendMessage(recipientId, 'Hello!');
```

### Get Chats

```typescript
const { chats, total } = await messagingService.getChats(page, limit, search);
```

### Start WebSocket

```typescript
import messagingWebSocket from '@/services/messaging.websocket';

await messagingWebSocket.connect(token);
messagingWebSocket.joinChat(chatId);
```

### Listen to Events

```typescript
// New message
messagingWebSocket.onNewMessage((message) => {
  console.log('New message:', message);
});

// Typing indicator
messagingWebSocket.onTyping((data) => {
  console.log(`${data.userId} is typing:`, data.isTyping);
});

// Read status
messagingWebSocket.onMessagesRead((data) => {
  console.log(`${data.messageIds.length} messages read`);
});

// Active users
messagingWebSocket.onActiveUsers((data) => {
  console.log('Active users:', data.users);
});
```

## 🔐 Role Access Matrix

```
TENANT                    ← → REAL_ESTATE_AGENT
TENANT                    ← → RENTAL_MANAGER
RENTAL_MANAGER            ← → OWNER
REAL_ESTATE_AGENT         ← → BRANCH_MANAGER
REAL_ESTATE_AGENT         ← → OWNER
BRANCH_MANAGER            ← → SUPER_ADMIN
SERVICE_PROVIDER          ← → RENTAL_MANAGER
SERVICE_PROVIDER          ← → REAL_ESTATE_AGENT
ACCOUNTANT_ADMIN_ASSIST   ← → SUPER_ADMIN
ACCOUNTANT_ADMIN_ASSIST   ← → BRANCH_MANAGER
SUPPORT/COMPLIANCE        ← → SUPER_ADMIN
SUPPORT/COMPLIANCE        ← → BRANCH_MANAGER
SUPPORT/COMPLIANCE        ← → REAL_ESTATE_AGENT
```

## 🔄 WebSocket Events

### Client → Server

```typescript
socket.emit('chat:join', { chatId });
socket.emit('chat:leave', { chatId });
socket.emit('message:typing', { chatId, isTyping });
socket.emit('messages:read', { chatId, messageIds });
```

### Server → Client

```typescript
socket.on('message:new', (messageData) => {});
socket.on('message:typing', (typingData) => {});
socket.on('messages:read', (readData) => {});
socket.on('users:active', (activeUsersData) => {});
socket.on('chat:user_online', (userData) => {});
socket.on('chat:user_offline', (userData) => {});
```

## 📊 Database Schema Quick Reference

### Chats Collection

```javascript
{
  _id: ObjectId,
  participantIds: ["user1Id", "user2Id"],
  lastMessageAt: ISODate(),
  lastMessageContent: "Hello there!",
  lastMessageSenderId: "user1Id",
  createdAt: ISODate(),
  updatedAt: ISODate(),
  isDeleted: false,
  participantMetadata: {
    "user1Id": { unreadCount: 0, lastReadAt: ISODate(), isActive: false },
    "user2Id": { unreadCount: 1, lastReadAt: ISODate(), isActive: true }
  }
}
```

### Messages Collection

```javascript
{
  _id: ObjectId,
  chatId: ObjectId("chatId"),
  senderId: "user1Id",
  content: "Hello there!",
  status: "seen",
  readBy: {
    "user1Id": { readAt: ISODate() },
    "user2Id": { readAt: ISODate() }
  },
  createdAt: ISODate(),
  updatedAt: ISODate(),
  isDeleted: false,
  attachments: [],
  mentions: [],
  replyToId: null
}
```

## ⚙️ Environment Variables Needed

```bash
# Backend
JWT_SECRET=your_jwt_secret
MONGODB_URI=mongodb://localhost:27017/smartproperty
NODE_ENV=development

# Frontend
REACT_APP_API_URL=http://localhost:3000/api
```

## 🧪 Example Test Flow

```bash
# Terminal 1: Start Backend
npm run start:dev --prefix backend

# Terminal 2: Start Frontend
npm run dev --prefix frontend

# Browser 1: Login as tenant@test.com
# Navigate to http://localhost:5173/messaging

# Browser 2: Login as agent@test.com (different browser/incognito)
# Navigate to http://localhost:5173/messaging

# Browser 1: Send message to agent
# Browser 2: Should receive message in real-time
```

## 🐛 Common Debugging Steps

1. **Check WebSocket Connection**

   ```javascript
   // In browser console
   console.log(messagingWebSocket.isConnected());
   ```

2. **Check Store State**

   ```javascript
   import { useMessagingStore } from '@/stores/messaging.store';
   const state = useMessagingStore.getState();
   console.log(state);
   ```

3. **Check Backend Logs**

   ```bash
   # Look for WebSocket connection logs
   grep "Connected to messaging" backend-console-output
   ```

4. **Test Role Rules**
   ```typescript
   import { canSendMessage } from '@/modules/messaging/messaging.access-rules';
   console.log(canSendMessage('tenant', 'real_estate_agent')); // true
   console.log(canSendMessage('tenant', 'tenant')); // false
   ```

## 📱 Component Props Reference

### MessagingPage

No props required. Works standalone with stores.

### ChatList

```typescript
interface ChatListProps {
  onSelectChat: (chatId: string) => void;
  selectedChatId: string | null;
}
```

### MessageList

```typescript
interface MessageListProps {
  currentUserId: string;
  onDeleteMessage: (messageId: string) => void;
}
```

### MessageInput

```typescript
interface MessageInputProps {
  recipientId: string;
  chatId: string;
  onSendMessage: (content: string) => void;
}
```

### MessageItem

```typescript
interface MessageItemProps {
  message: Message;
  isSent: boolean;
  isCurrentUser: boolean;
  onDelete: (messageId: string) => void;
}
```

## 🔗 Important Links in Code

- **Entity Definitions**: `backend/src/modules/messaging/entities/`
- **Access Rules**: `backend/src/modules/messaging/messaging.access-rules.ts`
- **Gateway Handler**: `backend/src/modules/messaging/messaging.gateway.ts:@SubscribeMessage`
- **Service Methods**: `backend/src/modules/messaging/messaging.service.ts`
- **React Hooks**: `frontend/src/hooks/useMessagingStore.ts` (or via `useMessagingStore()`)
- **Store Actions**: `frontend/src/stores/messaging.store.ts`

## 📝 TypeScript Types

```typescript
// Message
interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  status: 'sent' | 'delivered' | 'seen';
  createdAt: Date;
  readBy: Record<string, { readAt: Date }>;
}

// Chat
interface Chat {
  _id: string;
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
}

// Active User
interface ActiveUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  connectedAt: Date;
}
```

## 🚨 Error Messages

| Error                                               | Cause                      | Solution                          |
| --------------------------------------------------- | -------------------------- | --------------------------------- |
| "You do not have permission to chat with this user" | Role pair not allowed      | Check `messaging.access-rules.ts` |
| "User not found"                                    | User ID invalid or deleted | Verify user exists                |
| "WebSocket not connected"                           | Connection failed          | Check token, backend running      |
| "Invalid chat ID"                                   | Malformed ObjectId         | Verify chat exists                |
| "You are not a participant"                         | Not in chat                | Verify user is added to chat      |

## 📞 Support Resources

- **Full Documentation**: `docs/MESSAGING_SYSTEM.md`
- **Architecture Diagrams**: `docs/MESSAGING_ARCHITECTURE.md`
- **Quick Start**: `MESSAGING_QUICK_START.md`
- **Deployment Checklist**: `MESSAGING_DEPLOYMENT_CHECKLIST.md`
- **Implementation Summary**: `MESSAGING_IMPLEMENTATION_SUMMARY.md`
