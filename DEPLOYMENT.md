# Deployment Guide

This guide covers deploying the RAG Backend to production.

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] PostgreSQL database set up
- [ ] Pinecone index created
- [ ] Clerk app configured
- [ ] Stripe webhooks configured
- [ ] SSL certificate obtained
- [ ] Domain configured
- [ ] Backup strategy planned

---

## Platform-Specific Guides

### Railway

1. **Install Railway CLI**:
```bash
npm install -g railway
```

2. **Login and initialize**:
```bash
railway login
railway init
```

3. **Add PostgreSQL**:
```bash
railway add -s postgres
```

4. **Set environment variables**:
```bash
railway variables set CLERK_SECRET_KEY=sk_...
railway variables set STRIPE_SECRET_KEY=sk_...
# ... set all other variables
```

5. **Deploy**:
```bash
railway up
```

6. **Get URL**:
```bash
railway domain
```

---

### Render

1. **Create New Web Service**:
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Build**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

3. **Add PostgreSQL Database**:
   - Click "New +" → "PostgreSQL"
   - Copy the internal connection string

4. **Set Environment Variables**:
   - Go to your Web Service → "Environment"
   - Add all variables from `.env.example`
   - Set `DATABASE_URL` to PostgreSQL connection string

5. **Deploy**:
   - Click "Manual Deploy" or push to connected branch

---

### Heroku

1. **Create app**:
```bash
heroku create rag-backend-prod
```

2. **Add PostgreSQL**:
```bash
heroku addons:create heroku-postgresql:essential-0
```

3. **Set environment variables**:
```bash
heroku config:set NODE_ENV=production
heroku config:set CLERK_SECRET_KEY=sk_...
heroku config:set STRIPE_SECRET_KEY=sk_...
# ... set all other variables
```

4. **Deploy**:
```bash
git push heroku main
```

5. **Scale**:
```bash
heroku ps:scale web=1
```

6. **View logs**:
```bash
heroku logs --tail
```

---

### DigitalOcean App Platform

1. **Create App**:
   - Go to Apps → "Create App"
   - Connect GitHub repository

2. **Configure App**:
   - **Name**: rag-backend
   - **Region**: Choose closest to users
   - **Plan**: Basic ($5/month minimum)

3. **Add Database**:
   - Add PostgreSQL database component
   - Copy connection string

4. **Set Environment Variables**:
   - Go to Settings → Environment Variables
   - Add all variables

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

---

### Docker Deployment

1. **Create Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

2. **Create docker-compose.yml**:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=rag_platform
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

3. **Build and run**:
```bash
docker-compose up -d
```

---

## Post-Deployment Configuration

### 1. Configure Clerk Webhooks

1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/auth/webhook`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`

### 2. Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/billing/webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

### 3. Set Up SSL

Most platforms (Railway, Render, Heroku) provide SSL automatically.

For custom deployments:
- Use Let's Encrypt with Certbot
- Or use Cloudflare for SSL termination

### 4. Configure CORS

Update `.env`:
```env
ALLOWED_ORIGINS=https://your-frontend.com,https://app.yourdomain.com
```

### 5. Database Migrations

Run initial migration:
```bash
npm start
```

The server will automatically create tables on first run.

---

## Monitoring & Logging

### Error Tracking

**Sentry**:
```bash
npm install @sentry/node
```

Add to `src/server.js`:
```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Logging

Production logs are automatically created. View with:

**Railway**:
```bash
railway logs
```

**Heroku**:
```bash
heroku logs --tail
```

**Render**:
View in Dashboard → Logs

### Uptime Monitoring

Use services like:
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor: `https://your-domain.com/health`

---

## Scaling

### Horizontal Scaling

Most platforms support auto-scaling:

**Railway**:
```bash
railway scale --replicas 3
```

**Heroku**:
```bash
heroku ps:scale web=3
```

### Database Optimization

1. **Add indexes**:
```sql
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
```

2. **Connection pooling**:
Update `src/db/client.js`:
```javascript
const sequelize = new Sequelize(config.database.url, {
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
});
```

### Caching

Add Redis for caching:
```bash
npm install redis
```

Cache embeddings and frequently accessed data.

---

## Backup Strategy

### Database Backups

**Automated** (Railway/Render/Heroku provide this)

**Manual**:
```bash
pg_dump $DATABASE_URL > backup.sql
```

**Restore**:
```bash
psql $DATABASE_URL < backup.sql
```

### File Uploads

Use cloud storage for uploads:
- AWS S3
- Google Cloud Storage
- Cloudflare R2

Update `src/routes/upload.js` to use cloud storage.

---

## Security Hardening

### 1. Rate Limiting

Install rate limiter:
```bash
npm install express-rate-limit
```

Add to `src/app.js`:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 2. HTTPS Only

Enforce HTTPS:
```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### 3. Security Headers

Already included via Helmet.js, but verify:
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
```

### 4. Environment Variables

Never commit `.env` to version control.

Use platform-specific secrets management:
- Railway: Environment variables
- Render: Secret files
- Heroku: Config vars

---

## Troubleshooting Deployment

### Build Fails

Check:
- Node version matches (≥18)
- All dependencies in `package.json`
- No syntax errors

### Database Connection Fails

Check:
- `DATABASE_URL` is correct
- Database exists
- Network allows connection
- SSL mode if required

### Webhooks Not Working

Check:
- Webhook URL is correct and accessible
- HTTPS is enabled
- Webhook secrets match
- Events are selected in dashboard

### High Memory Usage

Solutions:
- Increase server resources
- Implement connection pooling
- Add caching layer
- Optimize embeddings generation

---

## Cost Optimization

### Free Tiers

- **Database**: Render free PostgreSQL (expires after 90 days)
- **Hosting**: Railway ($5/month with $5 free credit)
- **Vector DB**: Pinecone starter (free)

### Paid Recommendations

**Starter** ($20-30/month):
- Render Web Service: $7/month
- Render PostgreSQL: $7/month
- Pinecone Starter: Free
- Cloudflare: Free

**Production** ($50-100/month):
- Railway Pro: $20/month
- Database: $15/month
- Pinecone Standard: $70/month
- CDN: $10/month

---

## Rollback Strategy

### Railway
```bash
railway rollback
```

### Heroku
```bash
heroku releases:rollback
```

### Render
Use Dashboard → Rollback to previous deploy

---

## Health Checks

Implement comprehensive health check:

```javascript
app.get('/health', async (req, res) => {
  const checks = {
    server: 'ok',
    database: await checkDatabase(),
    pinecone: await checkPinecone(),
    timestamp: new Date().toISOString(),
  };
  
  const allHealthy = Object.values(checks)
    .every(v => v === 'ok' || v === true);
  
  res.status(allHealthy ? 200 : 503).json(checks);
});
```

---

## Support

For deployment issues:
1. Check platform documentation
2. Review application logs
3. Verify all environment variables
4. Test endpoints with cURL
5. Contact platform support

---

**Happy Deploying! 🚀**
