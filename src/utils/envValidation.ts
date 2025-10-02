// Environment variable validation utilities

interface EnvValidationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url';
  defaultValue?: string;
  validator?: (value: string) => boolean;
  description: string;
}

const ENV_RULES: EnvValidationRule[] = [
  // SQLite-based app doesn't require Supabase environment variables
  // {
  //   key: 'VITE_SUPABASE_URL',
  //   required: true,
  //   type: 'url',
  //   description: 'Supabase project URL',
  //   validator: (value) => value.includes('supabase.co') || value.includes('localhost'),
  // },
  // {
  //   key: 'VITE_SUPABASE_ANON_KEY',
  //   required: true,
  //   type: 'string',
  //   description: 'Supabase anonymous key',
  //   validator: (value) => value.length > 100, // JWT tokens are long
  // },
  {
    key: 'VITE_API_BASE_URL',
    required: false,
    type: 'url',
    defaultValue: 'http://localhost:3001',
    description: 'Backend API base URL',
  },
  {
    key: 'VITE_WS_URL',
    required: false,
    type: 'url',
    defaultValue: 'ws://localhost:3001',
    description: 'WebSocket server URL',
    validator: (value) => value.startsWith('ws://') || value.startsWith('wss://'),
  },
  {
    key: 'VITE_APP_NAME',
    required: false,
    type: 'string',
    defaultValue: 'ShimmyServe',
    description: 'Application name',
  },
  {
    key: 'VITE_APP_VERSION',
    required: false,
    type: 'string',
    defaultValue: '1.0.0',
    description: 'Application version',
  },
  {
    key: 'VITE_ENVIRONMENT',
    required: false,
    type: 'string',
    defaultValue: 'development',
    description: 'Environment name',
    validator: (value) => ['development', 'staging', 'production'].includes(value),
  },
  {
    key: 'VITE_DEBUG_MODE',
    required: false,
    type: 'boolean',
    defaultValue: 'false',
    description: 'Enable debug mode',
  },
  {
    key: 'VITE_ENABLE_ANALYTICS',
    required: false,
    type: 'boolean',
    defaultValue: 'false',
    description: 'Enable analytics tracking',
  },
];

interface ValidationError {
  key: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validatedEnv: Record<string, string>;
}

function validateType(value: string, type: EnvValidationRule['type']): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string' && value.length > 0;
    case 'number':
      return !isNaN(Number(value));
    case 'boolean':
      return ['true', 'false', '1', '0'].includes(value.toLowerCase());
    case 'url':
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    default:
      return true;
  }
}

function convertValue(value: string, type: EnvValidationRule['type']): string {
  switch (type) {
    case 'boolean':
      return ['true', '1'].includes(value.toLowerCase()) ? 'true' : 'false';
    case 'number':
      return String(Number(value));
    default:
      return value;
  }
}

export function validateEnvironment(): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const validatedEnv: Record<string, string> = {};

  for (const rule of ENV_RULES) {
    const value = import.meta.env[rule.key];
    
    // Check if required variable is missing
    if (rule.required && (!value || value.trim() === '')) {
      errors.push({
        key: rule.key,
        message: `Required environment variable ${rule.key} is missing or empty`,
        severity: 'error',
      });
      continue;
    }

    // Use default value if not provided
    const finalValue = value || rule.defaultValue || '';
    
    if (finalValue) {
      // Validate type
      if (!validateType(finalValue, rule.type)) {
        errors.push({
          key: rule.key,
          message: `Environment variable ${rule.key} has invalid type. Expected ${rule.type}, got: ${finalValue}`,
          severity: 'error',
        });
        continue;
      }

      // Run custom validator
      if (rule.validator && !rule.validator(finalValue)) {
        errors.push({
          key: rule.key,
          message: `Environment variable ${rule.key} failed validation: ${finalValue}`,
          severity: 'error',
        });
        continue;
      }

      // Convert and store value
      validatedEnv[rule.key] = convertValue(finalValue, rule.type);
    } else if (!rule.required) {
      warnings.push({
        key: rule.key,
        message: `Optional environment variable ${rule.key} is not set`,
        severity: 'warning',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validatedEnv,
  };
}

export function getRequiredEnvVars(): string[] {
  return ENV_RULES.filter(rule => rule.required).map(rule => rule.key);
}

export function getEnvVarDescription(key: string): string | undefined {
  return ENV_RULES.find(rule => rule.key === key)?.description;
}

export function initializeEnvironment(): void {
  const result = validateEnvironment();
  
  if (!result.isValid) {
    console.error('Environment validation failed:');
    result.errors.forEach(error => {
      console.error(`❌ ${error.message}`);
    });
    
    if (result.errors.some(e => e.severity === 'error')) {
      throw new Error('Critical environment variables are missing or invalid');
    }
  }

  if (result.warnings.length > 0) {
    console.warn('Environment validation warnings:');
    result.warnings.forEach(warning => {
      console.warn(`⚠️ ${warning.message}`);
    });
  }

  console.log('✅ Environment validation passed');
}