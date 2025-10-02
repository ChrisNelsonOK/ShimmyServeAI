# ShimmyServeAI Project Overview

## Purpose
ShimmyServeAI is a comprehensive, next-generation web GUI for the Shimmy Rust-based LLM inferencing server. It provides a beautiful dark-themed interface with advanced monitoring, management, and AI-assisted operations including real-time dashboard, AI terminal console, advanced logging, and server configuration.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom dark theme (crimson accents)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with role-based access control
- **Deployment**: Docker + Nginx for production
- **Testing**: Vitest with 371 tests implemented
- **Build System**: Vite with hot reload development

## Key Features
- Real-time dashboard with system metrics
- AI Terminal Console with Shimmer AI agent integration
- MCP Server management (Model Context Protocol)
- Advanced logging with real-time streaming
- Knowledge base with search and tagging
- User administration with role-based access
- MPTCP network configuration and monitoring
- Security management with API keys and access control
- Performance monitoring and optimization
- Production-ready testing framework

## Architecture
Single Page Application (SPA) with component-based architecture:
- Components organized by feature in `src/components/`
- TypeScript strict mode enforced
- Real-time data via Supabase subscriptions
- WebSocket communication with Shimmy server
- REST API for configuration and control operations