# Multi-Session AI System - Complete Implementation

## Overview
The AI system has been upgraded to support multiple sessions per user. Users can now create and manage multiple conversation sessions, each with its own set of messages and state.

## Database Changes

### New Schema
- **AiSession**: Represents a conversation session with metadata
- **AiMessage**: Represents individual messages within a session
  
### Key Improvements
- Users can have multiple independent sessions
- Each session maintains its own conversation state
- Messages are stored separately for better data organization
- Supports session title and description for better organization

## API Routes

### Session Management Endpoints

#### 1. Create a New Session
**POST** `/ai/sessions`
```json
{
  "title": "Paris Trip Planning",
  "description": "Planning a 2-week trip to Paris in summer 2026"
}
```
Response:
```json
{
  "session_id": "clup1234567890abcdef",
  "user_id": "123",
  "title": "Paris Trip Planning",
  "description": "Planning a 2-week trip to Paris in summer 2026",
  "current_step": "location",
  "created_at": "2026-05-10T20:22:26.000Z",
  "updated_at": "2026-05-10T20:22:26.000Z"
}
```

#### 2. Get All Sessions for a User
**GET** `/ai/sessions`
Response: Array of sessions with message count and latest message

#### 3. Get a Specific Session with All Messages
**GET** `/ai/sessions/:sessionId`
Response: Session details with complete message history

#### 4. Update Session Metadata
**PUT** `/ai/sessions/:sessionId`
```json
{
  "title": "Updated Session Title",
  "description": "Updated description"
}
```

#### 5. Delete a Session
**DELETE** `/ai/sessions/:sessionId`
Response:
```json
{
  "message": "Session deleted successfully",
  "sessionId": "clup1234567890abcdef"
}
```

#### 6. Send a Message to a Specific Session
**POST** `/ai/sessions/:sessionId/message`
```json
{
  "message": "I want to plan a trip to Paris next month."
}
```
Response:
```json
{
  "session_id": "clup1234567890abcdef",
  "user_id": "123",
  "message_id": "msg1234567890",
  "client_message": "I want to plan a trip to Paris next month.",
  "ai_message": "Great! I'd love to help you plan your Paris trip...",
  "current_step": "start_date",
  "parameters_extracted": {
    "location": "Paris",
    "start_date": null,
    "end_date": null,
    ...
  },
  ...
}
```

### Legacy Endpoints (Still Supported)
These endpoints maintain backward compatibility:

#### POST `/ai/generate-ai-response`
- Creates a new session automatically
- Sends the message to that session
- Returns the response

#### GET `/ai/generate-ai-response`
- Returns all sessions for the user with message counts

## Service Methods

All methods are available in the `AiService`:

### Session Management
- `createSession(userId, createSessionDto)` - Create a new session
- `getAllSessions(userId)` - Get all sessions for a user
- `getSessionById(userId, sessionId)` - Get a specific session with messages
- `updateSession(userId, sessionId, updateSessionDto)` - Update session metadata
- `deleteSession(userId, sessionId)` - Delete a session
- `sendMessageToSession(userId, sessionId, sendMessageDto)` - Send a message to a session

### Legacy Methods
- `createAIResponse(createAiDto, userId)` - Create response (backward compatible)
- `findAllChat(userId)` - Get all chat history (backward compatible)

## Data Models

### AiSession
```prisma
model AiSession {
  id                    String    @id @default(cuid())
  userId                Int
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Session metadata
  title                 String    @default("Untitled Session")
  description           String?
  
  // Conversation state (latest state)
  currentStep           String    @default("location")
  
  // Extracted parameters (updated with each message)
  location              String?
  startDate             DateTime?
  endDate               DateTime?
  travelers             Int?
  budget                String?
  experience            String?
  citizenship           String?
  passengers            Int?
  passengerPreferences  String?
  
  // Trip details
  tripCard              Json?
  tripGuide             Json?
  
  // Status
  submitted             Boolean   @default(false)
  checkoutRequired      Boolean   @default(false)
  
  // Relations
  messages              AiMessage[]
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

### AiMessage
```prisma
model AiMessage {
  id                    String    @id @default(cuid())
  sessionId             String
  session               AiSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  // Message content
  clientMessage         String
  aiMessage             String
  
  // Message-specific extraction
  extractedData         Json?
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

## DTOs

### CreateSessionDto
```typescript
{
  title: string;           // Required
  description?: string;    // Optional
}
```

### UpdateSessionDto
```typescript
{
  title?: string;          // Optional
  description?: string;    // Optional
}
```

### SendMessageDto
```typescript
{
  message: string;         // Required - the user's message
}
```

## Usage Examples

### Example 1: Create a Session and Send Messages
```bash
# 1. Create a new session
curl -X POST http://localhost:3000/ai/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Europe Trip",
    "description": "Planning a European vacation"
  }'

# Returns: { "session_id": "abc123", ... }

# 2. Send a message to the session
curl -X POST http://localhost:3000/ai/sessions/abc123/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to visit Paris and Rome"
  }'
```

### Example 2: Get All Sessions and View a Specific Session
```bash
# Get all sessions
curl -X GET http://localhost:3000/ai/sessions \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get a specific session with all messages
curl -X GET http://localhost:3000/ai/sessions/abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 3: Manage Sessions
```bash
# Update session title
curl -X PUT http://localhost:3000/ai/sessions/abc123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Europe Trip 2026"
  }'

# Delete a session
curl -X DELETE http://localhost:3000/ai/sessions/abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Key Features

1. **Multiple Sessions**: Users can create and manage multiple independent conversation sessions
2. **Session Metadata**: Each session has a title and description for organization
3. **Message History**: All messages are stored and can be retrieved for any session
4. **State Management**: Each session maintains its own conversation state
5. **Backward Compatibility**: Old endpoints still work and automatically create sessions
6. **User Isolation**: Each user can only access their own sessions
7. **Scalability**: The new structure supports unlimited messages per session

## Migration Information

Database migration: `20260510202226_add_multi_session_support`

Changes made:
- Added `AiMessage` table
- Updated `AiSession` schema
- Added session metadata fields (title, description)
- Removed per-message fields from AiSession (clientMessage, aiMessage, sessionId)

## Security & Authorization

- All endpoints require authentication (`AuthGuard`)
- All endpoints require CLIENT role (`@Roles(UserRoles.CLIENT)`)
- Users can only access their own sessions (userId validation)
- Session deletion cascades to all related messages
