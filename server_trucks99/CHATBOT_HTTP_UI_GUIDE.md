# Chatbot HTTP Request and UI Guide

Base URL for local backend:

```text
http://localhost:3003
```

Most chatbot endpoints in this project require:

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

## 1. What is available in this project

This project has 2 different chat-related APIs:

1. `Assistant API`
   - Used for chatbot-style conversations.
   - Base path: `/api/assistant`

2. `Chat API`
   - Used for buyer/seller direct messaging.
   - Base path: `/api/chat`

If you want a **chatbot UI**, use the **Assistant API**.
If you want **user-to-user product chat**, use the **Chat API**.

## 2. HTTP Methods used

### `GET`
Used to **read data** from the server.

Examples:

- `GET /api/assistant/suggestions`
- `GET /api/assistant/flows`
- `GET /api/assistant/sessions`
- `GET /api/assistant/sessions/:id`
- `GET /api/chat/list`
- `GET /api/chat/messages/:roomId`

### `POST`
Used to **create data** or **send a message**.

Examples:

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/assistant/sessions`
- `POST /api/assistant/sessions/:id/messages`
- `POST /api/chat/create`
- `POST /api/chat/send`

### `PATCH`
Used to **update part of existing data**.

Example:

- `PATCH /api/assistant/sessions/:id`

### `DELETE`
Used to **remove data**.

Example:

- `DELETE /api/assistant/sessions/:id`

## 3. Authentication flow for Postman or UI

The assistant endpoints are protected. First, log in and get a token.

### Step 1: Send OTP

**Request**

```http
POST /api/auth/send-otp
```

**Body**

```json
{
  "mobile": "9876543210"
}
```

**Response example**

```json
{
  "message": "OTP sent successfully.",
  "otpSentViaSms": true,
  "otpForDev": "123456"
}
```

Note:
- In development, `otpForDev` may be returned.
- In production, OTP is normally sent by SMS.

### Step 2: Verify OTP and get token

**Request**

```http
POST /api/auth/verify-otp
```

**Body**

```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

**Response example**

```json
{
  "message": "Login successful.",
  "token": "your_jwt_token_here",
  "user": {
    "id": "686f0abc1234567890abcd12",
    "name": "Demo User",
    "roleId": "686f0abc1234567890abcd34",
    "role": {
      "rolename": "user",
      "permissions": {}
    },
    "mobile": "9876543210"
  }
}
```

Save the `token`.

For every protected request, send:

```text
Authorization: Bearer your_jwt_token_here
```

## 4. Assistant chatbot API

## 4.1 Get suggestion list

Use this to show quick buttons in the chatbot UI.

```http
GET /api/assistant/suggestions
```

**Response**

```json
{
  "suggestions": [
    "How do I post a load?",
    "How do I add a truck?"
  ]
}
```

## 4.2 Get chatbot flows

Use this to show help cards or guided actions in the UI.

```http
GET /api/assistant/flows
```

**Response**

```json
{
  "flows": [
    {
      "title": "Load Flow"
    }
  ]
}
```

## 4.3 Create a new chatbot session

Create one session when the user starts a new conversation.

```http
POST /api/assistant/sessions
```

**Body**

```json
{
  "title": "Truck help"
}
```

**Response**

```json
{
  "session": {
    "_id": "session_id_here",
    "title": "Truck help"
  }
}
```

## 4.4 List all chatbot sessions

```http
GET /api/assistant/sessions
GET /api/assistant/sessions?search=truck
GET /api/assistant/sessions?limit=10
```

**Response**

```json
{
  "sessions": [
    {
      "_id": "session_id_here",
      "title": "Truck help"
    }
  ]
}
```

## 4.5 Get one session with messages

Use this when user opens an old conversation.

```http
GET /api/assistant/sessions/:id
```

**Response**

```json
{
  "session": {
    "_id": "session_id_here",
    "title": "Truck help"
  },
  "messages": [
    {
      "role": "user",
      "content": "How do I add a truck?"
    },
    {
      "role": "assistant",
      "content": "Go to truck module and click add."
    }
  ]
}
```

## 4.6 Send message to chatbot

This is the main chatbot request.

```http
POST /api/assistant/sessions/:id/messages
```

You can send either `content` or `message`.

**Body**

```json
{
  "content": "How do I create a load?"
}
```

or

```json
{
  "message": "How do I create a load?"
}
```

**Response**

```json
{
  "session": {
    "_id": "session_id_here"
  },
  "userMessage": {
    "content": "How do I create a load?"
  },
  "assistantMessage": {
    "content": "Open the load module and submit the form."
  }
}
```

## 4.7 Rename a chatbot session

```http
PATCH /api/assistant/sessions/:id
```

**Body**

```json
{
  "title": "Load creation help"
}
```

## 4.8 Delete a chatbot session

```http
DELETE /api/assistant/sessions/:id
```

**Response**

```json
{
  "success": true
}
```

## 5. Buyer/Seller direct chat API

This is not the chatbot. This is used when buyer and seller chat about a product.

## 5.1 Create or open chat room

```http
POST /api/chat/create
```

**Body**

```json
{
  "productId": "product_id_here"
}
```

**Response**

```json
{
  "message": "Chat room created",
  "room": {
    "_id": "room_id_here",
    "productId": "product_id_here",
    "lastMessage": "",
    "status": "active"
  }
}
```

## 5.2 Send message in room

```http
POST /api/chat/send
```

**Body**

```json
{
  "roomId": "room_id_here",
  "message": "Is this truck still available?"
}
```

## 5.3 Get all messages for room

```http
GET /api/chat/messages/:roomId
```

## 5.4 List my rooms

```http
GET /api/chat/list
```

## 6. How to test in Postman

## Step 1: Set base URL

Create an environment variable in Postman:

- `baseUrl = http://localhost:3003`

## Step 2: Login and copy token

Run:

1. `POST {{baseUrl}}/api/auth/send-otp`
2. `POST {{baseUrl}}/api/auth/verify-otp`

Copy `token` from the response.

## Step 3: Add token in headers

In Postman, add:

- Key: `Authorization`
- Value: `Bearer <your_token>`

Also add:

- Key: `Content-Type`
- Value: `application/json`

## Step 4: Test chatbot flow

Run requests in this order:

1. `GET {{baseUrl}}/api/assistant/suggestions`
2. `POST {{baseUrl}}/api/assistant/sessions`
3. Copy `session._id`
4. `POST {{baseUrl}}/api/assistant/sessions/{{sessionId}}/messages`
5. `GET {{baseUrl}}/api/assistant/sessions/{{sessionId}}`

### Postman body example for sending chatbot message

```json
{
  "content": "How to add truck?"
}
```

## 7. Simple frontend UI example

Below is a simple frontend flow for chatbot implementation:

1. User logs in and gets JWT token.
2. UI creates one assistant session.
3. UI stores `sessionId`.
4. Whenever user sends a message, UI calls the message API.
5. UI appends both user message and assistant reply into chat window.

### Example JavaScript using `fetch`

```javascript
const BASE_URL = "http://localhost:3003";

async function createAssistantSession(token, title = "New Chat") {
  const response = await fetch(`${BASE_URL}/api/assistant/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error("Failed to create assistant session");
  }

  const data = await response.json();
  return data.session;
}

async function sendAssistantMessage(token, sessionId, content) {
  const response = await fetch(
    `${BASE_URL}/api/assistant/sessions/${sessionId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to send message");
  }

  return response.json();
}
```

### Example UI button flow

```javascript
let sessionId = null;

async function startChat(token) {
  const session = await createAssistantSession(token, "Support Chat");
  sessionId = session._id;
}

async function onSendMessage(token, text) {
  if (!sessionId) {
    await startChat(token);
  }

  const result = await sendAssistantMessage(token, sessionId, text);
  console.log("assistant result", result);
}
```

## 8. Recommended UI structure

For chatbot screen:

- Left side: session history
- Right side: current chat messages
- Top: chatbot title
- Bottom:
  - text input
  - send button
  - optional suggestion buttons from `/api/assistant/suggestions`

Recommended frontend state:

```text
token
sessionId
sessions[]
messages[]
loading
error
```

## 9. Common errors

### `401 Token missing or expired`

Reason:
- No Bearer token sent
- Token expired

Fix:
- Login again
- Send `Authorization: Bearer <token>`

### `404 Session not found`

Reason:
- Wrong session id

Fix:
- Use valid `session._id`

### `400 roomId and message are required`

Reason:
- Missing fields in direct chat request

Fix:
- Send both `roomId` and `message`

## 10. Quick summary

If you want **chatbot**, use:

- `POST /api/assistant/sessions`
- `POST /api/assistant/sessions/:id/messages`
- `GET /api/assistant/sessions/:id`

If you want **buyer/seller chat**, use:

- `POST /api/chat/create`
- `POST /api/chat/send`
- `GET /api/chat/messages/:roomId`

Main HTTP methods:

- `GET` = read
- `POST` = create/send
- `PATCH` = update
- `DELETE` = remove
