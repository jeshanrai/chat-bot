# Deployment Guide: Render + Neon PostgreSQL

This guide walks you through deploying your WhatsApp Chatbot to Render using Neon PostgreSQL.

## Prerequisites

- [ ] GitHub repository with your code
- [ ] Neon PostgreSQL account ([neon.tech](https://neon.tech))
- [ ] Render account ([render.com](https://render.com))
- [ ] Meta Developer account with WhatsApp Business API access

## Step 1: Set Up Neon Database

1. **Create a Neon Project**
   - Go to [neon.tech](https://neon.tech) and create a new project
   - Choose a region close to your Render deployment region

2. **Get Your Connection String**
   - In your Neon dashboard, copy the connection string
   - It looks like: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`
   - Save this for later - you'll add it to Render

3. **Initialize Database Schema**
   - After deployment, visit: `https://your-app.onrender.com/init-db`
   - This will create tables and seed menu data

## Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create New Web Service on Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect `render.yaml` and configure automatically

3. **Set Environment Variables**
   
   In Render dashboard, add these environment variables:
   
   | Variable | Value | Where to Get It |
   |----------|-------|-----------------|
   | `DATABASE_URL` | Your Neon connection string | Neon dashboard |
   | `GROQ_API_KEY` | Your Groq API key | [console.groq.com](https://console.groq.com) |
   | `WHATSAPP_TOKEN` | WhatsApp access token | Meta Developer Console |
   | `WHATSAPP_VERIFY_TOKEN` | Any secret string you choose | Create your own (e.g., `my_secure_token_123`) |
   | `WHATSAPP_PHONE_NUMBER_ID` | Your WhatsApp phone number ID | Meta Developer Console |
   | `MESSENGER_TOKEN` | Messenger page access token | Meta Developer Console (optional) |
   | `MESSENGER_VERIFY_TOKEN` | Any secret string you choose | Create your own (optional) |
   | `NODE_ENV` | `production` | Set manually |

4. **Deploy**
   - Click "Apply" and Render will build and deploy your app
   - Wait for deployment to complete (usually 2-5 minutes)

### Option B: Manual Setup

1. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `whatsapp-chatbot` (or your choice)
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

2. **Set Environment Variables** (same as Option A above)

3. **Deploy**

## Step 3: Initialize Database

1. **Visit the init endpoint**
   ```
   https://your-app.onrender.com/init-db
   ```
   
2. **Verify database**
   ```
   https://your-app.onrender.com/health
   ```
   Should return: `{"status":"ok","database":"connected"}`

## Step 4: Configure WhatsApp Webhook

1. **Go to Meta Developer Console**
   - Navigate to your WhatsApp app
   - Go to WhatsApp → Configuration

2. **Set Webhook URL**
   ```
   https://your-app.onrender.com/whatsapp-webhook
   ```

3. **Set Verify Token**
   - Use the same value you set for `WHATSAPP_VERIFY_TOKEN` in Render

4. **Subscribe to Webhook Fields**
   - Check: `messages`

5. **Test the Webhook**
   - Send a message to your WhatsApp number
   - Check Render logs to see if it's received

## Step 5: Verify Deployment

- [ ] Health check passes: `https://your-app.onrender.com/health`
- [ ] Database initialized: `https://your-app.onrender.com/db`
- [ ] WhatsApp webhook verified in Meta Console
- [ ] Test message received and bot responds

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct in Render environment variables
- Check Neon dashboard for connection limits
- Review Render logs for SSL errors

### Webhook Not Receiving Messages
- Verify webhook URL in Meta Console matches your Render URL
- Check verify token matches exactly
- Review Render logs for incoming requests

### Bot Not Responding
- Check Render logs for errors
- Verify `GROQ_API_KEY` is set correctly
- Test database connection via `/health` endpoint

## Useful Commands

**View Render Logs:**
```bash
# In Render dashboard, go to your service → Logs
```

**View Database Contents:**
```
https://your-app.onrender.com/db/foods
https://your-app.onrender.com/db/orders
```

**Health Check:**
```
https://your-app.onrender.com/health
```

## Notes

> [!TIP]
> Render free tier apps sleep after 15 minutes of inactivity. Consider upgrading to a paid plan for production use, or use a service like UptimeRobot to ping your app periodically.

> [!IMPORTANT]
> Keep your environment variables secure. Never commit `.env` files to Git.
