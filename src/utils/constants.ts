// Application Constants
export const APP_NAME = 'ShimmyServe';
export const APP_VERSION = '2.1.0';
export const APP_DESCRIPTION = 'Next-generation AI inference server management';

// API Configuration
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  METRICS: '/api/metrics',
  LOGS: '/api/logs',
  CONFIG: '/api/config',
  USERS: '/api/users',
} as const;

// WebSocket Configuration
export const WS_RECONNECT_INTERVAL = 3000;
export const WS_MAX_RECONNECT_ATTEMPTS = 5;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'shimmy-serve-auth-token',
  USER_PREFERENCES: 'shimmy-serve-user-prefs',
  SIDEBAR_COLLAPSED: 'shimmy-serve-sidebar-collapsed',
  ACTIVE_SECTION: 'shimmy-serve-active-section',
  THEME: 'shimmy-serve-theme',
} as const;

// Validation Constants
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/,
} as const;

// UI Constants
export const UI = {
  SIDEBAR_WIDTH_EXPANDED: 256,
  SIDEBAR_WIDTH_COLLAPSED: 64,
  HEADER_HEIGHT: 64,
  TOAST_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
} as const;

// Performance Thresholds
export const PERFORMANCE = {
  LOADING_TIMEOUT: 10000,
  API_TIMEOUT: 30000,
  WS_TIMEOUT: 5000,
  MAX_LOG_ENTRIES: 1000,
  MAX_METRICS_POINTS: 100,
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_TESTING: true,
  ENABLE_ADVANCED_MONITORING: true,
  ENABLE_REAL_TIME_UPDATES: true,
  ENABLE_EXPORT_FEATURES: true,
  ENABLE_DARK_MODE_ONLY: true,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network connection failed. Please check your internet connection.',
  AUTH_REQUIRED: 'Authentication required. Please sign in.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  VALIDATION_FAILED: 'Please check your input and try again.',
  TIMEOUT: 'The request timed out. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully',
  DELETED: 'Item deleted successfully',
  CREATED: 'Item created successfully',
  UPDATED: 'Item updated successfully',
  EXPORTED: 'Data exported successfully',
} as const;

// System Status
export const SYSTEM_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
  ERROR: 'error',
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

// Log Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

// Test Categories
export const TEST_CATEGORIES = [
  'Authentication',
  'Navigation',
  'Forms',
  'Database',
  'RealTime',
  'UI Components',
  'Performance',
  'Security',
  'Accessibility',
  'Error Handling',
] as const;

export type TestCategory = typeof TEST_CATEGORIES[number];