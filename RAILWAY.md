# Deploy to Railway

Deploy Watchtower to Railway with one click and get a fully managed monitoring application.

## One-Click Deployment

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/watchtower)

Click the button above to deploy Watchtower to Railway in under 5 minutes.

## What You Get

When you deploy using the Railway button:

- ✅ **Watchtower Application** - Complete monitoring application
- ✅ **PostgreSQL Database** - Managed database for storing endpoints and monitoring data  
- ✅ **Redis Cache** - Managed Redis for improved performance
- ✅ **HTTPS & SSL** - Automatic SSL certificates and HTTPS
- ✅ **Custom Domain Support** - Optional custom domain configuration
- ✅ **Environment Variables** - Pre-configured with secure defaults

## Step-by-Step Deployment

### 1. Click Deploy Button
Click the "Deploy on Railway" button above. You'll be redirected to Railway.

### 2. Connect GitHub Account
- Click "Login with GitHub" if not already logged in
- Authorize Railway to access your GitHub repositories
- Railway will fork the Watchtower repository to your account

### 3. Configure Services
Railway automatically creates:
- **Watchtower service** - The main application
- **PostgreSQL service** - Database for storing data
- **Redis service** - Cache for improved performance

### 4. Wait for Deployment
- Railway builds the application using the optimized Docker configuration
- Database tables are automatically created via migrations
- Health checks ensure the application starts correctly
- Deployment typically takes 3-5 minutes

### 5. Access Your Application
Once deployed, Railway provides:
- **Public URL** - Access your application (e.g., `https://watchtower-production-xxxx.up.railway.app`)
- **Admin Dashboard** - Railway dashboard for monitoring and configuration

## Initial Setup

### 1. Access Your Application
Visit the URL provided by Railway after deployment.

### 2. Create Admin Account
- Register the first user account (becomes admin automatically)
- This account will have full access to configure monitoring

### 3. Add Monitoring Endpoints
- Click "Add Endpoint" to start monitoring websites
- Configure check intervals, timeout settings, and notification preferences
- View real-time status on your dashboard

## Configuration

### Environment Variables
Railway automatically configures these variables:

- `DATABASE_URL` - PostgreSQL connection (auto-generated)
- `REDIS_URL` - Redis connection (auto-generated)  
- `JWT_SECRET` - Authentication secret (auto-generated)
- `SESSION_SECRET` - Session secret (auto-generated)
- `PORT` - Application port (auto-configured)

For a complete list of all available environment variables, see [`.env.example`](.env.example) which includes detailed configuration options for all deployment scenarios.

### Custom Domain (Optional)
To use your own domain:

1. Go to Railway Dashboard → Your Project → Settings
2. Click "Domains" tab
3. Add your custom domain (e.g., `monitoring.yourdomain.com`)
4. Update your DNS with the CNAME record Railway provides
5. SSL certificate is automatically provisioned

### Scaling
Railway automatically handles:
- **Auto-scaling** based on traffic
- **Resource allocation** (CPU, memory)
- **Database scaling** as data grows
- **Backup management** (daily automated backups)

## Pricing

Railway offers simple, usage-based pricing:

- **Hobby Plan**: $5/month - Perfect for personal use or small teams
- **Pro Plan**: $20/month - Additional features and higher limits
- **Usage-based**: Pay only for resources you actually use

Both PostgreSQL and Redis are included in the plan pricing.

## Managing Your Deployment

### Viewing Logs
1. Go to Railway Dashboard → Your Project
2. Click on the "watchtower" service
3. Click "Logs" tab to view real-time application logs

### Monitoring Performance
Railway provides built-in monitoring:
- **CPU & Memory Usage** - Resource utilization graphs
- **Response Times** - Application performance metrics
- **Error Rates** - Application health monitoring
- **Database Metrics** - PostgreSQL performance data

### Updating Your Application
Railway automatically deploys updates when:
- You push changes to your GitHub repository's main branch
- Railway detects security updates or dependency changes

### Manual Deployment
You can also trigger manual deployments:
1. Go to Railway Dashboard → Your Project → watchtower service
2. Click "Deployments" tab
3. Click "Deploy Latest" button

## Troubleshooting

### Common Issues

**Application Not Starting**
- Check logs in Railway Dashboard → Service → Logs
- Verify environment variables are set correctly
- Ensure database connection is successful

**Database Connection Errors**
- Verify PostgreSQL service is running
- Check DATABASE_URL environment variable
- Review database logs in Railway dashboard

**Performance Issues**
- Monitor resource usage in Railway dashboard
- Check Redis cache hit rates
- Review slow query logs in PostgreSQL metrics

### Getting Help

1. **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
2. **Railway Discord**: Active community support
3. **Watchtower Issues**: [GitHub Issues](https://github.com/your-username/watchtower/issues)
4. **Railway Support**: Available through Railway dashboard

## Advanced Configuration

### Custom Environment Variables
Add additional configuration in Railway Dashboard:
1. Go to Variables tab in your service
2. Add custom variables as needed
3. Redeploy to apply changes

### Database Access
Connect directly to your PostgreSQL database:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and connect to your project
railway login
railway link [your-project-id]

# Connect to database
railway connect postgres
```

### Backup and Restore
Railway automatically creates daily backups. For manual backup:
```bash
# Create manual backup
railway run pg_dump $DATABASE_URL > backup.sql

# Restore from backup (if needed)
railway run psql $DATABASE_URL < backup.sql
```

## Security

Railway provides enterprise-grade security:
- ✅ **Encrypted connections** (TLS/SSL)
- ✅ **Database encryption** at rest
- ✅ **Network isolation** between services
- ✅ **Automatic security updates**
- ✅ **SOC 2 compliance**

Your Watchtower deployment is production-ready and secure out of the box.

---

Ready to start monitoring? Click the deploy button to get started!

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/watchtower)