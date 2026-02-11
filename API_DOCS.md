# RAG Backend API Documentation

## Overview

This API provides endpoints for managing documents, generating summaries, and performing RAG-based question answering.

**Base URL**: `http://localhost:3000/api`

**Authentication**: All protected endpoints require a Clerk JWT token.

---

## Quick Start

### 1. Upload a Document

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_CLERK_JWT" \
  -F "file=@document.pdf" \
  -F "provider=gemini"
```

### 2. Wait for Processing

Check document status:

```bash
curl -X GET http://localhost:3000/api/upload/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_CLERK_JWT"
```

### 3. Ask Questions

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_CLERK_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "DOCUMENT_ID",
    "question": "What is this document about?",
    "provider": "gemini"
  }'
```

---

## Authentication

### Getting a Clerk Token

1. Sign in to your app using Clerk
2. Get the session token from the Clerk client
3. Include it in the `Authorization` header:

```
Authorization: Bearer <clerk-jwt-token>
```

---

## Endpoints

### Health Check

```http
GET /health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

---

### Upload & Documents

#### Upload PDF

```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: PDF file
- provider: "gemini" | "claude" (optional)
```

#### Get All Documents

```http
GET /api/upload
Authorization: Bearer <token>
```

#### Get Document Details

```http
GET /api/upload/:documentId
Authorization: Bearer <token>
```

#### Delete Document

```http
DELETE /api/upload/:documentId
Authorization: Bearer <token>
```

---

### Chat & RAG

#### Ask Question

```http
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "documentId": "uuid",
  "question": "string",
  "provider": "gemini" | "claude"
}
```

#### Multi-Turn Chat

```http
POST /api/chat/conversation
Authorization: Bearer <token>
Content-Type: application/json

{
  "documentId": "uuid",
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "provider": "gemini"
}
```

#### Get Insights

```http
GET /api/chat/insights/:documentId?provider=gemini
Authorization: Bearer <token>
```

---

### Summary

#### Get Document Summary

```http
GET /api/summary?documentId=uuid
Authorization: Bearer <token>
```

---

### AI Settings (Paid Feature)

#### Get Settings

```http
GET /api/ai-settings
Authorization: Bearer <token>
```

#### Configure Provider

```http
POST /api/ai-settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "gemini" | "claude",
  "apiKey": "your_key" (optional),
  "useOwnKey": boolean
}
```

#### Get Available Providers

```http
GET /api/ai-settings/providers
Authorization: Bearer <token>
```

---

### Billing

#### Create Checkout Session

```http
POST /api/billing/create-checkout-session
Authorization: Bearer <token>
```

#### Get Billing Status

```http
GET /api/billing/status
Authorization: Bearer <token>
```

#### Get Payment History

```http
GET /api/billing/history
Authorization: Bearer <token>
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE" (optional)
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `202` - Accepted (async processing)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (feature locked)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Current limits (configurable via `.env`):
- **Window**: 15 minutes
- **Max Requests**: 100 per window

---

## Webhooks

### Stripe Webhook

```http
POST /api/billing/webhook
Content-Type: application/json
Stripe-Signature: <signature>
```

**Events handled**:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

---

## Testing

### Using cURL

```bash
# Upload
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"

# Ask question
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentId":"uuid","question":"What is the main topic?"}'
```

### Using Postman

1. Import the environment variables
2. Set `Authorization` to `Bearer Token`
3. Use Clerk JWT in token field

---

## Best Practices

1. **Always check document status** before querying
2. **Handle 202 responses** for async processing
3. **Implement retry logic** for network errors
4. **Cache responses** when appropriate
5. **Use webhooks** instead of polling for payments

---

## Support

For API support, see the main README.md or contact support.
