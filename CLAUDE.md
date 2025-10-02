# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start Vite development server with hot reload
- `npm run build` - Create production build in `dist/`
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint code quality checks
- `npm run typecheck` - Validate TypeScript types

### Testing
- Use the built-in Test Runner component in the web interface (accessible via navigation)
- 371 tests are implemented and passing across all modules
- Tests cover authentication, UI components, database operations, and real-time features

## Architecture Overview

ShimmyServeAI is a React + TypeScript SPA that serves as a GUI for the Shimmy Rust-based LLM inference server. The application uses Supabase for database, authentication, and real-time features.

### Key Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom dark theme (crimson accents)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with role-based access control
- **Deployment**: Docker + Nginx for production

### Component Structure
Components are organized by feature in `src/components/`:
- `Auth/` - Authentication layouts and flows
- `Dashboard/` - Real-time system metrics with charts
- `Terminal/` - Interactive console with Shimmer AI integration
- `MCP/` - Model Context Protocol server management
- `Logs/` - Real-time log streaming with advanced filtering
- `Knowledge/` - Document management with search and tagging
- `Users/` - User administration (admin-only)
- `Network/` - MPTCP configuration and monitoring
- `Monitoring/` - Performance insights and system alerts
- `Security/` - API keys, security events, access control
- `Settings/` - Server configuration management
- `Testing/` - Production test framework
- `Common/` - Reusable UI components
- `Layout/` - Navigation and layout components

### Database Schema
Core Supabase tables:
- `shimmy_users` - User management with RLS policies
- `shimmy_logs` - System logging with filtering capabilities
- `shimmy_knowledge` - Knowledge base with full-text search
- `shimmy_metrics` - Real-time system performance data

## Integration Points

### Shimmy Server Communication
- **WebSocket**: Real-time metrics, logging, and live updates
- **REST API**: Configuration, user management, control operations
- Server connection details configured via Settings panel

### Supabase Integration
- Authentication handled automatically via `src/lib/supabase.ts`
- Real-time subscriptions for live data updates
- Row Level Security enforces access control
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Development Guidelines

### Code Organization
- Follow feature-based component structure
- TypeScript strict mode is enforced
- Use camelCase for variables, PascalCase for React components
- Error boundaries implemented for robust error handling
- Consistent dark theme with crimson accents throughout UI

### State Management
- React hooks for local state
- Supabase real-time subscriptions for live data
- Custom hooks in `src/hooks/` for reusable logic
- TypeScript interfaces in `src/types/` for type safety

### Styling Patterns
- Tailwind CSS utility classes
- Dark theme with `bg-gray-900` backgrounds
- Crimson accent colors (`text-red-400`, `bg-red-600`)
- Glass-morphism effects with backdrop blur
- Responsive design with mobile-first approach

### Security Considerations
- All database operations respect Row Level Security
- Role-based access control (admin/user/viewer roles)
- XSS prevention through proper React practices
- Secure authentication flow via Supabase Auth

## Project Development Rules

**⚠️ CRITICAL: The following 12 immutable project rules MUST be followed by ALL developers and AI agents:**

1. **FOUNDATION FEATURES**: Never change foundational features without explicit user acknowledgement
2. **PRODUCTION QUALITY**: Always use latest libraries; never skip, shortcut, or "dumb down" tasks
3. **COMPLETE REFACTORING**: Remove ALL mocks, simulated logic, and placeholder implementations
4. **CODEBASE STREAMLINING**: Minimize sprawl; remove unnecessary files, duplicates, backups
5. **TOKEN LIMIT STRATEGY**: Use efficient strategies but ensure streamlined final codebase
6. **CLARIFICATION OVER ASSUMPTION**: Always clarify uncertainties rather than assuming
7. **EFFICIENT WORKFLOW**: Work in most efficient order; use all tools and parallelism available
8. **VISUAL TASK TRACKING**: Maintain current CURRENT_TASKS.md with visually appealing progress
9. **DOCUMENTATION CONSISTENCY**: Update all documentation for seamless agent transitions
10. **RULE EVOLUTION**: Add new rules as they arise; this document must evolve
11. **100% GOAL COMPLETION**: Complete everything first time; no false completion claims
12. **NEXT-GEN INNOVATION**: Target bleeding-edge GUI while maintaining production stability

## Current Status
- Application requires comprehensive E2E testing and validation
- Production readiness assessment in progress
- No completion claims until fully vetted

## Common Development Patterns

### Adding New Features
1. Create component in appropriate `src/components/` subdirectory
2. Add TypeScript interfaces to `src/types/`
3. Implement database operations following existing RLS patterns
4. Add tests using the built-in Test Runner
5. Follow dark theme styling conventions

### Database Operations
- Use Supabase client from `src/lib/supabase.ts`
- Respect existing RLS policies
- Implement real-time subscriptions for live data
- Follow established error handling patterns

### UI Components
- Extend existing Common components when possible
- Maintain crimson dark theme consistency
- Implement proper loading states and error boundaries
- Ensure responsive design across all breakpoints