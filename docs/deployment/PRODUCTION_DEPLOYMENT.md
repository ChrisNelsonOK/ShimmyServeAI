# Production Deployment Guide

## Overview

This guide covers deploying ShimmyServeAI to production environments using Docker, with options for local deployment, cloud providers, and Kubernetes.

## Prerequisites

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Node.js** 20+ (for local builds)
- **SSL Certificate** (for HTTPS)
- **Domain Name** (recommended)

## Quick Production Deployment

### Option 1: Docker Compose (Recommended)

1. **Clone and prepare:**
```bash
git clone https://github.com/your-org/shimmyserveai.git
cd shimmyserveai
```

2. **Configure environment:**
```bash
cp .env.example .env.production
# Edit .env.production with your production settings
```

3. **Deploy:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

4. **Verify deployment:**
```bash
curl https://your-domain.com/api/health
```

### Option 2: Local Build + Docker

1. **Build application:**
```bash
# Build frontend
npm install
npm run build

# Build backend  
cd backend
npm install
npm run build
cd ..
```

2. **Create production Docker image:**
```bash
docker build -t shimmyserveai:latest .
```

3. **Run production container:**
```bash
docker run -d \
  --name shimmyserveai \
  -p 80:80 \
  -p 443:443 \
  -v $(pwd)/backend/data:/app/data \
  -v $(pwd)/ssl:/app/ssl \
  --restart unless-stopped \
  shimmyserveai:latest
```

## Environment Configuration

### Environment Variables

Create `.env.production`:

```bash
# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com

# Database
DATABASE_PATH=/app/data/shimmy.db
BACKUP_PATH=/app/data/backups

# Security
JWT_SECRET=your-super-secure-jwt-secret-here-min-64-chars
BCRYPT_ROUNDS=12
SESSION_SECRET=another-secure-secret-for-sessions

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SSL/HTTPS
SSL_CERT_PATH=/app/ssl/cert.pem
SSL_KEY_PATH=/app/ssl/key.pem
FORCE_HTTPS=true

# CORS
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/data/logs/app.log
LOG_MAX_SIZE=10mb
LOG_MAX_FILES=10

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_PATH=/health
```

### Docker Compose Production Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  shimmyserveai:
    build:
      context: .
      dockerfile: Dockerfile.prod
    container_name: shimmyserveai-prod
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./backend/data:/app/data
      - ./ssl:/app/ssl:ro
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - shimmynet

  nginx:
    image: nginx:alpine
    container_name: shimmyserveai-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/prod.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - shimmyserveai
    networks:
      - shimmynet

networks:
  shimmynet:
    driver: bridge

volumes:
  app_data:
    driver: local
  app_logs:
    driver: local
```

## SSL/HTTPS Setup

### Option 1: Let's Encrypt (Recommended)

1. **Install Certbot:**
```bash
sudo apt-get update
sudo apt-get install certbot
```

2. **Get SSL certificate:**
```bash
sudo certbot certonly --standalone -d your-domain.com
```

3. **Copy certificates:**
```bash
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
sudo chown $(whoami):$(whoami) ./ssl/*.pem
```

### Option 2: Self-Signed Certificate (Development)

```bash
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
```

## Nginx Configuration

Create `nginx/prod.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream shimmyserveai {
        server shimmyserveai:3001;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/ssl/certs/cert.pem;
        ssl_certificate_key /etc/ssl/certs/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
        add_header Referrer-Policy "strict-origin-when-cross-origin";

        # Static Files
        location / {
            root /app/dist;
            try_files $uri $uri/ /index.html;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API Routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://shimmyserveai;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Authentication Routes (Stricter Rate Limiting)
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://shimmyserveai;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket Routes
        location /ws {
            proxy_pass http://shimmyserveai;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Database Management

### Backup Strategy

1. **Automated Backups:**
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/app/data/backups"
DB_PATH="/app/data/shimmy.db"

mkdir -p $BACKUP_DIR
sqlite3 $DB_PATH ".backup $BACKUP_DIR/shimmy_backup_$DATE.db"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "shimmy_backup_*.db" -mtime +30 -delete

echo "Backup completed: shimmy_backup_$DATE.db"
```

2. **Schedule with cron:**
```bash
# Add to crontab
0 2 * * * /app/scripts/backup.sh
```

### Database Migration

```bash
# Backup current database
sqlite3 shimmy.db ".backup shimmy_backup_$(date +%Y%m%d).db"

# Run migrations (if any)
cd backend && npm run migrate

# Verify integrity
sqlite3 shimmy.db "PRAGMA integrity_check;"
```

## Monitoring & Logging

### Health Checks

The application provides several health check endpoints:

```bash
# Basic health check
curl https://your-domain.com/api/health

# Detailed system status
curl https://your-domain.com/api/system/status

# Database connectivity
curl https://your-domain.com/api/system/database/health
```

### Log Management

1. **Application Logs:**
```bash
# View real-time logs
docker logs -f shimmyserveai-prod

# Application log files
tail -f logs/app.log
tail -f logs/error.log
```

2. **Nginx Logs:**
```bash
# Access logs
tail -f logs/nginx/access.log

# Error logs  
tail -f logs/nginx/error.log
```

### Metrics Collection

Configure monitoring with your preferred tools:

**Prometheus Integration:**
```yaml
# Add to docker-compose.prod.yml
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
```

## Security Considerations

### Network Security
- Use HTTPS only in production
- Configure firewall rules
- Limit SSH access
- Use VPN for administrative access

### Application Security
- Change all default passwords
- Use strong JWT secrets (64+ characters)
- Enable rate limiting
- Regular security updates
- Monitor authentication logs

### Database Security
- Regular backups
- File permission restrictions
- Encrypted storage (if required)

## Performance Optimization

### Docker Optimization
```dockerfile
# Multi-stage build for smaller images
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
# ... rest of Dockerfile
```

### Nginx Optimization
```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Troubleshooting

### Common Issues

1. **Application won't start:**
```bash
# Check logs
docker logs shimmyserveai-prod

# Check environment variables
docker exec shimmyserveai-prod env

# Check file permissions
docker exec shimmyserveai-prod ls -la /app/data
```

2. **Database connection errors:**
```bash
# Verify database file exists
docker exec shimmyserveai-prod ls -la /app/data/shimmy.db

# Check database integrity
docker exec shimmyserveai-prod sqlite3 /app/data/shimmy.db "PRAGMA integrity_check;"
```

3. **SSL certificate issues:**
```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Verify certificate chain
openssl verify -CAfile ssl/cert.pem ssl/cert.pem
```

### Performance Issues

1. **High memory usage:**
```bash
# Check memory stats
docker stats shimmyserveai-prod

# Optimize Node.js memory
docker run -e NODE_OPTIONS="--max_old_space_size=512" ...
```

2. **Slow responses:**
```bash
# Check nginx logs for slow requests
grep "request_time" logs/nginx/access.log | sort -nrk10

# Monitor database queries
# Enable query logging in SQLite
```

## Scaling

### Horizontal Scaling

For high-traffic deployments:

1. **Load Balancer Setup:**
```yaml
# docker-compose.scale.yml
services:
  nginx:
    # ... nginx config with upstream load balancing
  
  app1:
    # ... application instance 1
  
  app2:
    # ... application instance 2
  
  app3:
    # ... application instance 3
```

2. **Database Considerations:**
- Consider PostgreSQL for multi-instance deployments
- Implement database connection pooling
- Use Redis for session storage

### Vertical Scaling

```yaml
# Increase container resources
services:
  shimmyserveai:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

---

For additional deployment scenarios and cloud-specific guides, see:
- `CLOUD_DEPLOYMENT.md` - AWS, GCP, Azure deployment
- `KUBERNETES_DEPLOYMENT.md` - Kubernetes manifests
- `DOCKER_SWARM.md` - Docker Swarm setup