# Messaging System Architecture Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Zustand)"]
        UI["UI Components<br/>- ChatList<br/>- MessageList<br/>- MessageInput"]
        Store["Messaging Store<br/>(Zustand)"]
        API["API Service<br/>(HTTP)"]
        WS["WebSocket Client<br/>(Socket.IO)"]
    end

    subgraph Backend["Backend (NestJS)"]
        Controller["Messaging Controller<br/>(REST Endpoints)"]
        Service["Messaging Service<br/>(Business Logic)"]
        Gateway["Messaging Gateway<br/>(WebSocket)"]
        Rules["Access Rules<br/>(Role Validation)"]
        Entities["Entities<br/>- Chat<br/>- Message"]
    end

    subgraph Database["MongoDB"]
        ChatCol["chats<br/>Collection"]
        MessageCol["messages<br/>Collection"]
    end

    subgraph Auth["Authentication"]
        JWT["JWT Token<br/>(localStorage)"]
    end

    UI -->|dispatch actions| Store
    Store -->|fetch/send| API
    Store -->|emit/subscribe| WS

    API -->|REST requests| Controller
    WS -->|WebSocket events| Gateway

    Controller -->|business logic| Service
    Gateway -->|service calls| Service

    Service -->|validate roles| Rules
    Rules -->|permit/deny| Service

    Service -->|CRUD ops| Entities
    Entities -->|persist| ChatCol
    Entities -->|persist| MessageCol

    JWT -->|token| API
    JWT -->|auth header| WS

    Gateway -->|broadcast events| WS
    WS -->|receive events| Store

    classDef frontend fill:#61dafb,stroke:#1f2937,color:#000
    classDef backend fill:#68a063,stroke:#1f2937,color:#fff
    classDef database fill:#13aa52,stroke:#1f2937,color:#fff
    classDef auth fill:#f47920,stroke:#1f2937,color:#fff

    class Frontend frontend
    class Backend backend
    class Database database
    class Auth auth
```

## Data Flow Diagrams

### 1. Sending a Message

```mermaid
sequenceDiagram
    participant User1 as User1<br/>(Tenant)
    participant FrontendUI as Frontend UI
    participant Store as Store
    participant API as Messaging API
    participant Backend as Backend<br/>Service
    participant DB as MongoDB
    participant WS as WebSocket
    participant User2 as User2<br/>(Real Estate Agent)

    User1->>FrontendUI: Click Send
    FrontendUI->>Store: sendMessage()
    Store->>API: POST /messages
    API->>Backend: sendMessage(userId, DTO)

    Backend->>Backend: Validate roles
    alt Role mismatch
        Backend-->>FrontendUI: ForbiddenException
    else Roles allowed
        Backend->>DB: Create Message
        Backend->>DB: Update Chat
        Backend-->>API: Message created
        Backend->>WS: emit message:new
    end

    API-->>Store: Message object
    Store->>Store: addMessageToCurrentChat()

    WS->>User2: message:new event
    User2->>Store: handleNewMessage()
    Store->>FrontendUI: Update UI
    User2->>FrontendUI: See new message
```

### 2. Real-Time Typing Indicator

```mermaid
sequenceDiagram
    participant User1 as User1
    participant Frontend1 as Frontend1
    participant WS1 as WebSocket<br/>Client1
    participant Gateway as Gateway<br/>(Server)
    participant WS2 as WebSocket<br/>Client2
    participant Frontend2 as Frontend2
    participant User2 as User2

    User1->>Frontend1: Start typing
    Frontend1->>WS1: sendTypingIndicator(true)
    WS1->>Gateway: emit message:typing

    Gateway->>Gateway: Get chat room members
    Gateway->>WS2: broadcast message:typing
    WS2->>Frontend2: onTyping event

    Frontend2->>Frontend2: setTypingUsers(user1)
    Frontend2->>User2: Show "User1 is typing..."

    Note over User1: User stops typing
    Frontend1->>WS1: sendTypingIndicator(false)
    WS1->>Gateway: emit message:typing
    Gateway->>WS2: broadcast message:typing
    WS2->>Frontend2: onTyping event
    Frontend2->>Frontend2: removeTypingUsers(user1)
    Frontend2->>User2: Hide typing indicator
```

### 3. Message Read Status

```mermaid
sequenceDiagram
    participant Sender as Sender<br/>(viewed message)
    participant Gateway as Gateway
    participant Recipient as Recipient
    participant DB as MongoDB
    participant RecipientUI as Recipient UI

    Sender->>Sender: Message enters viewport
    Sender->>Gateway: emit messages:read
    Gateway->>DB: Update readBy field
    Gateway->>Recipient: broadcast messages:read
    Recipient->>RecipientUI: Update message status
    RecipientUI->>RecipientUI: Show ✓✓ (double checkmark)
```

### 4. Role-Based Access Control

```mermaid
graph TD
    A["User wants to chat<br/>with another user"] --> B["Frontend sends message"]
    B --> C["Backend receives request"]
    C --> D["Extract sender role"]
    C --> E["Extract recipient role"]
    D --> F["Check access rules"]
    E --> F
    F --> G{Is pair<br/>allowed?}
    G -->|Yes| H["Create/Get Chat"]
    G -->|No| I["Throw ForbiddenException"]
    H --> J["Save Message"]
    I --> K["Send error to UI"]
    J --> L["Emit WebSocket event"]
    L --> M["Recipient receives message"]
    K --> N["Show error to User"]

    classDef allowed fill:#90EE90,stroke:#1f2937,color:#000
    classDef denied fill:#FF6B6B,stroke:#1f2937,color:#fff

    class H,J,L,M allowed
    class I,K,N denied
```

## State Management Flow

```mermaid
graph TB
    subgraph Action["User Actions"]
        Send["Send Message"]
        Read["Read Message"]
        Type["Type/Stop"]
        Select["Select Chat"]
        Delete["Delete Message"]
    end

    subgraph Store["Zustand Store"]
        Chats["chats[]"]
        Messages["messages[]"]
        Typing["typingUsers"]
        Active["activeUsers"]
        Unread["unreadCount"]
    end

    subgraph UI["UI Updates"]
        ChatUI["ChatList"]
        MessageUI["MessageList"]
        TypingUI["Typing Animation"]
        BadgeUI["Unread Badge"]
    end

    Send -->|handleNewMessage| Messages
    Read -->|handleMessagesRead| Messages
    Type -->|handleTyping| Typing
    Select -->|loadMessages| Messages
    Delete -->|deleteMessage| Messages

    Messages -->|useMessagingStore| MessageUI
    Chats -->|useMessagingStore| ChatUI
    Typing -->|useMessagingStore| TypingUI
    Unread -->|useMessagingStore| BadgeUI

    classDef action fill:#FFE5B4,stroke:#1f2937,color:#000
    classDef store fill:#B4D7FF,stroke:#1f2937,color:#000
    classDef ui fill:#D7FFB4,stroke:#1f2937,color:#000

    class Send,Read,Type,Select,Delete action
    class Chats,Messages,Typing,Active,Unread store
    class ChatUI,MessageUI,TypingUI,BadgeUI ui
```

## WebSocket Event Flow

```mermaid
graph LR
    Client1["Client 1"] -->|emit| WS1["WebSocket"]
    WS1 -->|server receives| Gateway["Gateway"]
    Gateway -->|process| Service["Service"]
    Service -->|update| DB["Database"]
    Service -->|emit to room| WS2["WebSocket"]
    WS2 -->|receive| Client2["Client 2"]

    classDef client fill:#FFB6C1,stroke:#1f2937,color:#000
    classDef network fill:#87CEEB,stroke:#1f2937,color:#000
    classDef server fill:#90EE90,stroke:#1f2937,color:#000
    classDef database fill:#DDA0DD,stroke:#1f2937,color:#000

    class Client1,Client2 client
    class WS1,WS2 network
    class Gateway,Service server
    class DB database
```

## Role-Based Access Matrix

```mermaid
graph TB
    subgraph Rules["Allowed Chat Pairs"]
        R1["Tenant ↔<br/>Real Estate Agent"]
        R2["Tenant ↔<br/>Rental Manager"]
        R3["Rental Manager ↔<br/>Owner"]
        R4["Real Estate Agent ↔<br/>Branch Manager"]
        R5["Real Estate Agent ↔<br/>Owner"]
        R6["Branch Manager ↔<br/>Super Admin"]
        R7["Service Provider ↔<br/>Rental Manager"]
        R8["Service Provider ↔<br/>Real Estate Agent"]
        R9["Support/Compliance ↔<br/>Super Admin"]
        R10["Support/Compliance ↔<br/>Branch Manager/Agent"]
    end

    subgraph Matrix["Access Validation Results"]
        Allow["✅ Allow Message Send"]
        Deny["❌ Deny Message Send"]
    end

    R1 --> Allow
    R2 --> Allow
    R3 --> Allow
    R4 --> Allow
    R5 --> Allow
    R6 --> Allow
    R7 --> Allow
    R8 --> Allow
    R9 --> Allow
    R10 --> Allow

    classDef allowed fill:#90EE90,stroke:#1f2937,color:#000
    classDef denied fill:#FF6B6B,stroke:#1f2937,color:#fff

    class Allow allowed
    class Deny denied
```
