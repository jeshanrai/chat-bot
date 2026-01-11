# 🥟 Momo House Chatbot - Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Folder Structure](#folder-structure)
4. [Core Concepts](#core-concepts)
5. [Request Flow](#request-flow)
6. [Configuration](#configuration)
7. [Database Schema](#database-schema)
8. [API Integration](#api-integration)
9. [Development Guide](#development-guide)
10. [Deployment](#deployment)

---

## Project Overview

**Momo House Chatbot** is an AI-powered conversational ordering system that works on both WhatsApp and Facebook Messenger. Customers can:

- Browse the restaurant menu
- Add items to cart
- Place orders with delivery or dine-in options
- Make table reservations (future feature)
- Get personalized recommendations

### Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ (ES Modules) |
| Framework | Express 5.x |
| Database | PostgreSQL |
| LLM | Groq (Llama 3.3 70B) |
| Messaging | WhatsApp Cloud API, Messenger API |
| Architecture | Event-Driven + ReACT Pattern |

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                         │
├─────────────────────────────────────────────────────────────────┤
│  WhatsApp Cloud API  │  Messenger API  │  Groq LLM API          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ENTRY POINTS                             │
├─────────────────────────────────────────────────────────────────┤
│  server.js → bootstrap.js → app.js (Express)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           ROUTES                                 │
├─────────────────────────────────────────────────────────────────┤
│  webhook.routes.js  │  health.routes.js  │  admin.routes.js     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          CHANNELS                                │
├─────────────────────────────────────────────────────────────────┤
│  channels/whatsapp.js  │  channels/messenger.js                 │
│  (Platform-specific parsing and validation)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         NORMALIZERS                              │
├─────────────────────────────────────────────────────────────────┤
│  incomingMessage.normalizer.js                                  │
│  (Convert platform payloads to unified format)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          AI AGENT                                │
├─────────────────────────────────────────────────────────────────┤
│  agent/index.js (ReACT Loop)                                    │
│  ├── memory/conversation.memory.js (Context)                   │
│  ├── memory/state.memory.js (Agent State)                      │
│  └── executor.js (Tool Execution)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌───────────────────────┐   ┌───────────────────────┐
│         LLM           │   │        TOOLS          │
├───────────────────────┤   ├───────────────────────┤
│  llm/index.js         │   │  tools/menu.tools.js  │
│  llm/providers/       │   │  tools/cart.tools.js  │
│    ├── groq.js        │   │  tools/order.tools.js │
│    ├── openai.js      │   └───────────────────────┘
│    └── gemini.js      │               │
└───────────────────────┘               ▼
                          ┌───────────────────────┐
                          │       SERVICES        │
                          ├───────────────────────┤
                          │  services/menu        │
                          │  services/order       │
                          │  services/reservation │
                          └───────────────────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │       DATABASE        │
                          ├───────────────────────┤
                          │  database/connection  │
                          │  PostgreSQL           │
                          └───────────────────────┘
```

### ReACT Pattern

The agent uses the **ReACT (Reason + Act)** pattern for decision-making:

```
┌─────────────────────────────────────────────────────────────────┐
│                      ReACT LOOP                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. RECEIVE: Get user message                                   │
│       ↓                                                         │
│  2. REASON: LLM analyzes context + decides action               │
│       ↓                                                         │
│  3. ACT: Execute tool(s) via Function Calling                   │
│       ↓                                                         │
│  4. OBSERVE: Process tool results                               │
│       ↓                                                         │
│  5. RESPOND: Generate reply OR continue loop                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
src/
├── config/                 # Configuration management
│   ├── index.js           # Main config (env vars)
│   ├── database.js        # Database config
│   └── llm.js             # LLM provider config
│
├── constants/              # String constants & enums
│   ├── channels.js        # CHANNELS enum
│   ├── toolNames.js       # TOOL_NAMES enum
│   ├── messageTypes.js    # Message types, stages
│   └── index.js           # Re-exports
│
├── database/               # Database layer
│   ├── connection.js      # PostgreSQL pool
│   ├── init.js            # Table creation
│   └── migrations/        # SQL migrations
│
├── utils/                  # Cross-cutting utilities
│   ├── logger.js          # Logging utility
│   ├── crypto.js          # Signature verification
│   ├── time.js            # Date/time helpers
│   └── index.js           # Re-exports
│
├── validators/             # Input validation
│   ├── metaSignature.validator.js
│   ├── toolArgs.validator.js
│   └── index.js
│
├── normalizers/            # Payload normalization
│   ├── incomingMessage.normalizer.js
│   └── index.js
│
├── channels/               # Platform-specific handlers
│   ├── whatsapp.js        # WhatsApp parsing
│   ├── messenger.js       # Messenger parsing
│   └── index.js
│
├── routes/                 # Express routes
│   ├── webhook.routes.js  # Webhook endpoints
│   ├── health.routes.js   # Health checks
│   ├── admin.routes.js    # Admin endpoints
│   └── index.js           # Route registration
│
├── services/               # Business logic (NO HTTP knowledge)
│   ├── menu.service.js    # Menu operations
│   ├── order.service.js   # Order operations
│   ├── reservation.service.js
│   └── index.js
│
├── tools/                  # LLM tool adapters
│   ├── menu.tools.js      # Menu browsing tools
│   ├── cart.tools.js      # Cart management tools
│   ├── order.tools.js     # Order processing tools
│   ├── reservation.tools.js
│   └── index.js
│
├── agent/                  # AI Agent (ReACT)
│   ├── index.js           # Main orchestrator
│   ├── executor.js        # Tool execution engine
│   ├── agent.types.js     # Type definitions
│   └── memory/
│       ├── conversation.memory.js
│       └── state.memory.js
│
├── llm/                    # LLM integration
│   ├── index.js           # Provider-agnostic interface
│   ├── prompts.js         # System prompts
│   ├── tools.js           # Tool definitions
│   └── providers/
│       ├── groq.js
│       ├── openai.js
│       └── gemini.js
│
├── messaging/              # Outgoing message handling
│   ├── whatsapp.js        # WhatsApp Send API
│   ├── messenger.js       # Messenger Send API
│   ├── message.builders.js
│   └── index.js
│
├── events/                 # Event-driven pub/sub
│   ├── eventBus.js        # EventEmitter wrapper
│   ├── order.events.js    # Order event handlers
│   └── index.js
│
├── app.js                  # Express configuration
├── bootstrap.js            # Startup sequence
└── server.js               # HTTP server entry point

tests/                      # Test files (mirrors src/)
├── setup.js               # Test utilities
├── normalizers/
├── services/
└── agent/
```

---

## Core Concepts

### 1. Dependency Flow

```
routes → channels → normalizers → agent → tools → services → database
```

**Key Rules:**
- Services contain business logic
- Tools are thin adapters that call services
- Services NEVER import tools (no circular deps)
- Routes handle HTTP, nothing else

### 2. Conversation Context

Each user has a context object that tracks:

```javascript
{
  userId: '1234567890',
  platform: 'whatsapp',
  stage: 'VIEWING_MENU',
  cart: [
    { foodId: 1, name: 'Steamed Momo', price: 180, quantity: 2 }
  ],
  currentCategory: 'momos',
  serviceType: 'delivery',
  deliveryAddress: '...',
  history: [...],
  lastUpdated: 1234567890
}
```

### 3. Tool Definitions (Function Calling)

Tools are defined with JSON schemas for the LLM:

```javascript
{
  type: 'function',
  function: {
    name: 'show_category_items',
    description: 'Show food items in a category',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Category name (momos, drinks, etc.)'
        }
      },
      required: ['category']
    }
  }
}
```

### 4. Event-Driven Side Effects

For non-critical operations (analytics, notifications):

```javascript
// Emit event (fire-and-forget)
eventBus.emit('order:placed', { orderId, userId, total });

// Listen for event
eventBus.on('order:placed', async (data) => {
  await sendNotificationToKitchen(data);
});
```

---

## Request Flow

### Complete Request Lifecycle

```
1. WhatsApp/Messenger sends webhook POST
        ↓
2. webhook.routes.js receives request
        ↓
3. channels/whatsapp.js validates signature & parses
        ↓
4. normalizers/incomingMessage.normalizer.js → unified format
        ↓
5. agent/index.js receives normalized message
        ↓
6. Memory: Load/create conversation context
        ↓
7. ReACT Loop:
   a. Build LLM messages (system + history)
   b. Call LLM with tools
   c. If tool_calls: execute tools via executor.js
   d. Tools call services → database
   e. Tools send responses via messaging/
   f. Update context
   g. Repeat or exit
        ↓
8. Response already sent by tool or agent
```

### Example: User says "Show me momos"

```
User: "Show me momos"
        ↓
LLM: Decides to call show_category_items({ category: 'momos' })
        ↓
executor.js: Calls menuTools.showCategoryItems()
        ↓
menu.tools.js: 
  - Calls menuService.getFoodsByCategory('momos')
  - Formats list message
  - Calls sendListMessage() via messaging/
        ↓
User receives: Interactive list of momo items
```

---

## Configuration

### Environment Variables

See `.env.schema` for all variables. Key ones:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | development / production |
| `PORT` | Server port (default: 3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API token |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID |
| `VERIFY_TOKEN` | Webhook verification token |
| `GROQ_API_KEY` | Groq API key |
| `LLM_PROVIDER` | groq / openai / gemini |

### Config Access

```javascript
import config from './config/index.js';

console.log(config.app.port);          // 3000
console.log(config.whatsapp.token);    // API token
console.log(config.llm.provider);      // 'groq'
```

---

## Database Schema

### Tables

```sql
-- Foods (Menu Items)
CREATE TABLE foods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  tags TEXT[],
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  service_type VARCHAR(50),
  delivery_address TEXT,
  payment_method VARCHAR(50),
  total DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  food_id INTEGER REFERENCES foods(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tables (for reservations)
CREATE TABLE tables (
  id SERIAL PRIMARY KEY,
  table_number INTEGER UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  location VARCHAR(100),
  status VARCHAR(50) DEFAULT 'available'
);

-- Reservations
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  platform VARCHAR(50),
  table_id INTEGER REFERENCES tables(id),
  party_size INTEGER NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Integration

### WhatsApp Cloud API

**Webhook Verification (GET):**
```
GET /webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=xxx&hub.challenge=yyy
```

**Incoming Messages (POST):**
```
POST /webhooks/whatsapp
Body: WhatsApp webhook payload
```

**Send Message:**
```javascript
import { sendMessage } from './messaging/whatsapp.js';

await sendMessage(phoneNumber, 'Hello!');
await sendListMessage(phoneNumber, header, body, footer, buttonText, sections);
await sendButtonMessage(phoneNumber, header, body, footer, buttons);
```

### Messenger API

**Webhook Verification (GET):**
```
GET /webhooks/messenger?hub.mode=subscribe&hub.verify_token=xxx&hub.challenge=yyy
```

**Incoming Messages (POST):**
```
POST /webhooks/messenger
Body: Messenger webhook payload
```

---

## Development Guide

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.schema .env
# Edit .env with your credentials

# 3. Initialize database
npm run db:init

# 4. Start development server
npm run dev
```

### Adding a New Tool

1. **Define the tool schema** in `llm/tools.js`:
```javascript
{
  type: 'function',
  function: {
    name: 'my_new_tool',
    description: 'What this tool does',
    parameters: { ... }
  }
}
```

2. **Add constant** in `constants/toolNames.js`:
```javascript
MY_NEW_TOOL: 'my_new_tool'
```

3. **Create tool function** in appropriate `tools/*.tools.js`:
```javascript
export async function myNewTool(args, userId, context) {
  // Call service
  const result = await someService.doSomething(args.param);
  
  // Send response
  await sendMessage(userId, context.platform, 'Response');
  
  // Return result
  return {
    reply: null,
    updatedContext: { ...context, lastAction: 'my_new_tool' }
  };
}
```

4. **Register in executor** in `agent/executor.js`:
```javascript
[TOOL_NAMES.MY_NEW_TOOL]: myTools.myNewTool
```

### Adding a New LLM Provider

1. Create provider file in `llm/providers/`:
```javascript
// llm/providers/anthropic.js
export async function callAnthropic(messages, options) {
  // Implementation
}
```

2. Add to `llm/index.js`:
```javascript
case 'anthropic':
  return callAnthropic(messages, options);
```

3. Add config in `config/llm.js`:
```javascript
anthropic: {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet'
}
```

---

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use real database (not localhost)
- [ ] Set up HTTPS (required for webhooks)
- [ ] Configure rate limiting
- [ ] Set up monitoring/logging
- [ ] Register webhook URLs with Meta

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Health Checks

```
GET /health        → Basic health check
GET /health/ready  → Readiness (includes DB check)
GET /health/live   → Liveness
```

---

## Troubleshooting

### Common Issues

**Webhook not receiving messages:**
- Check VERIFY_TOKEN matches Meta dashboard
- Ensure HTTPS is configured
- Check webhook URL is accessible

**LLM not responding:**
- Verify GROQ_API_KEY is correct
- Check rate limits
- Review logs for API errors

**Database connection failed:**
- Verify DATABASE_URL format
- Check PostgreSQL is running
- Ensure tables are created (`npm run db:init`)

### Logging

```javascript
import { logger } from './utils/logger.js';

logger.info('Component', 'Message', { extra: 'data' });
logger.error('Component', 'Error message', error.stack);
logger.debug('Component', 'Debug info');
```

---

## Future Enhancements

1. **Multi-language support** - i18n for prompts and messages
2. **Payment integration** - eSewa, Khalti APIs
3. **Order tracking** - Real-time status updates
4. **Analytics dashboard** - Admin panel
5. **Voice messages** - WhatsApp voice-to-text
6. **Image recognition** - Menu item identification
7. **Loyalty program** - Points and rewards

---

*Last updated: Auto-generated during restructuring*
