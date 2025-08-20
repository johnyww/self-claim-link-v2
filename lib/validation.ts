/**
 * Input validation and sanitization utilities
 * Provides comprehensive validation for all API endpoints
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`);
    this.name = 'ValidationError';
  }
}

/**
 * Sanitize string input by removing potentially dangerous characters
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (typeof input !== 'string') {
    throw new ValidationError(['Input must be a string']);
  }
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"&]/g, '') // Remove basic XSS characters
    .replace(/\0/g, ''); // Remove null bytes
}

/**
 * Validate and sanitize order ID
 */
export function validateOrderId(orderId: any): ValidationResult {
  const errors: string[] = [];
  
  if (!orderId) {
    errors.push('Order ID is required');
    return { isValid: false, errors };
  }
  
  if (typeof orderId !== 'string') {
    errors.push('Order ID must be a string');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeString(orderId, 50);
  
  if (sanitized.length < 3) {
    errors.push('Order ID must be at least 3 characters long');
  }
  
  if (sanitized.length > 50) {
    errors.push('Order ID must be less than 50 characters');
  }
  
  if (!/^[a-zA-Z0-9\-_]+$/.test(sanitized)) {
    errors.push('Order ID can only contain letters, numbers, hyphens, and underscores');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitized
  };
}

/**
 * Validate admin credentials
 */
export function validateAdminCredentials(data: any): ValidationResult {
  const { username, password } = data;
  const errors: string[] = [];
  let sanitizedData: any = {};
  
  // Validate username
  if (!username) {
    errors.push('Username is required');
  } else if (typeof username !== 'string') {
    errors.push('Username must be a string');
  } else {
    const sanitizedUsername = sanitizeString(username, 50);
    if (sanitizedUsername.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (sanitizedUsername.length > 50) {
      errors.push('Username must be less than 50 characters');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(sanitizedUsername)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }
    sanitizedData.username = sanitizedUsername;
  }
  
  // Validate password (for authentication - only check if provided, no complexity rules)
  if (!password) {
    errors.push('Password is required');
  } else if (typeof password !== 'string') {
    errors.push('Password must be a string');
  } else {
    // For authentication, accept any password that was previously set
    // Password complexity rules are only enforced during password creation/change
    sanitizedData.password = password;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

/**
 * Validate product data
 */
export function validateProductData(data: any): ValidationResult {
  const errors: string[] = [];
  let sanitizedData: any = {};
  
  // Validate name
  if (!data.name) {
    errors.push('Product name is required');
  } else if (typeof data.name !== 'string') {
    errors.push('Product name must be a string');
  } else {
    const sanitizedName = sanitizeString(data.name, 100);
    if (sanitizedName.length < 2) {
      errors.push('Product name must be at least 2 characters long');
    }
    sanitizedData.name = sanitizedName;
  }
  
  // Validate description (optional)
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push('Product description must be a string');
    } else {
      sanitizedData.description = sanitizeString(data.description, 500);
    }
  }
  
  // Validate download_link
  if (!data.download_link) {
    errors.push('Download link is required');
  } else if (typeof data.download_link !== 'string') {
    errors.push('Download link must be a string');
  } else {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(data.download_link)) {
      errors.push('Download link must be a valid HTTP/HTTPS URL');
    }
    if (data.download_link.length > 500) {
      errors.push('Download link must be less than 500 characters');
    }
    sanitizedData.download_link = data.download_link.trim();
  }
  
  // Validate image_url (optional)
  if (data.image_url !== undefined && data.image_url !== null && data.image_url !== '') {
    if (typeof data.image_url !== 'string') {
      errors.push('Image URL must be a string');
    } else {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(data.image_url)) {
        errors.push('Image URL must be a valid HTTP/HTTPS URL');
      }
      if (data.image_url.length > 500) {
        errors.push('Image URL must be less than 500 characters');
      }
      sanitizedData.image_url = data.image_url.trim();
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

/**
 * Validate order creation data
 */
export function validateOrderData(data: any): ValidationResult {
  const errors: string[] = [];
  let sanitizedData: any = {};
  
  // Validate order_id
  const orderIdValidation = validateOrderId(data.order_id);
  if (!orderIdValidation.isValid) {
    errors.push(...orderIdValidation.errors);
  } else {
    sanitizedData.order_id = orderIdValidation.sanitizedData;
  }
  
  // Validate product_ids
  if (!data.product_ids) {
    errors.push('Product IDs are required');
  } else if (!Array.isArray(data.product_ids)) {
    errors.push('Product IDs must be an array');
  } else if (data.product_ids.length === 0) {
    errors.push('At least one product ID is required');
  } else {
    const validProductIds: number[] = [];
    data.product_ids.forEach((id: any, index: number) => {
      if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
        errors.push(`Product ID at index ${index} must be a positive integer`);
      } else {
        validProductIds.push(id);
      }
    });
    sanitizedData.product_ids = validProductIds;
  }
  
  // Validate expiration_days
  if (data.expiration_days !== undefined) {
    if (typeof data.expiration_days !== 'number' || !Number.isInteger(data.expiration_days)) {
      errors.push('Expiration days must be an integer');
    } else if (data.expiration_days < 1 || data.expiration_days > 365) {
      errors.push('Expiration days must be between 1 and 365');
    } else {
      sanitizedData.expiration_days = data.expiration_days;
    }
  }
  
  // Validate one_time_use
  if (data.one_time_use !== undefined) {
    if (typeof data.one_time_use !== 'boolean') {
      errors.push('One-time use must be a boolean');
    } else {
      sanitizedData.one_time_use = data.one_time_use;
    }
  }
  
  // Validate created_by (optional)
  if (data.created_by !== undefined && data.created_by !== null) {
    if (typeof data.created_by !== 'string') {
      errors.push('Created by must be a string');
    } else {
      sanitizedData.created_by = sanitizeString(data.created_by, 50);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

/**
 * Validate settings data
 */
export function validateSettingsData(data: any): ValidationResult {
  const errors: string[] = [];
  let sanitizedData: any = {};
  
  if (!data || typeof data !== 'object') {
    errors.push('Settings data must be an object');
    return { isValid: false, errors };
  }
  
  // Validate each setting
  Object.keys(data).forEach(key => {
    const sanitizedKey = sanitizeString(key, 50);
    const value = data[key];
    
    if (!/^[a-zA-Z0-9_]+$/.test(sanitizedKey)) {
      errors.push(`Setting key "${key}" can only contain letters, numbers, and underscores`);
      return;
    }
    
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      errors.push(`Setting value for "${key}" must be a string, number, or boolean`);
      return;
    }
    
    if (typeof value === 'string') {
      sanitizedData[sanitizedKey] = sanitizeString(value, 100);
    } else {
      sanitizedData[sanitizedKey] = value;
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

/**
 * Middleware function to validate request body
 */
export function validateRequest(validationFn: (data: any) => ValidationResult) {
  return (data: any) => {
    const result = validationFn(data);
    if (!result.isValid) {
      throw new ValidationError(result.errors);
    }
    return result.sanitizedData;
  };
}
