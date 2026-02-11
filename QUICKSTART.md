# Quick Start Guide

Get your RAG Backend running in 5 minutes!

## 🚀 Fast Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# Minimum required for local testing
CLERK_SECRET_KEY=sk_test_your_clerk_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_environment
PINECONE_INDEX_NAME=rag-documents
GEMINI_API_KEY=your_gemini_key
ENCRYPTION_KEY=generate_with_crypto_randomBytes_32_as_hex
```

**Generate Encryption Key**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create Pinecone Index

1. Go to [Pinecone Console](https://app.pinecone.io)
2. Create index:
   - **Name**: `rag-documents`
   - **Dimensions**: `768`
   - **Metric**: `cosine`
   - **Pod Type**: Starter (free)

### 4. Start Server

```bash
npm run dev
```

You should see:
```
✅ Database connection established successfully
✅ Database synced successfully
✅ Pinecone client initialized
✅ Server started successfully!
🌐 Server running at: http://localhost:3000
```

---

## 🧪 Test Your Setup

### 1. Health Check

```bash
curl http://localhost:3000/health
```

**Expected**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "environment": "development"
}
```

### 2. Get Clerk JWT Token

1. Create a user in your Clerk dashboard
2. Use Clerk's frontend SDK to sign in
3. Get the session token:

```javascript
const token = await clerk.session.getToken();
console.log(token);
```

### 3. Upload a PDF

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_CLERK_JWT" \
  -F "file=@sample.pdf" \
  -F "provider=gemini"
```

**Expected**:
```json
{
  "success": true,
  "message": "Document uploaded and processing started",
  "documentId": "uuid-here",
  "status": "processing"
}
```

### 4. Check Processing Status

```bash
curl -X GET http://localhost:3000/api/upload/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_CLERK_JWT"
```

Wait until `status` is `"completed"`.

### 5. Ask a Question

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_CLERK_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "DOCUMENT_ID",
    "question": "What is this document about?"
  }'
```

**Expected**:
```json
{
  "success": true,
  "answer": "This document discusses...",
  "sources": [...],
  "confidence": 95
}
```

---

## 🎯 Next Steps

### Enable Payments

1. **Create Stripe Product**:
   - Go to Stripe Dashboard
   - Create a Product
   - Add a one-time price
   - Copy `STRIPE_PRICE_ID`

2. **Set Webhook**:
   - Use ngrok for local testing:
     ```bash
     ngrok http 3000
     ```
   - Add webhook: `https://your-ngrok-url.ngrok.io/api/billing/webhook`

3. **Test Payment**:
   ```bash
   curl -X POST http://localhost:3000/api/billing/create-checkout-session \
     -H "Authorization: Bearer YOUR_JWT"
   ```

### Try Custom AI Provider

After payment, set your own API key:

```bash
curl -X POST http://localhost:3000/api/ai-settings \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "apiKey": "your_personal_gemini_key",
    "useOwnKey": true
  }'
```

---

## 📝 Common Issues

### "Database connection failed"

**Solution**: Database auto-creates with SQLite. If using PostgreSQL, create the database first:
```bash
createdb rag_platform
```

### "Pinecone initialization failed"

**Solution**: 
- Check `PINECONE_API_KEY`
- Verify index name matches `PINECONE_INDEX_NAME`
- Ensure index dimensions are `768`

### "Authentication failed"

**Solution**:
- Verify `CLERK_SECRET_KEY` is correct
- Check JWT token is in `Authorization: Bearer` header
- Ensure Clerk app is active

### "File upload fails"

**Solution**:
- Check file is PDF format
- Verify file size < 10MB
- Ensure `uploads/` directory exists

---

## 🛠️ Development Tips

### Watch Logs

```bash
npm run dev
```

Logs show:
- 📥 Incoming requests
- 🔄 Processing status
- ❌ Errors with stack traces
- ✅ Success messages

### Test Different Providers

Switch between Gemini and Claude:

```bash
# Upload with Gemini
-F "provider=gemini"

# Upload with Claude
-F "provider=claude"
```

### Reset Database

```bash
rm database.sqlite
npm run dev  # Auto-recreates tables
```

### Clear Uploads

```bash
rm -rf uploads/*
```

---

## 📚 Resources

- **Full Documentation**: [README.md](./README.md)
- **API Reference**: [API_DOCS.md](./API_DOCS.md)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Security Guide**: [SECURITY.md](./SECURITY.md)

---

## 🆘 Need Help?

1. Check the logs for error messages
2. Review the relevant documentation
3. Verify all environment variables are set
4. Test with curl commands above
5. Check platform-specific docs (Clerk, Stripe, Pinecone)

---

**You're all set! Start building! 🎉**
