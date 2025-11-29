# Free Deployment Guide for EDU Backend

This guide will help you deploy your NestJS backend and databases for **FREE** using:
- **Render.com** - Backend hosting (Free tier: 750 hours/month)
- **MongoDB Atlas** - MongoDB database (Free tier: 512 MB)
- **Neon.tech** - PostgreSQL database (Free tier: 512 MB)

## Prerequisites
- GitHub account
- Gmail account (for email functionality)
- Cloudinary account (for image uploads)

---

## Step 1: Set Up MongoDB Atlas (Free)

1. **Create Account**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up with Google or create a new account

2. **Create Free Cluster**
   - Click "Build a Database"
   - Select **M0 FREE** tier
   - Choose **AWS** as cloud provider
   - Select a region closest to you (e.g., Singapore, Mumbai)
   - Click "Create"

3. **Configure Database Access**
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `edu_user` (or your choice)
   - Password: Generate a secure password and **save it**
   - Database User Privileges: "Atlas admin"
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" in left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://edu_user:<password>@cluster0.xxxxx.mongodb.net/`)
   - **Save this** - you'll need it for configuration
   - Extract the following from the connection string:
     - `MONGO_HOST`: cluster0.xxxxx.mongodb.net
     - `MONGO_USERNAME`: edu_user
     - `MONGO_PASSWORD`: your password

---

## Step 2: Set Up Neon.tech PostgreSQL (Free)

1. **Create Account**
   - Go to https://neon.tech
   - Click "Sign Up" and use GitHub or Google

2. **Create Project**
   - Click "Create a project"
   - Project name: `edu-backend`
   - PostgreSQL version: 16 (latest)
   - Region: Choose closest to you
   - Click "Create Project"

3. **Get Connection Details**
   - After creation, you'll see the connection details
   - Copy and save:
     - **Host**: `ep-xxxxx.us-east-2.aws.neon.tech`
     - **Database**: `neondb` (or create new: `edu`)
     - **User**: (shown in connection string)
     - **Password**: (shown in connection string)
     - **Port**: `5432`

4. **Create Database** (Optional)
   - Go to "SQL Editor" tab
   - Run: `CREATE DATABASE edu;`
   - Or use the default `neondb` database

---

## Step 3: Set Up Cloudinary (Free)

1. **Create Account**
   - Go to https://cloudinary.com/users/register/free
   - Sign up for free account

2. **Get Credentials**
   - Go to Dashboard
   - Copy and save:
     - **Cloud Name**
     - **API Key**
     - **API Secret**

---

## Step 4: Set Up Gmail App Password (For Email)

1. **Enable 2-Factor Authentication**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (custom name)"
   - Name it "EDU Backend"
   - Copy the 16-character password (no spaces)
   - **Save this** as `MAIL_PASSWORD`

---

## Step 5: Deploy to Render.com

1. **Create Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Push Code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

3. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `edu-be` repository
   - Configure:
     - **Name**: `edu-backend` (or your choice)
     - **Region**: Choose closest to you
     - **Branch**: `main`
     - **Root Directory**: (leave blank)
     - **Environment**: `Node`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm run start:prod`
     - **Instance Type**: `Free`

4. **Add Environment Variables**
   - Scroll down to "Environment Variables"
   - Click "Add from .env"
   - Or add manually one by one:

   ```env
   # Application
   NODE_ENV=production
   APP_ENV=prod
   PORT=3001
   FRONTEND_URL=https://your-frontend-url.vercel.app
   BACKEND_URL=https://edu-backend.onrender.com

   # JWT Secrets (Generate random strings)
   JWT_ACCESS_SECRET=YOUR_RANDOM_SECRET_32_CHARS_MIN
   JWT_ACCESS_EXPIRATION=365d
   JWT_ACCESS_EXPIRATION_COOKIE=3000000000
   JWT_REFRESH_SECRET=DIFFERENT_RANDOM_SECRET_32_CHARS_MIN
   JWT_REFRESH_EXPIRATION=7d
   JWT_REFRESH_EXPIRATION_COOKIE=604800000

   # PostgreSQL (from Neon.tech)
   DB_HOST=ep-xxxxx.us-east-2.aws.neon.tech
   DB_PORT=5432
   DB_NAME=edu
   DB_USER=your-neon-username
   DB_PASSWORD=your-neon-password

   # MongoDB (from Atlas)
   MONGO_USERNAME=edu_user
   MONGO_PASSWORD=your-mongo-password
   MONGO_HOST=cluster0.xxxxx.mongodb.net
   MONGO_PORT=27017
   MONGO_DB=edu
   MONGO_AUTH_DB=admin

   # Email (Gmail)
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_SECURE=false
   MAIL_USER=your-email@gmail.com
   MAIL_PASSWORD=your-gmail-app-password
   MAIL_FROM=your-email@gmail.com

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   CALLBACKURL=https://edu-backend.onrender.com/auth/google/callback

   # VNPay
   VNPAY_TMN_CODE=your-vnpay-code
   VNPAY_HASH_SECRET=your-vnpay-secret
   VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
   VNPAY_RETURN_URL=https://edu-backend.onrender.com/payments/vnpay-return

   # Gemini AI
   GEMINI_API_KEY=your-gemini-api-key

   # Default Users
   ADMIN_NAME=admin
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=changethispassword
   INSTRUCTOR_NAME=instructor
   INSTRUCTOR_EMAIL=instructor@example.com
   INSTRUCTOR_PASSWORD=changethispassword
   LEARNER_NAME=learner
   LEARNER_EMAIL=learner@example.com
   LEARNER_PASSWORD=changethispassword
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Your backend will be available at: `https://edu-backend.onrender.com`

---

## Step 6: Verify Deployment

1. **Check Logs**
   - In Render dashboard, go to "Logs" tab
   - Verify no errors

2. **Test Health Check**
   - Visit: `https://your-app.onrender.com`
   - Should return a response (not error)

3. **Test API Endpoints**
   ```bash
   # Test health
   curl https://your-app.onrender.com

   # Test auth endpoint
   curl https://your-app.onrender.com/auth/login
   ```

---

## Important Notes

### Free Tier Limitations

**Render.com:**
- Spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- 750 hours/month free (enough for 1 app running 24/7)

**MongoDB Atlas:**
- 512 MB storage
- Shared CPU
- No backups on free tier

**Neon.tech:**
- 512 MB storage
- 1 project
- 10 branches
- Sleeps after 5 minutes of inactivity

### Security Recommendations

1. **Change Default Passwords**
   - Update `ADMIN_PASSWORD`, `INSTRUCTOR_PASSWORD`, `LEARNER_PASSWORD`
   - Use strong, unique passwords

2. **Generate Strong JWT Secrets**
   ```bash
   # Generate random secret (Linux/Mac)
   openssl rand -hex 32

   # Or use online generator
   # https://www.random.org/strings/
   ```

3. **Restrict CORS**
   - Update CORS origins in `src/main.ts` to only allow your frontend domain

4. **Enable SSL**
   - Render automatically provides HTTPS
   - Ensure your frontend uses `https://` URLs

### Troubleshooting

**Build Fails:**
- Check Node version (Render uses Node 20 by default)
- Verify all dependencies in `package.json`
- Check build logs for specific errors

**Database Connection Fails:**
- Verify MongoDB Atlas allows access from anywhere (0.0.0.0/0)
- Check Neon.tech connection string is correct
- Ensure SSL is enabled for PostgreSQL in production

**CORS Errors:**
- Add your frontend URL to `FRONTEND_URL` environment variable
- Verify CORS configuration in `src/main.ts`

**Email Not Sending:**
- Verify Gmail App Password is correct (16 characters, no spaces)
- Check MAIL_USER and MAIL_PASSWORD are set
- Ensure 2FA is enabled on Gmail account

---

## Cost Summary

All services are **100% FREE**:
- ✅ Render.com: $0/month (Free tier)
- ✅ MongoDB Atlas: $0/month (512 MB)
- ✅ Neon.tech: $0/month (512 MB)
- ✅ Cloudinary: $0/month (25 GB storage, 25 GB bandwidth)
- ✅ Gmail: $0/month

**Total: $0/month** 🎉

---

## Next Steps

1. Set up your frontend deployment (Vercel/Netlify)
2. Update `FRONTEND_URL` and `CALLBACKURL` environment variables
3. Set up custom domain (optional)
4. Configure monitoring (Render provides basic monitoring)
5. Set up automated backups for databases

---

## Support

If you encounter issues:
1. Check Render logs
2. Verify all environment variables are set
3. Test database connections locally first
4. Check MongoDB Atlas and Neon.tech dashboards for connection issues

Good luck with your deployment! 🚀
