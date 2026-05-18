import dbConnect from '@/lib/db';
import Escalation from '@/models/Escalation';
import AuditLog from '@/models/AuditLog';

/**
 * Mark matching ACTIVE escalations as RESOLVED when the triggering condition
 * is satisfied (goal submitted, goal approved, check-in saved).
 *
 * @param {string} userId   - The user whose escalation should be resolved
 * @param {string} cycleId  - The cycle the escalation belongs to
 * @param {string} type     - 'GOAL_SUBMISSION' | 'GOAL_APPROVAL' | 'CHECKIN_PENDING'
 * @param {string} [quarter] - Required for CHECKIN_PENDING; optional otherwise
 */
export async function resolveEscalations(userId, cycleId, type, quarter = null) {
  try {
    await dbConnect();

    const query = { userId, cycleId, type, status: 'ACTIVE' };
    if (quarter) query.quarter = quarter;

    const updated = await Escalation.updateMany(query, {
      $set: { status: 'RESOLVED', resolvedAt: new Date() },
    });

    if (updated.modifiedCount > 0) {
      await AuditLog.create({
        entityType: 'Escalation',
        entityId: userId,          // best proxy we have without querying escalation ids
        action: 'escalation_resolved',
        changedBy: userId,
        changedByName: 'System',
        description: `${updated.modifiedCount} ${type} escalation(s) auto-resolved for user ${userId}`,
      });
    }
  } catch (err) {
    // Never throw — resolution failure must not break the primary action
    console.error('[resolveEscalations] Failed:', err?.message || err);
  }
}
