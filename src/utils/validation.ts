export interface ValidationRule<T = any> {
  validate: (value: T) => boolean;
  message: string;
}

export interface FormErrors {
  [key: string]: string;
}

// Email validation
export const emailValidation: ValidationRule<string> = {
  validate: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },
  message: 'Please enter a valid email address'
};

// Password validation
export const passwordValidation: ValidationRule<string> = {
  validate: (password: string) => password.length >= 8,
  message: 'Password must be at least 8 characters long'
};

// Required field validation
export const requiredValidation: ValidationRule<any> = {
  validate: (value: any) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  },
  message: 'This field is required'
};

// Username validation
export const usernameValidation: ValidationRule<string> = {
  validate: (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return usernameRegex.test(username.trim());
  },
  message: 'Username must be 3-20 characters and contain only letters, numbers, hyphens, and underscores'
};

// Port number validation
export const portValidation: ValidationRule<number> = {
  validate: (port: number) => Number.isInteger(port) && port >= 1 && port <= 65535,
  message: 'Port must be between 1 and 65535'
};

// Positive number validation
export const positiveNumberValidation: ValidationRule<number> = {
  validate: (value: number) => Number.isFinite(value) && value > 0,
  message: 'Value must be a positive number'
};

// URL validation
export const urlValidation: ValidationRule<string> = {
  validate: (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  message: 'Please enter a valid URL'
};

// Generic validator function
export function validateField<T>(value: T, rules: ValidationRule<T>[]): string | null {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }
  return null;
}

// Validate entire form
export function validateForm<T extends Record<string, any>>(
  data: T,
  validationSchema: Record<keyof T, ValidationRule<any>[]>
): FormErrors {
  const errors: FormErrors = {};
  
  for (const [field, rules] of Object.entries(validationSchema)) {
    const error = validateField(data[field], rules as ValidationRule<any>[]);
    if (error) {
      errors[field] = error;
    }
  }
  
  return errors;
}

// Sanitize input (basic XSS protection)
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

// Validate and sanitize form data
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    }
  }
  
  return sanitized;
}