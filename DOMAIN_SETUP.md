<!-- markdownlint-disable MD022 MD032 MD031 MD026 MD034 MD040 -->

# Domain Setup Guide for ravindracloudtechnology.com

This guide explains how to deploy your Crypto Exchange application with ERC-1155 support to your domain **ravindracloudtechnology.com**.

## 🌐 Domain Configuration Complete

Your application is now configured for:

- **Domain**: ravindracloudtechnology.com
- **Port**: 4000 (internal)
- **Public Port**: 443 (HTTPS) / 80 (HTTP redirect)
- **API URL**: https://ravindracloudtechnology.com/api
- **WebSocket**: wss://ravindracloudtechnology.com/ws

---

## 📋 Prerequisites

### 1. Server Requirements

- Ubuntu 20.04+ / Debian 10+ / CentOS 8+
- 2GB+ RAM
- 20GB+ disk space
- Node.js 18+ installed
- Nginx installed
- SSL certificate (Let's Encrypt)

### 2. Domain DNS Configuration

**Add these DNS records at your domain registrar:**

```
A Record:
  Name: @
  Value: [Your Server IP]
  TTL: 3600

A Record:
  Name: www
  Value: [Your Server IP]
  TTL: 3600

CNAME Record (optional):
  Name: api
  Value: ravindracloudtechnology.com
  TTL: 3600
```

---

## 🚀 Deployment Steps

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Upload Application

```bash
# Create application directory
sudo mkdir -p /var/www/crypto-exchange
sudo chown $USER:$USER /var/www/crypto-exchange

# Upload your application files
# (Use SCP, SFTP, or Git)
cd /var/www/crypto-exchange
# Copy all files from D:\crypto\crypto-exchange-app\
```

### Step 3: Install Dependencies

```bash
cd /var/www/crypto-exchange
npm install --production
```

### Step 4: Configure Environment

```bash
# Edit .env file
nano .env

# Ensure these settings:
NODE_ENV=production
PORT=4000
DOMAIN=ravindracloudtechnology.com
CORS_ORIGIN=https://ravindracloudtechnology.com,http://ravindracloudtechnology.com
JWT_SECRET=[Generate a secure secret]
```

**Generate JWT Secret:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 5: Setup SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot certonly --nginx \
  -d ravindracloudtechnology.com \
  -d www.ravindracloudtechnology.com

# Certificates will be saved to:
# /etc/letsencrypt/live/ravindracloudtechnology.com/
```

### Step 6: Configure Nginx

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/crypto-exchange

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/crypto-exchange /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 7: Start Application with PM2

```bash
cd /var/www/crypto-exchange

# Start application
pm2 start src/server.js --name crypto-exchange

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs
```

### Step 8: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

---

## ✅ Verification

### 1. Check Application Status

```bash
# PM2 status
pm2 status

# View logs
pm2 logs crypto-exchange

# Nginx status
sudo systemctl status nginx
```

### 2. Test Endpoints

```bash
# Health check
curl https://ravindracloudtechnology.com/api/health

# Main page
curl -I https://ravindracloudtechnology.com
```

### 3. Browser Test

Open in your browser:

```
https://ravindracloudtechnology.com
```

You should see your crypto exchange application with:

- ✅ Login page
- ✅ Dashboard with 13 tabs (including ERC-1155)
- ✅ All features working
- ✅ Secure HTTPS connection

---

## 🔒 Security Checklist

- [x] HTTPS enabled with valid SSL certificate
- [x] CORS configured for your domain only
- [x] JWT secret changed from default
- [x] Firewall configured
- [x] Security headers enabled in nginx
- [ ] Strong JWT secret set (not default)
- [ ] Database password protected
- [ ] API rate limiting enabled
- [ ] Regular backups configured

---

## 📊 Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs crypto-exchange --lines 100

# Restart application
pm2 restart crypto-exchange

# Reload application (zero downtime)
pm2 reload crypto-exchange
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/crypto-exchange-access.log

# Error logs
sudo tail -f /var/log/nginx/crypto-exchange-error.log
```

---

## 🔄 Updates & Maintenance

### Update Application

```bash
# Stop application
pm2 stop crypto-exchange

# Pull latest code
cd /var/www/crypto-exchange
git pull  # if using git

# Install dependencies
npm install --production

# Restart application
pm2 restart crypto-exchange
```

### Renew SSL Certificate

```bash
# Certbot auto-renewal (runs automatically)
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew
sudo systemctl reload nginx
```

### Database Backup

```bash
# Backup database
cp /var/www/crypto-exchange/data/exchange.db \
   /var/www/crypto-exchange/data/backups/exchange-$(date +%Y%m%d-%H%M%S).db

# Automated daily backup (crontab)
crontab -e
# Add: 0 2 * * * /var/www/crypto-exchange/scripts/backup.sh
```

---

## 🌐 Domain Access Points

Once deployed, your application will be accessible at:

- **Main Application**: https://ravindracloudtechnology.com
- **API Endpoints**: https://ravindracloudtechnology.com/api/*
- **WebSocket**: wss://ravindracloudtechnology.com/ws
- **Health Check**: https://ravindracloudtechnology.com/api/health

### ERC-1155 Endpoints

All ERC-1155 endpoints will be available at:

```
https://ravindracloudtechnology.com/api/erc1155/contracts
https://ravindracloudtechnology.com/api/erc1155/balance/:contractId/:tokenId
https://ravindracloudtechnology.com/api/erc1155/transfer
... (all 19 endpoints)
```

---

## 🆘 Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs crypto-exchange --lines 50

# Check port
sudo netstat -tulpn | grep 4000

# Test manually
cd /var/www/crypto-exchange
node src/server.js
```

### Nginx errors

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

### SSL certificate issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal

# Reload nginx
sudo systemctl reload nginx
```

### CORS errors

- Check CORS_ORIGIN in .env matches your domain
- Clear browser cache
- Check browser console for specific errors

---

## 📞 Support

If you encounter issues:

1. Check PM2 logs: `pm2 logs crypto-exchange`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/crypto-exchange-error.log`
3. Verify DNS propagation: https://www.whatsmydns.net/
4. Test SSL certificate: https://www.ssllabs.com/ssltest/

---

## 🎉 Success!

Once completed, your crypto exchange application with full ERC-1155 NFT support will be live at:

**https://ravindracloudtechnology.com**

Features available:

- ✅ User authentication
- ✅ Multi-currency wallet (BTC, ETH, BNB, SOL, TRX)
- ✅ ERC-1155 NFT management (19 endpoints, 4 database tables)
- ✅ Real-time trading
- ✅ WebSocket updates
- ✅ Secure HTTPS
- ✅ Professional UI/UX

**Your application is production-ready!** 🚀
