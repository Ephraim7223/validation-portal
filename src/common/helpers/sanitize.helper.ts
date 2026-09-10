import { Types } from 'mongoose';

const SENSITIVE_KEYS = new Set([
  'password',
  'otp',
  'otpCreatedAt',
  'secretToken',
  '__v',
]);

function isObjectIdLike(value: object): boolean {
  if (value instanceof Types.ObjectId) return true;

  const ctor = value.constructor?.name;
  if (ctor === 'ObjectId' || ctor === 'ObjectID') return true;

  if (typeof (value as { toHexString?: unknown }).toHexString === 'function') {
    return true;
  }

  // Already-broken shape from spreading an ObjectId: { buffer: { 0: n, ... } }
  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === 'buffer') {
    const buffer = (value as { buffer: unknown }).buffer;
    if (Buffer.isBuffer(buffer)) return true;
    if (buffer && typeof buffer === 'object') {
      return Object.keys(buffer as object).length === 12;
    }
  }

  return false;
}

function objectIdToString(value: object): string {
  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  const withHex = value as {
    toHexString?: () => string;
    toString?: () => string;
  };
  if (typeof withHex.toHexString === 'function') {
    return withHex.toHexString();
  }

  const bufferLike = (value as { buffer?: Record<string, number> | Buffer })
    .buffer;
  if (bufferLike) {
    const bytes = Buffer.isBuffer(bufferLike)
      ? bufferLike
      : Buffer.from(
          Array.from({ length: 12 }, (_, i) => Number(bufferLike[i] ?? 0)),
        );
    return new Types.ObjectId(bytes).toHexString();
  }

  return String(withHex.toString?.() ?? value);
}

/**
 * Strips sensitive fields from documents/objects before API responses.
 * Preserves response envelope shape; only removes secret fields inside data.
 * Converts ObjectIds to hex strings so clients never receive buffer payloads.
 */
export function sanitizeDocument<T = unknown>(value: T): T {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDocument(item)) as T;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value !== 'object') return value;

  if (isObjectIdLike(value)) {
    return objectIdToString(value) as T;
  }

  // Mongoose document → plain object (ObjectIds stay as ObjectId instances)
  const maybeDoc = value as {
    toObject?: (opts?: object) => Record<string, unknown>;
  };
  const plain =
    typeof maybeDoc.toObject === 'function'
      ? maybeDoc.toObject({ flattenMaps: true })
      : (value as Record<string, unknown>);

  // Avoid treating Map / other special objects as plain records incorrectly
  if (Object.prototype.toString.call(plain) !== '[object Object]') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(plain)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    sanitized[key] = sanitizeDocument(val);
  }

  return sanitized as T;
}

export const SENSITIVE_SELECT_EXCLUDE =
  '-password -otp -otpCreatedAt -secretToken';
