# ShimmyServeAI Code Style and Conventions

## Naming Conventions
- **Variables**: camelCase (e.g., `serverStatus`, `activeConnections`)
- **React Components**: PascalCase (e.g., `MCPServer`, `Dashboard`)
- **Files**: PascalCase for components (e.g., `MCPServer.tsx`)
- **Directories**: PascalCase for component directories (e.g., `MCP/`, `Dashboard/`)
- **Constants**: UPPER_SNAKE_CASE for environment variables (e.g., `VITE_ENABLE_MCP_SERVER`)

## TypeScript Guidelines
- Strict mode enabled (`tsconfig.json`)
- Explicit interface definitions for props and state
- Type definitions in `src/types/` directory
- No `any` types - use proper typing
- Optional chaining and nullish coalescing preferred

## Component Structure
- Feature-based organization in `src/components/`
- Each feature has its own directory (e.g., `MCP/`, `Auth/`, `Dashboard/`)
- Index files for clean imports
- Separation of concerns: UI components vs business logic

## Styling Patterns
- **Tailwind CSS** utility classes exclusively
- **Dark theme** as primary: `bg-gray-900`, `bg-dark-950`
- **Crimson accents**: `text-red-400`, `bg-red-600`, `bg-crimson-500`
- **Glass-morphism effects**: `backdrop-blur-sm`, `bg-dark-950/95`
- **Responsive design**: Mobile-first with `md:`, `lg:` prefixes
- **Consistent spacing**: `space-x-4`, `space-y-6`, `p-6`, `m-4`

## Code Organization
- Custom hooks in `src/hooks/`
- Utilities in `src/utils/`
- Types in `src/types/`
- Supabase client in `src/lib/supabase.ts`
- Components grouped by feature/domain

## React Patterns
- Functional components with hooks
- Custom hooks for reusable logic
- Error boundaries for robust error handling
- Proper state management with useState/useEffect
- Real-time subscriptions via Supabase

## Security Considerations
- Row Level Security (RLS) for all database operations
- Role-based access control (admin/user/viewer)
- XSS prevention through proper React practices
- Secure authentication via Supabase Auth