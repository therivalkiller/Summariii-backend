# Security Guide

## Overview

This document outlines the security measures implemented in the RAG Backend and best practices for maintaining a secure production environment.

---

## Authentication & Authorization

### Clerk Integration

**Authentication Flow**:
```
Client → Clerk → JWT Token → Server validates → Extract userId → Process request
```

**Implementation**:
- All protected routes use `authenticate` middleware
- JWT tokens validated on every request
- User identity extracted from token
- Session management handled by Clerk

**Best Practices**:
- ✅ Use HTTPS in production
- ✅ Set appropriate token expiration
- ✅ Implement token refresh
- ✅ Never expose secret keys in frontend

---

## API Key Management

### Encryption Strategy

**Algorithm**: AES-256-GCM (Galois/Counter Mode)

**Features**:
- ✅ Authenticated encryption (prevents tampering)
- ✅ Unique IV for each encryption
- ✅ Authentication tag verification
- ✅ Server-side encryption key storage

**Implementation**:

```javascript
// Encryption
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
const authTag = cipher.getAuthTag();

// Storage format: iv:authTag:encryptedData
```

**Key Storage**:
```
Environment Variable → Server Memory → Never exposed to client
```

### BYOK (Bring Your Own Key)

**User Flow**:
1. User provides API key via secure HTTPS
2. Server validates key with provider
3. Key encrypted using AES-256-GCM
4. Encrypted key stored in database
5. Original key discarded from memory

**Security Guarantees**:
- ❌ Keys never logged
- ❌ Keys never returned to client
- ❌ Keys never exposed in error messages
- ✅ Keys encrypted at rest
- ✅ Keys only decrypted in memory when needed

---

## Data Isolation

### Multi-Tenancy

**User Isolation**:
```javascript
// Every query scoped by userId
where: {
  userId: req.user.id,
  documentId: documentId
}
```

**Vector Database**:
```javascript
// Metadata filtering ensures isolation
filter: {
  userId: userId,
  documentId: documentId
}
```

**Enforcement Layers**:
1. **Authentication middleware** - Validates user identity
2. **Database queries** - Filters by userId
3. **Vector queries** - Metadata filtering
4. **File access** - Path validation

---

## Payment Security

### Stripe Integration

**Webhook Verification**:
```javascript
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  webhookSecret
);
```

**Security Measures**:
- ✅ Webhook signature verification
- ✅ Idempotent payment handling
- ✅ Secure customer ID mapping
- ✅ Encrypted sensitive data

**Best Practices**:
- Use Stripe test mode in development
- Verify webhook signatures
- Handle duplicate events
- Log all payment events

---

## Input Validation

### Request Validation

**Express Validator**:
```javascript
[
  body('email').isEmail().normalizeEmail(),
  body('documentId').isUUID(),
  body('provider').isIn(['gemini', 'claude']),
]
```

**File Upload Validation**:
- ✅ File type checking (PDF only)
- ✅ File size limits (10MB default)
- ✅ Virus scanning (recommended in production)
- ✅ Filename sanitization

**SQL Injection Prevention**:
- ✅ Sequelize ORM with parameterized queries
- ✅ No raw SQL with user input

**XSS Prevention**:
- ✅ Helmet.js security headers
- ✅ Content-Type validation
- ✅ No user input in HTML responses

---

## Secrets Management

### Environment Variables

**Required Secrets**:
```env
CLERK_SECRET_KEY=sk_test_...           # Auth
STRIPE_SECRET_KEY=sk_test_...          # Payments
ENCRYPTION_KEY=64_char_hex_string      # Encryption
GEMINI_API_KEY=...                     # AI
ANTHROPIC_API_KEY=...                  # AI
PINECONE_API_KEY=...                   # Vector DB
```

**Best Practices**:
- ✅ Never commit `.env` to version control
- ✅ Use platform secrets management in production
- ✅ Rotate keys periodically
- ✅ Use different keys for dev/staging/prod
- ✅ Minimum 32 characters for encryption keys

**Generating Secure Keys**:
```bash
# Encryption key (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Random secret
openssl rand -base64 32
```

---

## Network Security

### HTTPS/TLS

**Requirements**:
- ✅ HTTPS only in production
- ✅ TLS 1.2 or higher
- ✅ Valid SSL certificate
- ✅ HSTS headers

**Configuration**:
```javascript
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### CORS

**Development**:
```javascript
cors({ origin: '*' })
```

**Production**:
```javascript
cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

---

## Rate Limiting

### Implementation

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

### Recommendations

| Endpoint | Rate Limit |
|----------|-----------|
| `/api/upload` | 10/hour per user |
| `/api/chat` | 100/hour per user |
| `/api/billing` | 5/hour per user |
| `/api/ai-settings` | 20/hour per user |

---

## Database Security

### Connection Security

**Production Connection**:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

**Security Measures**:
- ✅ SSL/TLS connection
- ✅ Strong passwords
- ✅ Connection pooling limits
- ✅ Prepared statements (via ORM)

### Access Control

**User Permissions**:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES TO app_user;
REVOKE ALL ON DATABASE FROM PUBLIC;
```

**Backup Security**:
- Encrypted backups
- Secure storage location
- Access logging
- Regular testing

---

## File Security

### Upload Security

**Validation**:
```javascript
const upload = multer({
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});
```

**Storage**:
- ✅ Random filenames (UUID)
- ✅ Separate user directories
- ✅ No execution permissions
- ✅ Path traversal prevention

**Recommendations**:
- Use cloud storage (S3, GCS)
- Implement virus scanning
- Set expiration policies
- Monitor storage usage

---

## Error Handling

### Secure Error Messages

**Development**:
```json
{
  "error": "Database connection failed",
  "stack": "Error: connect ECONNREFUSED..."
}
```

**Production**:
```json
{
  "error": "An error occurred",
  "code": "INTERNAL_ERROR"
}
```

**Implementation**:
```javascript
const errorHandler = (err, req, res, next) => {
  console.error(err); // Log full error server-side
  
  const response = {
    success: false,
    error: err.message
  };
  
  // Only include stack in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  res.status(err.statusCode || 500).json(response);
};
```

---

## Logging & Monitoring

### What to Log

**✅ Log**:
- Authentication attempts
- Authorization failures
- Payment events
- API errors
- Unusual activity

**❌ Never Log**:
- Passwords
- API keys
- Credit card numbers
- Personal identification
- Session tokens

### Log Security

```javascript
// Redact sensitive data
const sanitizeLog = (data) => {
  const sanitized = { ...data };
  if (sanitized.apiKey) sanitized.apiKey = '***REDACTED***';
  if (sanitized.password) sanitized.password = '***REDACTED***';
  return sanitized;
};
```

---

## Compliance

### GDPR Considerations

**User Rights**:
- ✅ Right to access data
- ✅ Right to deletion
- ✅ Right to export data
- ✅ Data processing transparency

**Implementation**:
```javascript
// User data export
router.get('/api/user/export', authenticate, async (req, res) => {
  const userData = await exportUserData(req.user.id);
  res.json(userData);
});

// User data deletion
router.delete('/api/user/account', authenticate, async (req, res) => {
  await deleteUserData(req.user.id);
  res.json({ success: true });
});
```

### Data Retention

**Policy**:
- User data: Retained while account active
- Deleted accounts: Data removed within 30 days
- Backups: Retained for 90 days
- Logs: Retained for 1 year

---

## Security Checklist

### Pre-Production

- [ ] All secrets in environment variables
- [ ] HTTPS enabled
- [ ] SSL certificate valid
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Error messages sanitized
- [ ] Input validation implemented
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] CSRF protection (if using cookies)
- [ ] Security headers configured (Helmet.js)
- [ ] Database backups configured
- [ ] Monitoring/alerting set up
- [ ] Incident response plan documented

### Regular Audits

**Monthly**:
- Review access logs
- Check for vulnerabilities
- Update dependencies
- Rotate encryption keys

**Quarterly**:
- Security penetration testing
- Dependency audit
- Access review
- Backup restoration test

---

## Incident Response

### Security Breach Protocol

1. **Immediate Actions**:
   - Isolate affected systems
   - Revoke compromised credentials
   - Enable additional logging

2. **Investigation**:
   - Review access logs
   - Identify scope of breach
   - Document findings

3. **Remediation**:
   - Patch vulnerabilities
   - Rotate all secrets
   - Update security measures

4. **Communication**:
   - Notify affected users
   - Report to authorities (if required)
   - Update security documentation

---

## Security Contacts

**Report Security Issues**:
- Email: security@yourdomain.com
- Encrypted: PGP key available
- Response time: 24 hours

**Bug Bounty**:
- Consider implementing for production

---

## Resources

### Standards & Frameworks
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

### Tools
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Dependency scanning
- [Snyk](https://snyk.io/) - Vulnerability scanning
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing

---

**Security is an ongoing process, not a one-time task. Stay vigilant! 🔒**
