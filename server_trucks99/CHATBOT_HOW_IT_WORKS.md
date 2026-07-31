# TRUCKS99 Chatbot — How It Works

This document explains the **Buy & Sell AI Assistant chatbot**: architecture, packages used, message flow, and where the code lives.

For HTTP request samples and Postman/UI steps, see **[CHATBOT_HTTP_UI_GUIDE.md](./CHATBOT_HTTP_UI_GUIDE.md)**.

---

## 1. Important: this is not ChatGPT / OpenAI

The chatbot does **not** use OpenAI, Anthropic, Gemini, LangChain, or any LLM SDK.

It is a **custom rule-based assistant** built in Node.js:

| What people often expect | What this project actually uses |
|--------------------------|----------------------------------|
| OpenAI / GPT API | ❌ Not used |
| LangChain / vector DB | ❌ Not used |
| Socket.IO for assistant | ❌ Not used (assistant is REST only) |
| Regex + keyword intent matching | ✅ Custom `intentDetector.js` |
| Hardcoded knowledge articles | ✅ `services/assistant/knowledge/` |
| Multi-step sell wizard in session context | ✅ `sellFlow.js` |
| Live MongoDB queries for inventory | ✅ `queryHandlers.js` |

The UI may say “AI Assistant”, but answers come from **intent matching + guides + DB queries**, not a language model.

---

## 2. Packages used

### Backend (`server_trucks99/package.json`)

| Package | Role in chatbot |
|---------|-----------------|
| **express** | HTTP routes under `/api/assistant` |
| **mongoose** | Stores sessions & messages; queries listings |
| **jsonwebtoken** | Auth (`Authorization: Bearer <token>`) via `requireAuth` |
| **dotenv** | Env config (MongoDB, JWT, etc.) |
| **cors** | Allow portal frontend to call the API |
| **crypto** (Node built-in) | UUID ids on session/message docs |
| **uuid** | Available in project; sessions also use `crypto.randomUUID` |

**Not used for the assistant:** Twilio, Razorpay, Firebase Admin, Passport OAuth, Socket.IO, Swagger (those support other features).

### Frontend (`itruck_user_portal/package.json`)

| Package | Role in chatbot UI |
|---------|--------------------|
| **next** | Page at `/assistant` |
| **react** / **react-dom** | Chat UI components |
| **axios** | Calls `/api/assistant/*` |
| **@mui/material** | Chat layout / UI controls |

No chatbot-specific AI npm package on the frontend either.

---

## 3. Two different “chat” systems

| System | Path | Purpose |
|--------|------|---------|
| **Assistant (this chatbot)** | `/api/assistant` | Help + sell wizard + listing queries |
| **Buyer ↔ Seller chat** | `/api/chat` | Product messaging between users |

Use **Assistant** for the chatbot screen. Use **Chat** for user-to-user DMs.

---

## 4. High-level architecture

```text
┌─────────────────────────────────────┐
│  itruck_user_portal                 │
│  /assistant page                    │
│  hooks/useAssistant.ts              │
│  model/services/assistant/*.ts      │
│  components/chat/*                  │
└─────────────────┬───────────────────┘
                  │ HTTP + JWT (axios)
                  ▼
┌─────────────────────────────────────┐
│  server_trucks99                    │
│  views/handleAssistant.js           │
│         │                           │
│         ▼                           │
│  services/assistant/                │
│    assistantService.js  ← router    │
│    intentDetector.js                │
│    sellFlow.js                      │
│    queryHandlers.js                 │
│    contextBuilder.js                │
│    knowledge/*                      │
│         │                           │
│         ▼                           │
│  MongoDB (Mongoose)                 │
│    AssistantChatSession             │
│    AssistantChatMessage             │
│    BuySellProduct, Category, …      │
└─────────────────────────────────────┘
```

Mounted in `app.js`:

```js
app.use("/api/assistant", assistantRouter);
```

---

## 5. How a message is answered

When the user sends a message (`POST /api/assistant/sessions/:id/messages`), `assistantService.sendMessage` runs this order:

```text
1. Continue active sell wizard?
   → if session.context.flow === 'sell' → sellFlow.js

2. How-to / guidance question?
   → intentDetector + knowledge articles → step-by-step guide

3. User wants to create a listing?
   → phrases like "I want to sell my truck" → start sellFlow.js

4. Business / inventory question?
   → queryHandlers.js (counts, search, pending, sold, featured, …)

5. Nothing matched
   → fallback text + quick-reply suggestions
```

### Example intents

| User says | Handler | Result |
|-----------|---------|--------|
| “How do I post a vehicle?” | Knowledge (`buySell.js`) | Step-by-step guide |
| “I want to sell my truck” | Sell flow | Multi-step wizard (category → specs → draft) |
| “How many vehicles do I have?” | Query handlers | Count from MongoDB |
| “Show pending listings” | Query handlers | List user’s pending products |
| “Search Tata” | Query handlers | Filter listings by brand/text |

---

## 6. Intent detection (no ML)

File: `services/assistant/intentDetector.js`

1. Load intents from `knowledge/registry.js` (modules like Buy & Sell).
2. Score each intent:
   - Regex `patterns` match → +100
   - Keyword overlap → +12 each
   - Small `priority` tie-breaker
3. Best score must be **≥ 100** (at least one pattern hit) to win.
4. `isGuidanceQuestion()` detects how-to phrasing (`how`, `what`, `explain`, …) so help questions are not forced into the sell wizard.

Knowledge copy lives in:

```text
services/assistant/knowledge/modules/buySell.js
```

Add new how-to articles there — do not hardcode guides in the React UI.

---

## 7. Sell wizard (conversational listing)

File: `services/assistant/sellFlow.js`

- State is stored on the session: `session.context` (`flow`, `step`, `draft`, `specQueue`, …).
- Steps walk category → subcategory → dynamic specs → price/location → publish/draft.
- Spec options come from MongoDB (`Category`, `SubCategory`, `Specification`, `SpecificationValue`).
- Replies can include:
  - `quickReplies` — tap chips
  - `actions` — e.g. navigate to My Listings, publish, save draft
  - `contextPatch` — update wizard state

---

## 8. Data models

### `AssistantChatSession`

- `userId`, `title`, `context` (wizard state)
- `lastMessage`, `messageCount`, `status` (`active` | `archived`)

### `AssistantChatMessage`

- `sessionId`, `userId`, `role` (`user` | `assistant` | `system`)
- `content` (markdown-friendly text)
- `meta.quickReplies`, `meta.actions`, `meta.data`, `meta.intent`

Schemas:

- `schema/assistantChatSession.js`
- `schema/assistantChatMessage.js`

---

## 9. API surface (assistant)

All routes require auth: `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/assistant/suggestions` | Quick prompt chips |
| GET | `/api/assistant/flows` | How-to flow cards for empty state |
| GET | `/api/assistant/sessions` | List chats |
| POST | `/api/assistant/sessions` | New chat (+ welcome message) |
| GET | `/api/assistant/sessions/:id` | Session + messages |
| PATCH | `/api/assistant/sessions/:id` | Rename |
| DELETE | `/api/assistant/sessions/:id` | Archive |
| POST | `/api/assistant/sessions/:id/messages` | Send user message, get assistant reply |

---

## 10. Frontend wiring

| Path | Role |
|------|------|
| `app/(portal)/assistant/page.tsx` | Assistant page (auth gate) |
| `components/chat/ChatLayout.tsx` | Main chat shell |
| `hooks/useAssistant.ts` | Suggestions, flows, action execution |
| `model/services/assistant/chat.service.ts` | Axios → `/api/assistant` |
| `model/services/assistant/assistant.service.ts` | Suggestions / flows / actions |

Flow:

1. User opens `/assistant`.
2. Frontend loads suggestions + flows.
3. Create or open a session.
4. Send message → show `assistantMessage.content` + chips/actions from `meta`.
5. If `meta.actions` includes navigate/publish/draft, `useAssistant` runs marketplace APIs.

---

## 11. Folder map (backend)

```text
server_trucks99/
├── views/handleAssistant.js          # Express routes
├── schema/
│   ├── assistantChatSession.js
│   └── assistantChatMessage.js
└── services/assistant/
    ├── assistantService.js           # Session CRUD + turn routing
    ├── intentDetector.js             # Regex/keyword scoring
    ├── sellFlow.js                   # Create-listing wizard
    ├── queryHandlers.js              # Live listing queries
    ├── contextBuilder.js             # User/listing context helpers
    └── knowledge/
        ├── index.js
        ├── registry.js               # Registers modules
        ├── knowledgeService.js       # Guide answers
        ├── responseBuilder.js        # Formats guide replies
        ├── flowCatalog.js            # UI flow cards
        └── modules/
            └── buySell.js            # How-to intents + articles
```

---

## 12. How to extend it

| Goal | Where to change |
|------|-----------------|
| New how-to guide | Add intent + article in `knowledge/modules/buySell.js` (or new module + register in `registry.js`) |
| New inventory question | Add pattern + handler in `queryHandlers.js` |
| Change sell steps | Edit `sellFlow.js` |
| New API endpoint | Edit `views/handleAssistant.js` |
| UI chips / actions | Message `meta` from backend; handle in `useAssistant.ts` |

---

## 13. Related docs

| Doc | Contents |
|-----|----------|
| **CHATBOT_HOW_IT_WORKS.md** (this file) | Architecture, packages, routing logic |
| **CHATBOT_HTTP_UI_GUIDE.md** | HTTP methods, auth, Postman, UI checklist |
| **BACKEND_README.md** | Broader backend overview |

---

## 14. Short summary

- Chatbot = **custom Express + Mongoose assistant**, not an LLM package.
- Matching = **regex patterns + keywords**; answers = **knowledge guides**, **sell wizard**, or **DB queries**.
- Persistence = **AssistantChatSession** + **AssistantChatMessage**.
- UI = **Next.js + React + Axios + MUI** calling `/api/assistant`.
