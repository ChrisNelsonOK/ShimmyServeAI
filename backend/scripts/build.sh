#!/bin/bash

# Backend Build Script
set -e

echo "🏗️  Building ShimmyServe Backend..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Type check
echo "🔍 Type checking..."
npx tsc --noEmit

# Build
echo "🔨 Building TypeScript..."
npx tsc

# Copy package.json to dist for production
echo "📋 Copying package files..."
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || true

# Create data directory if it doesn't exist
echo "📁 Setting up data directory..."
mkdir -p data/logs

echo "✅ Build completed successfully!"
echo "📍 Built files are in: dist/"
echo "🚀 Run with: npm start"