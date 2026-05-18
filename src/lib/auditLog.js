import AuditLog from '@/models/AuditLog';
import { getClientIp, parseUserAgent } from '@/lib/requestInfo';

/**
 * Creates an AuditLog entry, automatically extracting IP and browser
 * info from the Next.js request object when provided.
 *
 * @param {object} data - AuditLog fields (entityType, entityId, action, changedBy, changedByName, description, etc.)
 * @param {Request|null} request - Next.js request (optional). When provided, IP and browser are extracted automatically.
 */
export async function createAuditLog(data, request = null) {
  let ip = '';
  let browser = '';
  let device = '';
  let userAgent = '';

  if (request) {
    ip = getClientIp(request);
    userAgent = request.headers.get('user-agent') || '';
    const parsed = parseUserAgent(userAgent);
    browser = parsed.browser;
    device = `${parsed.device} • ${parsed.os}`;
  }

  return AuditLog.create({
    ip,
    userAgent,
    browser,
    device,
    ...data, // caller fields can still override if needed
  });
}
