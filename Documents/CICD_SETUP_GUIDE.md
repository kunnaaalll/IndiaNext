# CI/CD Setup Guide

## Overview

This document describes the complete CI/CD pipeline for the IndiaNext Hackathon platform, including automated testing, linting, security scanning, and deployment strategies.

---

## 🏗️ Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Push/PR                          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌──────────────┐
│  Lint & Type  │         │   Security   │
│     Check     │         │     Scan     │
└───────┬───────┘         └──────┬───────┘
        │                        │
        └────────────┬───────────┘
                     │
                     ▼
            ┌────────────────┐
            │  Tests &       │
            │  Coverage      │
            └────────┬───────┘
                     │
                     ▼
            ┌────────────────┐
            │     Build      │
            └────────┬───────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌──────────────┐
│   Deploy to   │         │  Deploy to   │
│    Staging    │         │  Production  │
│   (develop)   │         │    (main)    │
└───────┬───────┘         └──────┬───────┘
        │                        │
        └────────────┬───────────┘
                     │
                     ▼
            ┌────────────────┐
            │ Health Check   │
            └────────────────┘
```

---

## 📋 Workflows

### 1. Main CI/CD Pipeline (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**

#### Lint, Format & Type Check
- ✅ Prettier formatting check
- ✅ ESLint code quality
- ✅ TypeScript type checking

#### Security Scan
- ✅ npm audit for vulnerabilities
- ✅ Snyk security scanning
- ✅ Dependency vulnerability checks

#### Tests & Coverage
- ✅ Unit tests
- ✅ Integration tests
- ✅ Coverage reporting (Codecov)
- ✅ Coverage badges
- ✅ PR comments with coverage

#### Build & Validate
- ✅ Next.js production build
- ✅ Build size analysis
- ✅ Artifact upload

#### Deploy to Staging
- ✅ Automatic deployment on `develop` branch
- ✅ Preview URL generation
- ✅ PR comments with staging link

#### Deploy to Production
- ✅ Automatic deployment on `main` branch
- ✅ Database migrations
- ✅ Deployment notifications

#### Health Check
- ✅ Post-deployment health verification
- ✅ Smoke tests
- ✅ Critical path validation

### 2. Code Quality Workflow (`.github/workflows/code-quality.yml`)

**Triggers:**
- Pull requests only

**Checks:**
- Code complexity analysis
- Duplicate code detection
- Bundle size analysis
- Quality report in PR comments

### 3. Dependabot (`.github/dependabot.yml`)

**Features:**
- Weekly dependency updates
- Grouped updates by type
- Automatic PR creation
- Security vulnerability patches

---

## 🔧 Setup Instructions

### 1. GitHub Secrets Configuration

Add these secrets to your GitHub repository:

```bash
# Vercel Deployment
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<your-project-id>

# Database
DATABASE_URL=<your-production-database-url>

# Code Coverage
CODECOV_TOKEN=<your-codecov-token>

# Security Scanning (Optional)
SNYK_TOKEN=<your-snyk-token>
```

#### How to Get Secrets:

**Vercel:**
1. Go to https://vercel.com/account/tokens
2. Create a new token
3. Get Org ID and Project ID from project settings

**Codecov:**
1. Go to https://codecov.io
2. Connect your repository
3. Copy the upload token

**Snyk:**
1. Go to https://snyk.io
2. Create account and get API token

### 2. Enable GitHub Actions

1. Go to repository Settings → Actions → General
2. Enable "Allow all actions and reusable workflows"
3. Enable "Read and write permissions" for GITHUB_TOKEN

### 3. Configure Branch Protection

**For `main` branch:**
- Require pull request reviews (1 reviewer)
- Require status checks to pass:
  - `lint`
  - `security`
  - `test`
  - `build`
- Require branches to be up to date
- Require conversation resolution

**For `develop` branch:**
- Require status checks to pass:
  - `lint`
  - `test`
  - `build`

### 4. Install Pre-commit Hooks

```bash
# Install Husky
npm install -D husky

# Initialize Husky
npx husky install

# Make pre-commit hook executable (Unix/Mac)
chmod +x .husky/pre-commit

# Windows: No action needed
```

---

## 🚀 Deployment Strategies

### Current: Automatic Deployment

- **Staging:** Auto-deploy on push to `develop`
- **Production:** Auto-deploy on push to `main`

### Alternative: Manual Approval

Update `.github/workflows/ci.yml`:

```yaml
deploy-production:
  environment:
    name: production
    url: https://your-domain.com
  # Requires manual approval in GitHub
```

### Blue-Green Deployment

For zero-downtime deployments:

```yaml
- name: Deploy Blue Environment
  run: vercel deploy --prod --alias blue.your-domain.com

- name: Run Health Checks
  run: curl -f https://blue.your-domain.com/api/health

- name: Switch Traffic to Blue
  run: vercel alias blue.your-domain.com your-domain.com
```

### Canary Deployment

Gradual rollout to production:

```yaml
- name: Deploy Canary (10% traffic)
  run: vercel deploy --prod --alias canary.your-domain.com

- name: Monitor Metrics
  run: ./scripts/monitor-canary.sh

- name: Promote to 100%
  if: success()
  run: vercel alias canary.your-domain.com your-domain.com
```

---

## 📊 Monitoring & Alerts

### Health Check Endpoint

```bash
# Check application health
curl https://your-domain.com/api/health

# Response:
{
  "status": "healthy",
  "timestamp": "2026-02-28T20:00:00.000Z",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "up", "responseTime": 45 },
    "redis": { "status": "up", "responseTime": 12 },
    "api": { "status": "up", "responseTime": 58 }
  },
  "uptime": 3600
}
```

### Status Codes

- `200` - Healthy or Degraded (non-critical services down)
- `503` - Unhealthy (critical services down)

### Monitoring Tools

**Recommended:**
- **Vercel Analytics** - Built-in performance monitoring
- **Sentry** - Error tracking
- **Uptime Robot** - Uptime monitoring
- **Better Uptime** - Status page

---

## 🧪 Testing Strategy

### Test Coverage Goals

- **Unit Tests:** >80% coverage
- **Integration Tests:** Critical paths covered
- **E2E Tests:** User flows validated

### Running Tests Locally

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm run test tests/api/register.test.ts
```

### Coverage Reports

- Uploaded to Codecov on every PR
- Badge displayed in README
- PR comments show coverage diff

---

## 🔒 Security Best Practices

### 1. Dependency Management

- ✅ Dependabot enabled for automatic updates
- ✅ npm audit runs on every PR
- ✅ Snyk scanning for vulnerabilities

### 2. Secret Management

- ✅ Never commit secrets to repository
- ✅ Use GitHub Secrets for CI/CD
- ✅ Rotate secrets regularly
- ✅ Use different secrets for staging/production

### 3. Code Quality

- ✅ ESLint enforces code standards
- ✅ Prettier enforces formatting
- ✅ TypeScript catches type errors
- ✅ Pre-commit hooks prevent bad commits

---

## 📈 Performance Optimization

### Build Optimization

```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Check for large dependencies
npx depcheck

# Optimize images
# Use next/image component
```

### Caching Strategy

- Redis caching for API responses
- CDN caching for static assets
- Browser caching headers

---

## 🐛 Troubleshooting

### CI/CD Failures

**Build Fails:**
```bash
# Check build locally
npm run build

# Check for type errors
npm run type-check

# Check for lint errors
npm run lint
```

**Tests Fail:**
```bash
# Run tests locally
npm run test

# Check specific test
npm run test -- tests/api/register.test.ts

# Update snapshots if needed
npm run test -- -u
```

**Deployment Fails:**
```bash
# Check Vercel logs
vercel logs <deployment-url>

# Check environment variables
vercel env ls

# Redeploy manually
vercel --prod
```

### Common Issues

**Issue:** "Module not found" in CI
**Solution:** Run `npm ci` instead of `npm install`

**Issue:** Tests pass locally but fail in CI
**Solution:** Check environment variables in test setup

**Issue:** Deployment succeeds but app doesn't work
**Solution:** Check health endpoint and logs

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Documentation](https://vercel.com/docs)
- [Next.js Deployment Best Practices](https://nextjs.org/docs/deployment)
- [Codecov Documentation](https://docs.codecov.com)

---

## 🎯 Checklist

Before going to production:

- [ ] All secrets configured in GitHub
- [ ] Branch protection rules enabled
- [ ] Health check endpoint working
- [ ] Monitoring tools set up
- [ ] Error tracking configured
- [ ] Database backup strategy in place
- [ ] Rollback procedure documented
- [ ] Team trained on deployment process

---

**Last Updated:** February 28, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
