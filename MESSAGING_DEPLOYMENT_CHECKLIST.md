# Messaging System - Pre-Deployment Checklist

## Backend Setup Verification

### Module Configuration

- [ ] `MessagingModule` is imported in `app.module.ts`
- [ ] Database connection is working (MongoDB)
- [ ] JWT configuration is set up
- [ ] WebSocket CORS is configured correctly

### Database Preparation

- [ ] MongoDB is running and accessible
- [ ] `chats` collection can be created
- [ ] `messages` collection can be created
- [ ] Create indexes for performance:
  ```javascript
  db.messages.createIndex({ chatId: 1, createdAt: -1 });
  db.messages.createIndex({ chatId: 1, senderId: 1 });
  db.chats.createIndex({ participantIds: 1 });
  db.chats.createIndex({ participantIds: 1, lastMessageAt: -1 });
  ```

### API Testing

- [ ] Start backend: `npm run start:dev --prefix backend`
- [ ] Test REST endpoints with Postman/curl:
  - [ ] POST `/api/messaging/messages` - Send message
  - [ ] GET `/api/messaging/chats` - Get chats
  - [ ] GET `/api/messaging/chats/:id/messages` - Get messages
  - [ ] DELETE `/api/messaging/messages/:id` - Delete message

### WebSocket Testing

- [ ] Backend compiled successfully
- [ ] No TypeScript errors: `npx tsc --noEmit --prefix backend`
- [ ] WebSocket server listening on `/messaging` namespace
- [ ] CORS allows frontend origin

## Frontend Setup Verification

### Dependencies

- [ ] All packages installed: `npm install`
- [ ] `socket.io-client` is installed: `npm list socket.io-client`
- [ ] `zustand` is installed: `npm list zustand`
- [ ] `date-fns` is installed: `npm list date-fns`
- [ ] `lucide-react` is installed: `npm list lucide-react`

### Configuration

- [ ] `REACT_APP_API_URL` is set in `.env` or `.env.local`
- [ ] Backend URL is accessible from frontend

### File Verification

- [ ] All components created in `src/components/messaging/`
  - [ ] `MessageItem.tsx`
  - [ ] `MessageList.tsx`
  - [ ] `MessageInput.tsx`
  - [ ] `ChatList.tsx`
  - [ ] `MessagingPage.tsx`
  - [ ] `index.ts`
- [ ] Store created at `src/stores/messaging.store.ts`
- [ ] Services created:
  - [ ] `src/services/messaging.service.ts`
  - [ ] `src/services/messaging.websocket.ts`

### Router Setup

- [ ] Import added to `App.tsx`:
  ```typescript
  import { MessagingPage } from './components/messaging';
  ```
- [ ] Route added:
  ```typescript
  <Route path="/messaging" element={<ProtectedRoute element={<MessagingPage />} />} />
  ```
- [ ] Navigation link added to main menu

### Authentication Verification

- [ ] JWT token is stored in `localStorage` after login
- [ ] Current user ID is stored as `userId` in `localStorage`
- [ ] User role is stored in token payload

## Integration Testing

### One User - Basic Operations

- [ ] Create test account (e.g., tenant@test.com)
- [ ] Login successfully
- [ ] Navigate to `/messaging` page
- [ ] Page loads without errors
- [ ] Chat list appears (may be empty initially)

### Two Users - Messaging Flow

1. Create two test accounts:
   - User A: tenant@test.com (role: tenant)
   - User B: agent@test.com (role: real_estate_agent)

2. Test sending message:
   - [ ] Login as User A
   - [ ] Navigate to messaging
   - [ ] Select or create chat with User B
   - [ ] Send a message
   - [ ] Message appears in chat

3. Test receiving message:
   - [ ] Open second browser/tab
   - [ ] Login as User B
   - [ ] Navigate to messaging
   - [ ] Message from User A appears in real-time
   - [ ] Read receipt shows as "sent"

### Real-Time Features Testing

#### Typing Indicator

- [ ] User A starts typing in message input
- [ ] User B (in the same chat) sees "Someone is typing..."
- [ ] User A stops typing
- [ ] Typing indicator disappears for User B
- [ ] No typing indicator after 2 seconds of inactivity

#### Read Status

- [ ] Send message from User A
- [ ] User B opens the message
- [ ] Message shows "seen" status (double checkmark) for User A
- [ ] Read status updates in real-time

#### Unread Count

- [ ] User A sends message to User B
- [ ] User B is not in the chat (or on different chat)
- [ ] Chat shows unread badge with count
- [ ] Count decreases when User B opens chat

### Role-Based Access Testing

#### Allowed Pairing (Tenant ↔ Agent)

- [ ] User A (tenant) can send message to User B (agent)
- [ ] Message is created successfully

#### Disallowed Pairing (Tenant ↔ Tenant)

- [ ] Cannot send message between two tenants
- [ ] Error message appears: "do not have permission"

#### Test All Role Pairs

- [ ] Create test accounts for each role
- [ ] Verify allowed pairs work
- [ ] Verify disallowed pairs fail gracefully
- [ ] Check error messages are helpful

### UI/UX Testing

#### Mobile Responsiveness

- [ ] Open messaging on mobile device (narrow viewport)
- [ ] Chat list and message area stack properly
- [ ] Back button appears and works on mobile
- [ ] Keyboard doesn't hide important UI on mobile

#### Chat List

- [ ] Search functionality works
- [ ] Chat highlighting works when selected
- [ ] Unread badge displays correctly
- [ ] Online indicator shows current status
- [ ] Last message preview truncates long text

#### Message Display

- [ ] Messages align correctly (left for received, right for sent)
- [ ] Timestamps display correctly
- [ ] Read status checkmarks show appropriately
- [ ] Deleted messages show "[Message deleted]"
- [ ] Attachments structure is ready (if implemented)

#### Message Input

- [ ] Can type multiline messages
- [ ] Send button is disabled when input is empty
- [ ] Send button is enabled with content
- [ ] Ctrl+Enter sends message
- [ ] Enter key doesn't send (only Ctrl+Enter)
- [ ] Attachment button is visible (for future implementation)

## Performance Testing

### Load Testing

- [ ] Load messaging page
- [ ] WebSocket connection establishes within 3 seconds
- [ ] Load 100 chats in chat list
- [ ] List scrolls smoothly
- [ ] Load 500 messages
- [ ] Messages load with pagination

### Network Conditions

- [ ] Try with slow network (DevTools throttling)
- [ ] Verify error handling when network is lost
- [ ] Verify reconnection works after network restored
- [ ] Message queue handling during offline (if implemented)

## Security Testing

### Authentication & Authorization

- [ ] Cannot access messaging without login
- [ ] Cannot access with invalid token
- [ ] Token expiration is handled
- [ ] Role-based access is enforced
- [ ] Users cannot access other users' private data

### Input Validation

- [ ] Empty message is rejected
- [ ] Very long message doesn't break UI
- [ ] Special characters are handled safely
- [ ] XSS attempts are prevented

### Data Privacy

- [ ] Users can only see their own chats
- [ ] Users cannot view other users' message history
- [ ] Deleted messages don't appear in list
- [ ] Soft delete is properly implemented

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari
- [ ] Chrome Mobile

## Error Scenarios

### Network Errors

- [ ] Handle connection timeout
- [ ] Handle connection refused
- [ ] Handle 404 (chat not found)
- [ ] Handle 403 (permission denied)
- [ ] Handle 500 (server error)

### User Scenarios

- [ ] User is deleted while chatting
- [ ] User loses internet connection
- [ ] User's JWT expires during chat
- [ ] Other user deletes message
- [ ] Chat is archived/removed

## Documentation Review

- [ ] README is updated with messaging feature
- [ ] API documentation matches implementation
- [ ] Architecture diagram is accurate
- [ ] Setup instructions are clear
- [ ] Examples are provided for all flows

## Performance Metrics

Before and after benchmarks:

- [ ] Initial page load time
- [ ] Time to load chat list
- [ ] Time to load first message
- [ ] Real-time message latency
- [ ] Memory usage (check for leaks)
- [ ] CPU usage during intense messaging

## Final Sign-Off

- [ ] All tests passed
- [ ] Documentation is complete
- [ ] Code review approved
- [ ] Performance acceptable
- [ ] Security review passed
- [ ] No console errors
- [ ] No TypeScript warnings
- [ ] Ready for production deployment

---

## Troubleshooting Guide

If tests fail, check these common issues:

### WebSocket not connecting

1. Verify backend is running on correct port
2. Check CORS configuration in gateway
3. Verify JWT token is valid
4. Check browser console for specific error

### Messages not appearing

1. Verify role-based access rules allow the pairing
2. Check database connection
3. Verify users are in the same chat
4. Check backend logs for errors

### Typing indicator not showing

1. Verify WebSocket is connected
2. Verify user has called `joinChat(chatId)`
3. Check typing timeout is working correctly
4. Verify other user is subscribed to typing events

### Read status not updating

1. Verify message is being marked as read
2. Check WebSocket room broadcast
3. Verify subscribers are listening to read events

---

## Post-Deployment Monitoring

After deployment:

- [ ] Monitor error logs for issues
- [ ] Track WebSocket connection stability
- [ ] Monitor database query performance
- [ ] Watch for memory leaks
- [ ] Verify real-time latency is acceptable
- [ ] Monitor user feedback and bug reports
