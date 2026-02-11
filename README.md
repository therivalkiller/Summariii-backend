# 🧠 RAG Backend - Production-Ready Document AI Platform

A **production-grade Node.js backend** for a multi-tenant AI document platform with RAG (Retrieval-Augmented Generation), authentication, payments, and bring-your-own-key (BYOK) support.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Server](#-running-the-server)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### Core Functionality
- ✅ **PDF Document Upload** - Upload and process PDF files
- ✅ **Automatic Text Extraction** - Extract and chunk text from PDFs
- ✅ **Vector Embeddings** - Generate embeddings using AI providers
- ✅ **Document Summaries** - AI-generated summaries and notes
- ✅ **RAG Question Answering** - Chat with documents using retrieval-augmented generation

### Advanced Features (Paid)
- 🔐 **Authentication** - Clerk-based user authentication
- 💳 **Payments** - Stripe integration for feature unlocking
- 🤖 **Multi-Provider Support** - Choose between Gemini and Claude
- 🔑 **Bring Your Own Key (BYOK)** - Use your own AI API keys
- 🔒 **Secure Key Storage** - Encrypted API key management
- 📊 **Vector Database** - Pinecone for efficient similarity search

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         Express Server              │
│  ┌──────────────────────────────┐   │
│  │   Authentication (Clerk)     │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │   Routes & Middleware        │   │
│  └──────────────────────────────┘   │
└─────────────┬───────────────────────┘
              │
      ┌───────┴────────┐
      ▼                ▼
┌──────────┐      ┌──────────┐
│ Database │      │   AI     │
│ (SQLite/ │      │ Provider │
│ Postgres)│      │ Factory  │
└──────────┘      └────┬─────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
         ┌─────────┐      ┌─────────┐
         │ Gemini  │      │ Claude  │
         └─────────┘      └─────────┘
                              │
                              ▼
                         ┌──────────┐
                         │ Pinecone │
                         │ Vector DB│
                         └──────────┘
```

### Data Flow

1. **Upload**: User uploads PDF → Server extracts text → AI generates embeddings → Store in Pinecone
2. **Query**: User asks question → AI generates query embedding → Pinecone finds similar chunks → AI generates answer
3. **Payment**: User pays → Stripe webhook → Unlock features → Enable custom AI providers

---

## 🛠️ Tech Stack

### Core
- **Runtime**: Node.js ≥18
- **Framework**: Express
- **Language**: ES Modules (ESM)

### Authentication & Payments
- **Auth**: Clerk
- **Payments**: Stripe

### AI & Vector Database
- **AI Providers**: 
  - Google Gemini (embeddings + completion)
  - Anthropic Claude (completion only)
- **Vector DB**: Pinecone (free tier)

### Database
- **ORM**: Sequelize
- **Options**: SQLite (development) or PostgreSQL (production)

### Security
- **Encryption**: AES-256-GCM for API keys
- **Key Management**: Server-side encryption secret
- **HTTPS**: Required in production

---

## 📦 Prerequisites

Before you begin, ensure you have:

1. **Node.js** ≥18.0.0
   ```bash
   node --version
   ```

2. **npm** or **yarn**
   ```bash
   npm --version
   ```

3. **Accounts & API Keys**:
   - [Clerk](https://clerk.com) - Authentication
   - [Stripe](https://stripe.com) - Payments
   - [Pinecone](https://www.pinecone.io) - Vector database (free tier)
   - [Google AI Studio](https://makersuite.google.com) - Gemini API key
   - [Anthropic](https://www.anthropic.com) - Claude API key (optional)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rag-backend-production
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

```bash
cp .env.example .env
```

### 4. Configure Environment Variables

Edit `.env` with your actual values (see [Configuration](#-configuration) below).

---

## ⚙️ Configuration

### Environment Variables

#### Server Configuration
```env
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000
```

#### Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Copy your keys:

```env
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

**Setup Instructions**:
- Enable Email authentication in Clerk Dashboard
- Add `http://localhost:3000` to allowed origins
- Configure webhook endpoint: `https://your-domain.com/api/billing/webhook`

#### Stripe Payments

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Get your API keys
3. Create a product and price

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

**Setup Instructions**:
- Create a Product in Stripe Dashboard
- Set a one-time payment price
- Copy the Price ID
- Configure webhook: `https://your-domain.com/api/billing/webhook`
- Listen for events: `checkout.session.completed`, `payment_intent.succeeded`

#### Pinecone Vector Database

1. Go to [Pinecone Console](https://app.pinecone.io)
2. Create a new index:
   - **Name**: `rag-documents`
   - **Dimensions**: `768`
   - **Metric**: `cosine`
   - **Pod Type**: `Starter` (free tier)

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_environment
PINECONE_INDEX_NAME=rag-documents
```

#### AI Provider Keys

**Gemini** (Required):
1. Go to [Google AI Studio](https://makersuite.google.com)
2. Create API key

```env
GEMINI_API_KEY=your_gemini_api_key
```

**Claude** (Optional):
1. Go to [Anthropic Console](https://console.anthropic.com)
2. Create API key

```env
ANTHROPIC_API_KEY=your_anthropic_api_key
```

#### Database

**SQLite** (Development):
```env
DATABASE_URL=sqlite:./database.sqlite
```

**PostgreSQL** (Production):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/rag_platform
```

#### Security

Generate a secure 32+ character encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```env
ENCRYPTION_KEY=your_generated_key_here
```

---

## 🏃 Running the Server

### Development Mode

```bash
npm run dev
```

Server runs with auto-reload on `http://localhost:3000`

### Production Mode

```bash
npm start
```

### First-Time Setup

The server will automatically:
1. ✅ Test database connection
2. ✅ Create database tables
3. ✅ Initialize Pinecone connection
4. ✅ Start listening for requests

---

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication

All protected routes require a Clerk JWT token in the `Authorization` header:

```
Authorization: Bearer <clerk-jwt-token>
```

---

### 📤 Upload Endpoints

#### Upload PDF
```http
POST /api/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body (form-data):
- file: <pdf-file>
- provider: "gemini" | "claude" (optional, default: "gemini")
```

**Response**:
```json
{
  "success": true,
  "message": "Document uploaded and processing started",
  "documentId": "uuid",
  "status": "processing"
}
```

#### Get Document Status
```http
GET /api/upload/:documentId
Authorization: Bearer <token>
```

#### List Documents
```http
GET /api/upload
Authorization: Bearer <token>
```

#### Delete Document
```http
DELETE /api/upload/:documentId
Authorization: Bearer <token>
```

---

### 💬 Chat Endpoints

#### Ask Question (RAG)
```http
POST /api/chat
Content-Type: application/json
Authorization: Bearer <token>

{
  "documentId": "uuid",
  "question": "What is this document about?",
  "provider": "gemini"
}
```

**Response**:
```json
{
  "success": true,
  "answer": "This document discusses...",
  "sources": [
    {
      "text": "relevant chunk text",
      "score": 0.95,
      "chunkIndex": 0
    }
  ],
  "confidence": 95
}
```

#### Multi-Turn Conversation
```http
POST /api/chat/conversation
Content-Type: application/json
Authorization: Bearer <token>

{
  "documentId": "uuid",
  "messages": [
    { "role": "user", "content": "What is the main topic?" },
    { "role": "assistant", "content": "The main topic is..." },
    { "role": "user", "content": "Tell me more" }
  ]
}
```

#### Get Document Insights
```http
GET /api/chat/insights/:documentId?provider=gemini
Authorization: Bearer <token>
```

---

### 📝 Summary Endpoints

#### Get Document Summary
```http
GET /api/summary?documentId=uuid
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "documentId": "uuid",
  "filename": "document.pdf",
  "summary": "This document...",
  "notes": "Key points:\n- Point 1\n- Point 2",
  "chunkCount": 42
}
```

---

### 🤖 AI Settings Endpoints (Paid Feature)

#### Get AI Settings
```http
GET /api/ai-settings
Authorization: Bearer <token>
```

#### Configure AI Provider
```http
POST /api/ai-settings
Content-Type: application/json
Authorization: Bearer <token>

{
  "provider": "gemini" | "claude",
  "apiKey": "your_api_key" (optional),
  "useOwnKey": true | false
}
```

**Response**:
```json
{
  "success": true,
  "message": "AI provider settings updated successfully",
  "setting": {
    "id": "uuid",
    "provider": "gemini",
    "isUserProvided": true,
    "isActive": true
  }
}
```

#### List Available Providers
```http
GET /api/ai-settings/providers
Authorization: Bearer <token>
```

---

### 💳 Billing Endpoints

#### Create Checkout Session
```http
POST /api/billing/create-checkout-session
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### Stripe Webhook
```http
POST /api/billing/webhook
Content-Type: application/json
Stripe-Signature: <signature>
```

#### Get Billing Status
```http
GET /api/billing/status
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "isPaidUser": true,
  "features": {
    "customAIProvider": true
  }
}
```

#### Get Payment History
```http
GET /api/billing/history
Authorization: Bearer <token>
```

---

## 🔒 Security

### API Key Encryption

User-provided API keys are encrypted using **AES-256-GCM**:

```javascript
// Encryption
const encrypted = encryptionService.encrypt(apiKey);

// Decryption (server-side only)
const decrypted = encryptionService.decrypt(encrypted);
```

**Key points**:
- ✅ API keys encrypted at rest
- ✅ Never logged or exposed in responses
- ✅ Encryption key stored server-side only
- ✅ Uses cryptographically secure random IVs

### Authentication Flow

```
Client → Clerk JWT → Server validates → Extract userId → Process request
```

### Feature Gating

```javascript
// Middleware checks
1. authenticate          // Is user logged in?
2. requirePaidUser       // Has user paid?
3. requireFeature(name)  // Does user have feature X?
```

### Best Practices

1. **HTTPS Only** in production
2. **Rotate encryption keys** periodically
3. **Rate limiting** on API endpoints
4. **Input validation** on all routes
5. **CORS** configured per environment
6. **Helmet.js** for HTTP headers
7. **No secrets** in code or logs

---

## 🚢 Deployment

### Environment Preparation

1. **Set `NODE_ENV=production`**
2. **Use PostgreSQL** instead of SQLite
3. **Enable HTTPS**
4. **Set strong `ENCRYPTION_KEY`**
5. **Configure CORS** for your domain

### Recommended Platforms

#### Railway
```bash
# Install Railway CLI
npm install -g railway

# Login and deploy
railway login
railway init
railway up
```

#### Render
1. Create new Web Service
2. Connect your repository
3. Set environment variables
4. Deploy

#### Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set CLERK_SECRET_KEY=...

# Deploy
git push heroku main
```

#### DigitalOcean App Platform
1. Connect GitHub repository
2. Configure environment variables
3. Deploy

### Database Migration

For production, use PostgreSQL:

```bash
# Create database
createdb rag_platform

# Update .env
DATABASE_URL=postgresql://user:password@host:5432/rag_platform
```

### Pinecone Index

Ensure Pinecone index exists:
- **Name**: `rag-documents`
- **Dimensions**: `768`
- **Metric**: `cosine`

### Post-Deployment Checklist

- [ ] Test `/health` endpoint
- [ ] Verify Clerk authentication
- [ ] Test Stripe webhook
- [ ] Upload sample PDF
- [ ] Test RAG query
- [ ] Monitor logs for errors
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure backup strategy

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error**: `Unable to connect to database`

**Solution**:
- Check `DATABASE_URL` is correct
- Ensure database exists (for PostgreSQL)
- Verify network connectivity

#### 2. Pinecone Initialization Failed

**Error**: `Failed to initialize Pinecone`

**Solution**:
- Verify `PINECONE_API_KEY` is correct
- Check index name matches `PINECONE_INDEX_NAME`
- Ensure index dimension is `768`

#### 3. Clerk Authentication Failed

**Error**: `Authentication failed` or `401 Unauthorized`

**Solution**:
- Verify `CLERK_SECRET_KEY` is correct
- Check JWT token is being sent in `Authorization` header
- Ensure Clerk application is active

#### 4. Stripe Webhook Not Working

**Error**: `Webhook signature verification failed`

**Solution**:
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Use Stripe CLI for local testing:
  ```bash
  stripe listen --forward-to localhost:3000/api/billing/webhook
  ```

#### 5. File Upload Fails

**Error**: `Only PDF files are allowed` or `File too large`

**Solution**:
- Ensure file is PDF format
- Check file size < `MAX_FILE_SIZE` (default 10MB)
- Verify `uploads/` directory exists and is writable

#### 6. Encryption Key Error

**Error**: `ENCRYPTION_KEY must be at least 32 characters long`

**Solution**:
- Generate new key:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Update `.env` with generated key

### Debug Mode

Enable detailed logging:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

### Logs

Check server logs for detailed error messages:

```bash
npm run dev
```

Look for:
- ❌ Error indicators
- 🔍 Request/response logs
- 📊 Database queries (in development)

---

## 📞 Support

### Documentation
- [Clerk Docs](https://clerk.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Pinecone Docs](https://docs.pinecone.io)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Claude API Docs](https://docs.anthropic.com)

### Issues

For bug reports or feature requests, please open an issue on GitHub.

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎯 Roadmap

Future enhancements:
- [ ] OpenAI provider support
- [ ] Multi-document chat
- [ ] Document version control
- [ ] Collaborative features
- [ ] Analytics dashboard
- [ ] Batch processing
- [ ] Custom embedding models
- [ ] API rate limiting
- [ ] Caching layer

---

**Built with ❤️ for production AI applications**
