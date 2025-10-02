# Configuration Service Guide

## Overview

The `realConfigService` provides a centralized way to manage server configurations with backend API synchronization and localStorage fallback for offline support.

## Features

- **Backend API Integration**: Communicates with backend endpoints for persistent storage
- **LocalStorage Fallback**: Automatically falls back to localStorage when backend is unavailable
- **Real-time Updates**: Notifies all components of configuration changes via custom events
- **Validation**: Server-side and client-side validation support
- **Export/Import**: Export configurations for backup or sharing
- **Type Safety**: Full TypeScript support with ServerConfig interface

## Usage

### Direct Service Usage

```typescript
import { configService } from '../services/realConfigService';

// Get configuration
const config = await configService.getConfig('server');

// Update configuration
const updatedConfig = await configService.updateConfig('server', newConfig);

// Validate configuration
const validation = await configService.validateConfig('server', config);
if (!validation.valid) {
  console.error('Invalid config:', validation.errors);
}

// Reset to defaults
const defaultConfig = await configService.resetConfig('server');

// Export configuration
const blob = await configService.exportConfig('server');
```

### Using the Hook

```typescript
import { useConfiguration } from '../hooks/useConfiguration';

function MyComponent() {
  const { 
    config, 
    loading, 
    error, 
    saving, 
    saveConfig, 
    resetConfig, 
    exportConfig 
  } = useConfiguration('server');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  const handleSave = async () => {
    const result = await saveConfig(updatedConfig);
    if (result.success) {
      console.log('Config saved!');
    } else {
      console.error('Save failed:', result.error);
    }
  };
  
  return (
    <div>
      {/* Your component UI */}
    </div>
  );
}
```

### Listening for Configuration Changes

```typescript
useEffect(() => {
  const handleConfigUpdate = (event: CustomEvent) => {
    console.log('Config updated:', event.detail.config);
  };
  
  window.addEventListener('shimmy-config-updated', handleConfigUpdate);
  
  return () => {
    window.removeEventListener('shimmy-config-updated', handleConfigUpdate);
  };
}, []);
```

## Backend Endpoints

The service communicates with the following backend endpoints:

- `GET /api/config` - Get all configurations
- `GET /api/config/:type` - Get specific configuration
- `PUT /api/config/:type` - Update configuration
- `PATCH /api/config/:type` - Partial update
- `DELETE /api/config/:type` - Delete configuration
- `POST /api/config/:type/validate` - Validate config
- `GET /api/config/:type/schema` - Get config schema
- `POST /api/config/:type/reset` - Reset to defaults
- `GET /api/config/:type/export` - Export configuration

## Configuration Types

Currently supported configuration type:
- `server` - Main server configuration (general, inference, networking, security)

## Error Handling

The service automatically handles errors and falls back to localStorage when:
- Backend is unavailable
- Network requests fail
- Server returns errors

All methods return appropriate error messages that can be displayed to users.

## Events

The service dispatches the following custom events:
- `shimmy-config-updated` - When configuration is updated
- `shimmy-config-deleted` - When configuration is deleted

Event detail includes:
```typescript
{
  type: string;     // Configuration type (e.g., 'server')
  config?: ServerConfig;  // Updated configuration (for update events)
}
```