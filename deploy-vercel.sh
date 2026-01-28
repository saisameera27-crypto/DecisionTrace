#!/bin/bash
# Vercel Deployment Script for Decision Trace

echo "🚀 Deploying Decision Trace to Vercel..."

# Check if vercel is available
if ! command -v vercel &> /dev/null; then
    echo "📦 Vercel CLI not found. Using npx..."
    VERCEL_CMD="npx vercel"
else
    echo "✅ Vercel CLI found"
    VERCEL_CMD="vercel"
fi

# Login (if needed)
echo "🔐 Checking Vercel authentication..."
$VERCEL_CMD whoami || $VERCEL_CMD login

# Deploy to production
echo "🚀 Deploying to production..."
$VERCEL_CMD --prod

echo "✅ Deployment complete!"
