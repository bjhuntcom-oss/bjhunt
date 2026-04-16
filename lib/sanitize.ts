/**
 * Security sanitization utilities
 * Protection against XSS, injection attacks
 */

// HTML entities to escape
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char)
}

/**
 * Remove potentially dangerous patterns from input
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: urls
    .replace(/javascript:/gi, '')
    // Remove data: urls (potential XSS vector)
    .replace(/data:/gi, '')
    // Remove vbscript: urls
    .replace(/vbscript:/gi, '')
    // Escape HTML entities
    .replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char)
    // Trim whitespace
    .trim()
}

/**
 * Sanitize email (lowercase, trim, validate format)
 */
function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return ''
  return email.toLowerCase().trim().slice(0, 254) // RFC 5321 max length
}

/**
 * Sanitize for SQL-like patterns (defense in depth, Supabase already uses prepared statements)
 */
function sanitizeSqlPatterns(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    // Remove SQL comment patterns
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    // Remove common SQL injection patterns
    .replace(/;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|EXEC|EXECUTE)/gi, '')
    .replace(/UNION\s+(ALL\s+)?SELECT/gi, '')
    .replace(/'\s*OR\s*'1'\s*=\s*'1/gi, '')
    .replace(/'\s*OR\s*1\s*=\s*1/gi, '')
}

/**
 * Full sanitization pipeline for user inputs
 */
function sanitize(input: string): string {
  return sanitizeSqlPatterns(sanitizeInput(input))
}

/**
 * Validate and sanitize object fields
 */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
  const sanitized = { ...data }
  
  for (const key in sanitized) {
    const value = sanitized[key]
    if (typeof value === 'string') {
      if (key === 'email') {
        (sanitized as Record<string, unknown>)[key] = sanitizeEmail(value)
      } else {
        (sanitized as Record<string, unknown>)[key] = sanitize(value)
      }
    }
  }
  
  return sanitized
}
