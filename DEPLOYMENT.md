# 🚀 Deployment Guide - Poster Forge

## Option 1: Deploy to Render.com (Recommended - FREE)

### Why Render?
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Persistent storage for SQLite database
- ✅ Easy environment variables
- ✅ Auto-deploy from GitHub

### Steps:

#### 1. Prepare GitHub Repository
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - Poster Forge"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/poster-forge.git
git push -u origin main
```

#### 2. Deploy to Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `poster-forge` (or any name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

5. **Add Environment Variables** (in Render dashboard):
   - `ADMIN_TOKEN` = `admin123` (or your custom token)
   - `OPENAI_API_KEY` = `your-openai-key` (optional)
   - `NODE_VERSION` = `18`

6. Click **"Create Web Service"**

7. Wait 5-10 minutes for deployment ⏳

8. Your app will be live at: `https://poster-forge.onrender.com` 🎉

### Important Notes for Render:
- **Persistent Disk**: In Render dashboard, add a **disk** mounted at `/app/uploads` to persist uploaded images
- **Database**: SQLite will work on the persistent disk
- **Cold Starts**: Free tier sleeps after 15 min of inactivity (first request may be slow)

---

## Option 2: Deploy to Railway.app (FREE with GitHub Student)

### Steps:

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your `poster-forge` repository
5. Railway auto-detects Node.js and deploys!
6. Add environment variables in Railway dashboard:
   - `ADMIN_TOKEN`
   - `OPENAI_API_KEY`

**Your app is live!** Railway provides a URL like `https://poster-forge.up.railway.app`

---

## Option 3: Deploy to Vercel (Serverless - Limitations)

**⚠️ Not recommended** - Vercel is serverless and doesn't support:
- Persistent SQLite database (resets on each deploy)
- File uploads (ephemeral filesystem)

Better for static sites, not for this app with database.

---

## Option 4: Deploy to DigitalOcean App Platform

### Steps:

1. Go to [digitalocean.com/products/app-platform](https://www.digitalocean.com/products/app-platform)
2. Connect GitHub repository
3. Configure:
   - **Type**: Web Service
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
4. Add environment variables
5. Deploy!

**Cost**: $5/month minimum (not free)

---

## Option 5: VPS Deployment (Full Control)

### For Advanced Users - Deploy to DigitalOcean Droplet, AWS EC2, or Linode

#### Prerequisites:
- Ubuntu VPS (minimum $5/month)
- SSH access
- Domain name (optional)

#### Steps:

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Clone your repository
git clone https://github.com/YOUR_USERNAME/poster-forge.git
cd poster-forge

# Install dependencies
npm install

# Create .env file
nano .env
# Add:
# ADMIN_TOKEN=admin123
# OPENAI_API_KEY=your-key

# Start with PM2
pm2 start server.js --name poster-forge
pm2 startup
pm2 save

# Install Nginx
apt install nginx -y

# Configure Nginx
nano /etc/nginx/sites-available/poster-forge
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/poster-forge /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Install SSL with Let's Encrypt
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com
```

**Your app is now live with HTTPS!** 🔒

---

## Post-Deployment Checklist

✅ **Test all features:**
- Create poster
- Upload image
- Like/unlike
- Admin login & delete
- AI title generation
- Color palette extraction

✅ **Configure environment variables:**
- `ADMIN_TOKEN` - Change from default!
- `OPENAI_API_KEY` - Add if using AI features
- `PORT` - Usually auto-set by platform

✅ **Monitor logs:**
- Check for errors
- Verify database creation
- Test file uploads

✅ **Set up backups** (for VPS):
```bash
# Backup database
cp posters.db posters.db.backup

# Backup uploads
tar -czf uploads-backup.tar.gz uploads/
```

✅ **Update README** with live URL

---

## Troubleshooting

### "better-sqlite3" build errors
- Make sure Node.js version is 18+ (`node -v`)
- Platform should have build tools installed
- Railway/Render handle this automatically

### Database resets on deploy
- Render: Add persistent disk
- Railway: Database persists by default
- Vercel: Not suitable (use Render instead)

### Images disappear after restart
- Mount persistent volume at `/uploads`
- Or use cloud storage (AWS S3, Cloudinary)

### Port already in use
- Check `process.env.PORT` is used
- Don't hardcode port 3000

---

## Recommended: Render.com Free Tier

**Best balance of:**
- 💰 Cost: FREE
- ⚡ Performance: Good
- 🔧 Ease: Very easy
- 💾 Persistence: Yes (with disk)
- 🔒 HTTPS: Automatic

**Start here!** → [render.com](https://render.com)

---

## Need Help?

- Render Docs: https://render.com/docs
- Railway Docs: https://docs.railway.app
- DigitalOcean Tutorials: https://www.digitalocean.com/community/tutorials

Good luck with your deployment! 🚀
