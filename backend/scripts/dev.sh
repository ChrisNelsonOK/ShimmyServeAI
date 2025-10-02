#!/bin/bash

# Backend Development Script
set -e

echo "🚀 Starting ShimmyServe Backend in Development Mode..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✏️  Please edit .env file with your configuration before running again."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create data directory if it doesn't exist
echo "📁 Setting up data directory..."
mkdir -p data/logs

# Start development server with nodemon
echo "🔥 Starting development server with hot reload..."
npx nodemon --exec "npx ts-node src/server.ts" --watch src --ext ts,json