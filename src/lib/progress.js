export function calculateProgress(goal, achievedValue) {
  if (!goal || achievedValue === undefined || achievedValue === null) return 0;
  const { uom, uomDirection, target } = goal;

  if (uom === 'Zero') {
    return achievedValue === 0 ? 100 : Math.max(0, 100 - (achievedValue * 20));
  }

  if (uom === 'Timeline') {
    const targetDate = new Date(target).getTime();
    const achievedDate = new Date(achievedValue).getTime();
    const now = Date.now();
    if (achievedDate <= targetDate) return 100;
    const overdue = achievedDate - targetDate;
    const totalWindow = targetDate - now;
    if (totalWindow <= 0) return achievedDate <= targetDate ? 100 : 50;
    return Math.max(0, Math.round(100 - (overdue / totalWindow) * 100));
  }

  if (uomDirection === 'Max') {
    if (achievedValue <= 0) return 100;
    const progress = (target / achievedValue) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  // Min (default) — higher is better
  if (target <= 0) return achievedValue > 0 ? 100 : 0;
  const progress = (achievedValue / target) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}
