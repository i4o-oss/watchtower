# Railway Deployment Guide

This guide walks you through deploying Watchtower to Railway platform.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Railway CLI** (optional): `npm install -g @railway/cli`

## Quick Deploy

### Option 1: Deploy Button (Recommended)

Click this button to deploy directly to Railway:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

### Option 2: Manual Deployment

1. **Create New Project**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your Watchtower repository

2. **Add PostgreSQL Database**
   - Click "Add Service" 
   - Select "Database" > "PostgreSQL"
   - Railway will automatically provide `DATABASE_URL`

3. **Configure Environment Variables**
   - Go to your service settings
   - Click "Variables" tab
   - Add the following variables:

## Required Environment Variables

Copy these to your Railway project settings:

```bash
# Server Configuration  
PORT=3000
ENV=production

# Security (Generate secure random strings!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# CSRF Protection
ALLOWED_ORIGINS=https://your-app-name.railway.app

# Database (Automatically set when you add PostgreSQL service)
# DATABASE_URL=postgresql://... (provided by Railway)
```

## Database Setup

Railway's PostgreSQL service automatically provides:
- `DATABASE_URL` environment variable
- SSL-enabled connection
- Automatic backups
- Connection pooling

The application will automatically:
- Parse the `DATABASE_URL` 
- Run database migrations on startup
- Handle connection pooling

## Optional Services

### Redis Cache (Optional)

To enable caching:

1. Add Redis service to your Railway project
2. Set environment variables:
   ```bash
   CACHE_ENABLED=true
   # REDIS_URL is provided automatically by Railway
   ```

## Custom Domain Setup

1. **Add Custom Domain**
   - Go to your service settings
   - Click "Networking" tab  
   - Click "Custom Domain"
   - Enter your domain name

2. **Update Environment Variables**
   ```bash
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

3. **DNS Configuration**
   - Add CNAME record pointing to your Railway URL
   - Railway handles SSL certificate provisioning

## Monitoring & Logs

### Health Checks

Railway automatically monitors:
- **Health Endpoint**: `/health`
- **Response Time**: < 60 seconds
- **Auto-restart**: On service failure

### Application Logs

View logs in Railway dashboard:
- Real-time log streaming
- Log search and filtering
- Error alerting

### Performance Monitoring

Built-in metrics include:
- CPU usage
- Memory consumption  
- Request volume
- Response times

## Scaling

### Automatic Scaling

Railway provides:
- **Vertical scaling**: CPU/Memory auto-adjustment
- **Sleep mode**: Automatic hibernation when idle
- **Wake-up**: Instant activation on request

### Resource Limits

Configure in Railway dashboard:
- **Memory**: 512MB - 32GB
- **CPU**: Shared to dedicated cores
- **Storage**: Up to 100GB

## Deployment Pipeline

### Automatic Deployment

Railway automatically deploys when:
- Code is pushed to `main` branch
- Environment variables change
- Service configuration updates

### Manual Deployment

Using Railway CLI:
```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

## Environment-Specific Deployments

### Staging Environment

1. Create separate Railway project for staging
2. Connect to `staging` branch
3. Use different environment variables:
   ```bash
   ENV=staging
   ALLOWED_ORIGINS=https://staging-app.railway.app
   ```

### Production Environment

1. Use `main` branch for production
2. Set production environment variables
3. Enable monitoring and alerting

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify `DATABASE_URL` is set
   - Check PostgreSQL service is running
   - Ensure SSL mode is configured

2. **Health Check Failing**
   - Check `/health` endpoint response
   - Verify all services are healthy
   - Check application logs

3. **Environment Variables**
   - Verify all required variables are set
   - Check variable names match exactly
   - Restart service after variable changes

### Getting Help

1. **Railway Logs**: Check service logs in dashboard
2. **Health Status**: Monitor `/health` endpoint
3. **Railway Support**: Use Railway Discord/Support
4. **Application Issues**: Check application logs

## Security Best Practices

1. **Environment Variables**
   - Use Railway's encrypted variable storage
   - Never commit secrets to Git
   - Rotate secrets regularly

2. **Database Security**
   - Railway PostgreSQL uses SSL by default
   - Automatic security updates
   - Network isolation

3. **Application Security**
   - CSRF protection enabled
   - Security headers configured
   - HTTPS enforced

## Cost Optimization

1. **Resource Sizing**
   - Start with minimal resources
   - Scale based on actual usage
   - Monitor resource metrics

2. **Sleep Mode**
   - Enable for development/staging
   - Reduces costs when idle
   - Sub-second wake-up times

3. **Database Optimization**
   - Use connection pooling
   - Optimize query performance
   - Regular maintenance

## Next Steps

After successful deployment:

1. **Configure Monitoring**: Set up alerts and monitoring
2. **Custom Domain**: Add your domain name
3. **SSL Certificate**: Automatic HTTPS setup
4. **Backup Strategy**: Configure backup policies
5. **Performance Testing**: Load test your deployment

## Support

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Railway Status**: [status.railway.app](https://status.railway.app)