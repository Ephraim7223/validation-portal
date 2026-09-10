const SENSITIVE_KEYS = new Set([
  'password',
  'otp',
  'otpCreatedAt',
  'secretToken',
  '__v',
]);

/**
 * Strips sensitive fields from documents/objects before API responses.
 * Preserves response envelope shape; only removes secret fields inside data.
 */
export function sanitizeDocument<T = unknown>(value: T): T {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDocument(item)) as T;
  }

  if (typeof value !== 'object') return value;

  // Mongoose document
  const maybeDoc = value as unknown as { toObject?: () => Record<string, unknown> };
  const plain =
    typeof maybeDoc.toObject === 'function'
      ? maybeDoc.toObject()
      : { ...(value as Record<string, unknown>) };

  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(plain)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    sanitized[key] = sanitizeDocument(val);
  }

  return sanitized as T;
}

export const SENSITIVE_SELECT_EXCLUDE =
  '-password -otp -otpCreatedAt -secretToken';
