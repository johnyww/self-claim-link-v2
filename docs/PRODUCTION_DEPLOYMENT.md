# Production Deployment Guide

This guide covers deploying the Self-Claim-Link application to production with all Phase 1 production-ready components.

## 🚀 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- PostgreSQL database (can be provided via Docker Compose)
- Domain name with SSL certificate (recommended)

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/johnyww/self-claim-link.git
cd self-claim-link

# Copy environment files
cp docker-compose.env.example .env
cp .env.example .env.local
```

### 2. Configure Environment Variables

Edit `.env` file:
```bash
# Generate a strong JWT secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database configuration
POSTGRES_DB=self_claim_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-postgres-password

# Optional: Sentry for error tracking
SENTRY_DSN=your-sentry-dsn-url
```

### 3. Deploy with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
```

### 4. Verify Deployment

- Application: http://localhost:3000
- Health Check: http://localhost:3000/api/health
- Metrics: http://localhost:3000/api/metrics
- Admin Login: http://localhost:3000/admin/login (admin/password)

## 🔧 Manual Deployment

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+
- PM2 or similar process manager

### 1. Build Application

```bash
npm ci --production
npm run build
```

### 2. Start Application

```bash
# With PM2
pm2 start npm --name "self-claim-link" -- start

# Or directly
npm start
```

## 🔒 Security Configuration

### SSL/TLS Setup
Configure your reverse proxy (nginx/Apache) with SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Environment Security
- Use strong, unique passwords
- Enable database SSL in production
- Configure firewall rules
- Regular security updates

## 📊 Monitoring & Maintenance

### Health Monitoring
```bash
# Check application health
curl http://localhost:3000/api/health

# Check metrics
curl http://localhost:3000/api/metrics
```

### Log Management
```bash
# View application logs
docker-compose logs app

# View database logs
docker-compose logs postgres
```

### Database Backups
```bash
# Manual backup
./scripts/backup.sh

# Setup automated backups
./scripts/backup-cron.sh

# Check backup health
./scripts/backup-health-check.sh

# Restore from backup
./scripts/restore.sh /backups/backup_file.sql.gz
```

## 🧪 Testing in Production

### Smoke Tests
```bash
# Run health checks
npm run test:e2e:smoke

# Test critical paths
curl -X POST http://localhost:3000/api/claim \
  -H "Content-Type: application/json" \
  -d '{"orderId":"TEST123"}'
```

### Performance Testing
```bash
# Load testing with Artillery
npm install -g artillery
artillery quick --count 100 --num 10 http://localhost:3000
```

## 🔄 CI/CD Pipeline

The application includes GitHub Actions workflows for:
- Automated testing on push/PR
- Security scanning
- Docker image building
- Deployment automation

### Secrets Configuration
Add these secrets to your GitHub repository:
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `SNYK_TOKEN` (optional, for security scanning)

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancer (nginx, HAProxy)
- Multiple application instances
- Shared PostgreSQL database
- Redis for session storage

### Database Scaling
- Read replicas for read-heavy workloads
- Connection pooling (already implemented)
- Database monitoring and optimization

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL service status
   - Verify connection credentials
   - Check network connectivity

2. **High Memory Usage**
   - Monitor with `/api/metrics`
   - Check for memory leaks
   - Adjust Node.js heap size

3. **Slow Response Times**
   - Check database query performance
   - Monitor with Sentry APM
   - Review application logs

### Support Contacts
- Application logs: `./logs/`
- Error tracking: Sentry dashboard
- Metrics: `/api/metrics` endpoint

## 📋 Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Database backups automated
- [ ] Monitoring alerts configured
- [ ] Security headers enabled
- [ ] Error tracking setup
- [ ] Performance monitoring active
- [ ] Load testing completed
- [ ] Disaster recovery plan documented
