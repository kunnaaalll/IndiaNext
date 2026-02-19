# 🚀 IndiaNext - Complete Setup Guide

This guide will walk you through setting up the IndiaNext hackathon platform from scratch.

## 📋 Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- Git installed
- A code editor (VS Code recommended)

## 🔧 Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/kunnaaalll/IndiaNext.git
cd IndiaNext

# Install dependencies
npm install

# Or with yarn
yarn install
```

## 🗄️ Step 2: Database Setup (Neon PostgreSQL)

### Why Neon?
- **Free tier**: 0.5 GB storage, 10 GB data transfer/month
- **Serverless**: Auto-scales, no maintenance
- **Fast**: Built on PostgreSQL with instant branching

### Setup Instructions:

1. **Sign up for Neon**
   - Go to [https://neon.tech](https://neon.tech)
   - Click "Sign Up" (free, no credit card required)
   - Sign in with GitHub/Google

2. **Create a New Project**
   - Click "New Project"
   - Name: `indianext` (or your preferred name)
   - Region: Choose closest to your users (e.g., `US East (Ohio)` or `Asia Pacific (Mumbai)`)
   - PostgreSQL version: 16 (latest)
   - Click "Create Project"

3. **Get Connection String**
   - After project creation, you'll see the connection string
   - Copy the **Connection string** (starts with `postgresql://`)
   - It looks like: `postgresql://user:password@ep-xxx-xxx.neon.tech/indianext?sslmode=require`

4. **Add to Environment Variables**
   ```bash
   # Create .env file
   cp .env.example .env
   ```
   
   Edit `.env` and add:
   ```env
   DATABASE_URL="postgresql://user:password@ep-xxx-xxx.neon.tech/indianext?sslmode=require"
   ```

5. **Run Database Migrations**
   ```bash
   # Generate Prisma Client
   npx prisma generate
   
   # Push schema to database
   npx prisma db push
   
   # (Optional) Open Prisma Studio to view data
   npx prisma studio
   ```

## 🔴 Step 3: Redis Setup (Upstash)

### Why Upstash?
- **Free tier**: 10,000 commands/day
- **Serverless**: Pay per request
- **Global**: Low latency worldwide

### Setup Instructions:

1. **Sign up for Upstash**
   - Go to [https://upstash.com](https://upstash.com)
   - Click "Sign Up" (free)
   - Sign in with GitHub/Google

2. **Create Redis Database**
   - Click "Create Database"
   - Name: `indianext-cache`
   - Type: **Regional** (cheaper) or **Global** (faster)
   - Region: Choose closest to your Neon database
   - Click "Create"

3. **Get Credentials**
   - After creation, go to database details
   - Scroll to **REST API** section
   - Copy:
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`

4. **Add to Environment Variables**
   ```env
   UPSTASH_REDIS_URL="https://xxx-xxx.upstash.io"
   UPSTASH_REDIS_TOKEN="AXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

## 📁 Step 4: File Storage Setup (Cloudinary)

### Why Cloudinary?
- **Free tier**: 25 GB storage, 25 GB bandwidth/month
- **Image optimization**: Automatic resizing, compression
- **CDN**: Fast delivery worldwide

### Setup Instructions:

1. **Sign up for Cloudinary**
   - Go to [https://cloudinary.com](https://cloudinary.com)
   - Click "Sign Up Free"
   - Fill in details (no credit card required)

2. **Get Credentials**
   - After signup, you'll be on the Dashboard
   - Copy these values:
     - **Cloud Name** (e.g., `dxxxxx`)
     - **API Key** (e.g., `123456789012345`)
     - **API Secret** (click "Reveal" to see it)

3. **Add to Environment Variables**
   ```env
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="123456789012345"
   CLOUDINARY_API_SECRET="abcdefghijklmnopqrstuvwxyz123456"
   ```

## 📧 Step 5: Email Service Setup (Resend)

### Why Resend?
- **Free tier**: 3,000 emails/month, 100 emails/day
- **Developer-friendly**: Simple API
- **Reliable**: High deliverability

### Setup Instructions:

1. **Sign up for Resend**
   - Go to [https://resend.com](https://resend.com)
   - Click "Start Building"
   - Sign up with email or GitHub

2. **Verify Domain (Optional but Recommended)**
   - Go to "Domains" in sidebar
   - Click "Add Domain"
   - Enter your domain (e.g., `indianext.com`)
   - Add DNS records as shown
   - Wait for verification (5-10 minutes)
   
   **For Testing**: You can skip this and use `onboarding@resend.dev` as sender

3. **Create API Key**
   - Go to "API Keys" in sidebar
   - Click "Create API Key"
   - Name: `IndiaNext Production`
   - Permission: **Full Access**
   - Click "Create"
   - Copy the API key (starts with `re_`)

4. **Add to Environment Variables**
   ```env
   RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

5. **Update Email Configuration**
   Edit `lib/email.ts` if you verified a domain:
   ```typescript
   from: 'IndiaNext <noreply@yourdomain.com>', // Change this
   ```

## 🌐 Step 6: Application Configuration

Add these to your `.env` file:

```env
# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Environment
NODE_ENV="development"
```

For production:
```env
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"
```

## ✅ Step 7: Verify Setup

Run the verification script:

```bash
npm run verify
```

This will check:
- ✅ All environment variables are set
- ✅ Database connection works
- ✅ Redis connection works
- ✅ Cloudinary credentials are valid
- ✅ Resend API key is valid

## 🚀 Step 8: Start Development Server

```bash
# Start the development server
npm run dev

# Or with Turbopack (faster)
npm run dev -- --turbo
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Step 9: Test the Application

### Test Registration Flow:

1. **Go to Registration Page**
   - Navigate to `/register`

2. **Fill in Team Details**
   - Choose track (IdeaSprint or BuildStorm)
   - Enter team information
   - Enter leader email

3. **Test OTP Flow**
   - Click "Send OTP"
   - Check console for OTP (in development mode)
   - Or check your email inbox
   - Enter OTP and verify

4. **Complete Registration**
   - Fill in remaining details
   - Submit form
   - Check database in Prisma Studio

### Test Admin Panel:

1. **Create Admin User**
   ```bash
   # Open Prisma Studio
   npx prisma studio
   ```
   
   - Go to `User` table
   - Create a new user with `role: ADMIN`
   - Note the email

2. **Access Admin Panel**
   - Go to `/admin`
   - Login with admin credentials
   - View dashboard, teams, etc.

## 📊 Step 10: Database Management

### View Data:
```bash
# Open Prisma Studio (GUI for database)
npx prisma studio
```

### Reset Database:
```bash
# WARNING: This deletes all data!
npx prisma db push --force-reset
```

### Create Migration:
```bash
# After schema changes
npx prisma migrate dev --name your_migration_name
```

### Seed Database (Optional):
```bash
# Create seed file first: prisma/seed.ts
npm run db:seed
```

## 🔒 Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Use `.env.example` as template

2. **Rotate API Keys Regularly**
   - Especially after team members leave
   - Use different keys for dev/staging/production

3. **Use Environment-Specific Keys**
   - Development: Test keys
   - Production: Production keys with restricted permissions

4. **Enable 2FA**
   - Enable on all service accounts (Neon, Upstash, etc.)

## 🚢 Deployment

### Deploy to Vercel:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial setup"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Click "Import"

3. **Add Environment Variables**
   - In Vercel dashboard, go to "Settings" → "Environment Variables"
   - Add all variables from your `.env` file
   - Click "Deploy"

4. **Update Application URL**
   - After deployment, copy your Vercel URL
   - Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables
   - Redeploy

### Deploy to Other Platforms:

- **Netlify**: Similar to Vercel
- **Railway**: Supports PostgreSQL + Next.js
- **Render**: Free tier available
- **AWS/GCP/Azure**: More complex but scalable

## 🐛 Troubleshooting

### Database Connection Issues:

```bash
# Test connection
npx prisma db pull

# If fails, check:
# 1. DATABASE_URL is correct
# 2. Neon database is running
# 3. IP whitelist (Neon allows all by default)
```

### Redis Connection Issues:

```bash
# Test in code
node -e "
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});
redis.ping().then(console.log);
"
```

### Email Not Sending:

1. Check Resend dashboard for errors
2. Verify API key is correct
3. Check sender email is verified
4. Look at rate limits (100/day on free tier)

### Build Errors:

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## 📚 Additional Resources

- **Prisma Docs**: [https://www.prisma.io/docs](https://www.prisma.io/docs)
- **Next.js Docs**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **tRPC Docs**: [https://trpc.io/docs](https://trpc.io/docs)
- **Neon Docs**: [https://neon.tech/docs](https://neon.tech/docs)
- **Upstash Docs**: [https://docs.upstash.com](https://docs.upstash.com)

## 🆘 Getting Help

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/kunnaaalll/IndiaNext/issues)
2. Read the documentation in `/Documents` folder
3. Check the troubleshooting section above
4. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)

## ✨ Next Steps

After setup is complete:

1. ✅ Customize branding (logo, colors, text)
2. ✅ Configure email templates
3. ✅ Set up monitoring (Sentry, PostHog)
4. ✅ Add custom domain
5. ✅ Configure backups
6. ✅ Set up CI/CD pipeline
7. ✅ Add more features!

---

**Happy Hacking! 🚀**

For questions or support, reach out to the team or check the documentation.
