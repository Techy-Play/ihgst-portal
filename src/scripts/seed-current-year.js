const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const t = line.trim(); if (!t || t.startsWith('#')) return;
    const eq = t.indexOf('='); if (eq > 0) { const k = t.substring(0, eq).trim(), v = t.substring(eq+1).trim(); if (v && !process.env[k]) process.env[k] = v; }
  });
}
if (!process.env.MONGODB_URI) { console.error('No MONGODB_URI'); process.exit(1); }

const S = mongoose.Schema, O = S.Types.ObjectId;
const User = mongoose.model('User', new S({ name: String, email: String, password: String, role: String, department: String, managerId: { type: O, ref: 'User' }, employeeId: String }, { timestamps: true }));
const Cycle = mongoose.model('Cycle', new S({ name: String, goalSettingStart: Date, goalSettingEnd: Date, quarters: [{ label: String, start: Date, end: Date }], isActive: Boolean, createdBy: { type: O } }, { timestamps: true }));
const GoalSheet = mongoose.model('GoalSheet', new S({ userId: { type: O }, cycleId: { type: O }, status: String, submittedAt: Date, approvedAt: Date, approvedBy: { type: O }, comments: [{ text: String, by: O, byName: String, role: String, createdAt: Date }] }, { timestamps: true }));
const Goal = mongoose.model('Goal', new S({ userId: { type: O }, cycleId: { type: O }, cycleName: String, goalSheetId: { type: O }, thrustArea: String, title: String, description: String, uom: String, uomDirection: String, target: S.Types.Mixed, weightage: Number, status: String, isShared: Boolean, achievements: [{ quarter: String, value: S.Types.Mixed, status: String, comment: String, updatedAt: Date }] }, { timestamps: true }));
const CheckIn = mongoose.model('CheckIn', new S({ goalId: { type: O }, userId: { type: O }, quarter: String, achievement: S.Types.Mixed, status: String, employeeComment: String, managerComment: String }, { timestamps: true }));
const AuditLog = mongoose.model('AuditLog', new S({ entityType: String, entityId: O, action: String, changedBy: O, changedByName: String, description: String, changes: S.Types.Mixed }, { timestamps: true }));
const Notification = mongoose.model('Notification', new S({ userId: O, type: String, title: String, message: String, read: Boolean, link: String }, { timestamps: true }));

// ─── Fewer goals for current year (3 per employee, 2 per manager) ───
const currentGoals = {
  // Priya Patel - Engineering (3 goals = 100%)
  emp1: [
    { title: 'Migrate to Microservices', desc: 'Break monolith into containerized microservices for core modules', thrust: 'Innovation', uom: 'Percentage', dir: 'Min', target: 100, w: 40 },
    { title: 'Implement Observability Stack', desc: 'Set up distributed tracing, logging and metrics dashboards', thrust: 'Quality Improvement', uom: 'Percentage', dir: 'Min', target: 100, w: 30 },
    { title: 'Reduce P1 Incident Count', desc: 'Reduce critical production incidents through proactive monitoring', thrust: 'Quality Improvement', uom: 'Numeric', dir: 'Max', target: 3, w: 30 },
  ],
  // Amit Kumar - Engineering (3 goals = 100%)
  emp2: [
    { title: 'Build Real-time Analytics Pipeline', desc: 'Design and deploy event-driven analytics pipeline using streaming architecture', thrust: 'Digital Transformation', uom: 'Percentage', dir: 'Min', target: 100, w: 40 },
    { title: 'Achieve SOC2 Compliance', desc: 'Implement all required security controls for SOC2 Type II certification', thrust: 'Compliance', uom: 'Timeline', dir: 'Max', target: '2026-12-31', w: 30 },
    { title: 'Improve API Documentation', desc: 'Create comprehensive API docs with examples for all public endpoints', thrust: 'Quality Improvement', uom: 'Percentage', dir: 'Min', target: 100, w: 30 },
  ],
  // Sneha Gupta - Marketing (3 goals = 100%)
  emp3: [
    { title: 'Launch Rebranding Campaign', desc: 'Execute full brand refresh across website, social media and collateral', thrust: 'Revenue Growth', uom: 'Timeline', dir: 'Max', target: '2026-09-30', w: 35 },
    { title: 'Grow Social Media Following', desc: 'Increase combined social media following across all platforms', thrust: 'Customer Satisfaction', uom: 'Percentage', dir: 'Min', target: 50, w: 35 },
    { title: 'Publish Thought Leadership Content', desc: 'Create and publish industry articles, whitepapers and case studies', thrust: 'Innovation', uom: 'Numeric', dir: 'Min', target: 12, w: 30 },
  ],
  // Rahul Sharma - Engineering Manager (3 goals = 100%)
  mgr1: [
    { title: 'Ship V2.0 Platform Release', desc: 'Lead engineering team to deliver version 2.0 with all planned features', thrust: 'Revenue Growth', uom: 'Percentage', dir: 'Min', target: 100, w: 40 },
    { title: 'Grow Engineering Headcount', desc: 'Recruit and onboard new engineers to support scaling initiatives', thrust: 'People Development', uom: 'Numeric', dir: 'Min', target: 5, w: 30 },
    { title: 'Establish Engineering Excellence', desc: 'Implement code review standards, architectural guidelines and best practices', thrust: 'Quality Improvement', uom: 'Percentage', dir: 'Min', target: 100, w: 30 },
  ],
  // Anita Desai - Marketing Manager (3 goals = 100%)
  mgr2: [
    { title: 'Increase MQL to SQL Conversion', desc: 'Improve marketing qualified to sales qualified lead conversion rate', thrust: 'Revenue Growth', uom: 'Percentage', dir: 'Min', target: 25, w: 40 },
    { title: 'Launch Partner Program', desc: 'Design and launch channel partner marketing program', thrust: 'Revenue Growth', uom: 'Timeline', dir: 'Max', target: '2026-11-30', w: 30 },
    { title: 'Build Marketing Analytics Dashboard', desc: 'Create real-time dashboard tracking all marketing KPIs and campaign performance', thrust: 'Digital Transformation', uom: 'Percentage', dir: 'Min', target: 100, w: 30 },
  ],
};

// Q1 only progress (early stage — we're in May 2026, Q1 is Mar-May)
function q1Value(target, uom) {
  if (uom === 'Timeline') return null; // Timeline goals don't have numeric Q1 progress
  const t = Number(target);
  return Math.round(t * (0.15 + Math.random() * 0.15)); // 15-30% progress in Q1
}

async function seed() {
  console.log('🔌 Connecting...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected\n');

  const admin = await User.findOne({ role: 'Admin' });
  const managers = await User.find({ role: 'Manager' }).sort({ email: 1 });
  const employees = await User.find({ role: 'Employee' }).sort({ email: 1 });
  const cycle = await Cycle.findOne({ name: 'FY 2026-27' });

  if (!admin || !cycle || managers.length < 2 || employees.length < 3) {
    console.error('❌ Missing base data.'); process.exit(1);
  }

  // Clear old FY 2026-27 goals/sheets/checkins
  console.log('🗑️  Clearing old FY 2026-27 data...');
  const oldSheets = await GoalSheet.find({ cycleId: cycle._id });
  const oldSheetIds = oldSheets.map(s => s._id);
  const oldGoals = await Goal.find({ goalSheetId: { $in: oldSheetIds } });
  const oldGoalIds = oldGoals.map(g => g._id);
  await CheckIn.deleteMany({ goalId: { $in: oldGoalIds } });
  await Goal.deleteMany({ goalSheetId: { $in: oldSheetIds } });
  await GoalSheet.deleteMany({ cycleId: cycle._id });
  await AuditLog.deleteMany({ description: { $regex: 'FY 2026-27' } });
  await Notification.deleteMany({ message: { $regex: 'FY 2026-27|2026-27' } });

  cycle.isActive = true;
  await cycle.save();

  // Map users to goal templates
  const userGoals = [
    { user: employees[0], goals: currentGoals.emp1, reviewer: managers[0] },  // Priya → Rahul
    { user: employees[1], goals: currentGoals.emp2, reviewer: managers[0] },  // Amit → Rahul
    { user: employees[2], goals: currentGoals.emp3, reviewer: managers[1] },  // Sneha → Anita
    { user: managers[0],  goals: currentGoals.mgr1, reviewer: admin },        // Rahul → Admin
    { user: managers[1],  goals: currentGoals.mgr2, reviewer: admin },        // Anita → Admin
  ];

  const q1Comments = [
    ['Started initial planning and groundwork for this objective', 'Good start, keep it up'],
    ['Early progress made, setting up foundations', 'Looks promising, continue'],
    ['Began execution, preliminary results are encouraging', 'Nice momentum building'],
  ];

  let tGoals = 0, tCheckins = 0, tLogs = 0, tNotifs = 0;

  for (const { user, goals, reviewer } of userGoals) {
    const submitDate = new Date('2026-03-08');
    const approveDate = new Date('2026-03-14');

    // Some sheets approved, some still submitted (for demo variety)
    const isApproved = user.role === 'Employee'; // Employees approved, managers still submitted
    const status = isApproved ? 'Approved' : 'Submitted';

    const sheet = await GoalSheet.create({
      userId: user._id, cycleId: cycle._id, status,
      submittedAt: submitDate,
      ...(isApproved ? { approvedAt: approveDate, approvedBy: reviewer._id } : {}),
      comments: isApproved ? [{ text: 'Goals aligned well. Approved for FY 2026-27.', by: reviewer._id, byName: reviewer.name, role: reviewer.role, createdAt: approveDate }] : [],
    });

    await AuditLog.insertMany([
      { entityType: 'GoalSheet', entityId: sheet._id, action: 'created', changedBy: user._id, changedByName: user.name, description: `Goal sheet created for FY 2026-27`, createdAt: new Date('2026-03-02'), updatedAt: new Date('2026-03-02') },
      { entityType: 'GoalSheet', entityId: sheet._id, action: 'submitted', changedBy: user._id, changedByName: user.name, description: `Goal sheet submitted for FY 2026-27`, createdAt: submitDate, updatedAt: submitDate },
      ...(isApproved ? [{ entityType: 'GoalSheet', entityId: sheet._id, action: 'approved', changedBy: reviewer._id, changedByName: reviewer.name, description: `Goal sheet approved for FY 2026-27`, createdAt: approveDate, updatedAt: approveDate }] : []),
    ]);
    tLogs += isApproved ? 3 : 2;

    if (isApproved) {
      await Notification.create({ userId: user._id, type: 'goal_approved', title: 'Goals Approved', message: `Your FY 2026-27 goals have been approved by ${reviewer.name}.`, read: true, link: '/goals', createdAt: approveDate, updatedAt: approveDate });
      tNotifs++;
    }

    for (const tmpl of goals) {
      const goalStatus = isApproved ? 'Approved' : 'Submitted';
      const goal = await Goal.create({
        userId: user._id, cycleId: cycle._id, cycleName: 'FY 2026-27',
        goalSheetId: sheet._id, thrustArea: tmpl.thrust, title: tmpl.title,
        description: tmpl.desc, uom: tmpl.uom, uomDirection: tmpl.dir,
        target: tmpl.target, weightage: tmpl.w, status: goalStatus, isShared: false,
        achievements: [],
      });
      tGoals++;

      await AuditLog.create({ entityType: 'Goal', entityId: goal._id, action: 'created', changedBy: user._id, changedByName: user.name, description: `Goal "${tmpl.title}" created for FY 2026-27`, createdAt: new Date('2026-03-05'), updatedAt: new Date('2026-03-05') });
      tLogs++;

      // Q1 check-in only for approved goals
      if (isApproved) {
        const val = q1Value(tmpl.target, tmpl.uom);
        const checkinDate = new Date('2026-04-20T10:30:00Z');
        const cp = q1Comments[Math.floor(Math.random() * q1Comments.length)];
        const st = tmpl.uom === 'Timeline' ? 'On Track' : (val / Number(tmpl.target) >= 0.2 ? 'On Track' : 'Needs Attention');

        await CheckIn.create({
          goalId: goal._id, userId: user._id, quarter: 'Q1',
          achievement: val, status: st,
          employeeComment: cp[0], managerComment: cp[1],
          createdAt: checkinDate, updatedAt: checkinDate,
        });
        tCheckins++;

        goal.achievements = [{
          quarter: 'Q1', value: val, status: val === null ? 'On Track' : (val / Number(tmpl.target) >= 0.2 ? 'On Track' : 'At Risk'),
          comment: cp[0], updatedAt: checkinDate,
        }];
        await goal.save();

        await AuditLog.create({ entityType: 'CheckIn', entityId: goal._id, action: 'checkin_submitted', changedBy: user._id, changedByName: user.name, description: `Q1 check-in for "${tmpl.title}" - FY 2026-27`, createdAt: checkinDate, updatedAt: checkinDate });
        tLogs++;
      }
    }
    console.log(`  ✅ ${user.name} (${status}) — ${goals.length} goals${isApproved ? `, ${goals.length} Q1 check-ins` : ', no check-ins yet'}`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Goals: ${tGoals} | Q1 Check-ins: ${tCheckins} | Audit Logs: ${tLogs} | Notifications: ${tNotifs}`);
  console.log('✅ FY 2026-27 seed complete!\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(e => { console.error('❌', e); process.exit(1); });
