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

// Schemas
const S = mongoose.Schema, O = S.Types.ObjectId;
const User = mongoose.model('User', new S({ name: String, email: String, password: String, role: String, department: String, managerId: { type: O, ref: 'User' }, employeeId: String }, { timestamps: true }));
const Cycle = mongoose.model('Cycle', new S({ name: String, goalSettingStart: Date, goalSettingEnd: Date, quarters: [{ label: String, start: Date, end: Date }], isActive: Boolean, createdBy: { type: O } }, { timestamps: true }));
const GoalSheet = mongoose.model('GoalSheet', new S({ userId: { type: O }, cycleId: { type: O }, status: String, submittedAt: Date, approvedAt: Date, approvedBy: { type: O }, comments: [{ text: String, by: O, byName: String, role: String, createdAt: Date }] }, { timestamps: true }));
const Goal = mongoose.model('Goal', new S({ userId: { type: O }, cycleId: { type: O }, cycleName: String, goalSheetId: { type: O }, thrustArea: String, title: String, description: String, uom: String, uomDirection: String, target: S.Types.Mixed, weightage: Number, status: String, isShared: Boolean, achievements: [{ quarter: String, value: S.Types.Mixed, status: String, comment: String, updatedAt: Date }] }, { timestamps: true }));
const CheckIn = mongoose.model('CheckIn', new S({ goalId: { type: O }, userId: { type: O }, quarter: String, achievement: S.Types.Mixed, status: String, employeeComment: String, managerComment: String }, { timestamps: true }));
const AuditLog = mongoose.model('AuditLog', new S({ entityType: String, entityId: O, action: String, changedBy: O, changedByName: String, description: String, changes: S.Types.Mixed }, { timestamps: true }));
const Notification = mongoose.model('Notification', new S({ userId: O, type: String, title: String, message: String, read: Boolean, link: String }, { timestamps: true }));

// ─── Realistic goal templates per department ───
const engGoals = [
  { title: 'Reduce API Response Time', desc: 'Optimize backend APIs and database queries to reduce average API response latency', thrust: 'Digital Transformation', uom: 'Percentage', dir: 'Min', target: 20, w: 30 },
  { title: 'Improve Code Coverage', desc: 'Increase unit and integration test coverage across all microservices', thrust: 'Quality Improvement', uom: 'Percentage', dir: 'Min', target: 85, w: 25 },
  { title: 'Complete Infrastructure Security Audit', desc: 'Conduct full infrastructure vulnerability assessment and resolve all critical findings', thrust: 'Quality Improvement', uom: 'Timeline', dir: 'Max', target: '2025-11-15', w: 20 },
  { title: 'Reduce Production Bugs', desc: 'Reduce production-level bugs and improve deployment stability across engineering services', thrust: 'Quality Improvement', uom: 'Numeric', dir: 'Max', target: 5, w: 25 },
];
const engGoals2 = [
  { title: 'Automate CI/CD Pipeline', desc: 'Build end-to-end automated deployment pipeline with zero-downtime releases', thrust: 'Innovation', uom: 'Percentage', dir: 'Min', target: 100, w: 30 },
  { title: 'Reduce Server Costs', desc: 'Optimize cloud infrastructure to reduce monthly server costs by target percentage', thrust: 'Cost Optimization', uom: 'Percentage', dir: 'Min', target: 15, w: 25 },
  { title: 'Improve System Uptime', desc: 'Achieve and maintain target system uptime SLA for all production services', thrust: 'Quality Improvement', uom: 'Percentage', dir: 'Min', target: 99, w: 25 },
  { title: 'Mentor Junior Developers', desc: 'Conduct weekly code reviews and knowledge-sharing sessions with junior team members', thrust: 'People Development', uom: 'Numeric', dir: 'Min', target: 40, w: 20 },
];
const mktGoals = [
  { title: 'Increase Brand Awareness', desc: 'Drive brand visibility through digital marketing campaigns and social media presence', thrust: 'Revenue Growth', uom: 'Percentage', dir: 'Min', target: 30, w: 30 },
  { title: 'Generate Qualified Leads', desc: 'Execute targeted campaigns to generate marketing qualified leads for sales team', thrust: 'Revenue Growth', uom: 'Numeric', dir: 'Min', target: 500, w: 25 },
  { title: 'Launch Product Campaign', desc: 'Plan and execute integrated product launch campaign across all channels', thrust: 'Innovation', uom: 'Timeline', dir: 'Max', target: '2025-10-31', w: 20 },
  { title: 'Improve Customer Satisfaction Score', desc: 'Enhance customer experience through feedback-driven improvements and service excellence', thrust: 'Customer Satisfaction', uom: 'Numeric', dir: 'Min', target: 90, w: 25 },
];
const mgrEngGoals = [
  { title: 'Deliver Q3 Product Milestone', desc: 'Ensure all engineering deliverables for Q3 product roadmap are completed on time', thrust: 'Revenue Growth', uom: 'Percentage', dir: 'Min', target: 100, w: 35 },
  { title: 'Build High-Performance Team', desc: 'Hire, retain and develop top engineering talent to build a world-class team', thrust: 'People Development', uom: 'Numeric', dir: 'Min', target: 12, w: 25 },
  { title: 'Reduce Technical Debt', desc: 'Systematically address and reduce accumulated technical debt across legacy systems', thrust: 'Quality Improvement', uom: 'Percentage', dir: 'Min', target: 40, w: 20 },
  { title: 'Improve Sprint Velocity', desc: 'Increase average sprint velocity by optimizing planning and removing blockers', thrust: 'Cost Optimization', uom: 'Percentage', dir: 'Min', target: 25, w: 20 },
];
const mgrMktGoals = [
  { title: 'Grow Digital Revenue', desc: 'Increase revenue from digital channels through strategic marketing initiatives', thrust: 'Revenue Growth', uom: 'Percentage', dir: 'Min', target: 35, w: 35 },
  { title: 'Expand Market Reach', desc: 'Enter 2 new geographic markets with localized marketing strategy', thrust: 'Revenue Growth', uom: 'Numeric', dir: 'Min', target: 2, w: 25 },
  { title: 'Train Marketing Team', desc: 'Upskill team on analytics, AI marketing tools and emerging platforms', thrust: 'People Development', uom: 'Numeric', dir: 'Min', target: 8, w: 20 },
  { title: 'Achieve Campaign ROI Target', desc: 'Maintain marketing campaign return on investment above target threshold', thrust: 'Cost Optimization', uom: 'Percentage', dir: 'Min', target: 150, w: 20 },
];

// Q-wise progress: realistic cumulative achievements
function qProgress(target, uom) {
  if (uom === 'Timeline') return [null, null, null, target]; // Completed by target date
  const t = Number(target);
  const q1 = Math.round(t * (0.2 + Math.random() * 0.1));
  const q2 = Math.round(t * (0.45 + Math.random() * 0.1));
  const q3 = Math.round(t * (0.7 + Math.random() * 0.1));
  const q4 = Math.round(t * (0.9 + Math.random() * 0.12));
  return [q1, q2, q3, q4];
}
function qStatus(achieved, target, qIdx, uom) {
  if (uom === 'Timeline') return qIdx < 3 ? 'On Track' : 'Completed';
  const pct = (achieved / Number(target)) * 100;
  const expected = (qIdx + 1) * 25;
  if (pct >= expected - 5) return pct >= 90 ? 'Completed' : 'On Track';
  return 'At Risk';
}

const qComments = {
  Q1: [
    ['Initiated foundational work, early progress encouraging', 'Good start, keep the momentum'],
    ['Set up baseline metrics and started tracking', 'Solid groundwork laid'],
    ['Completed initial phase, slightly behind target', 'Needs acceleration in Q2'],
  ],
  Q2: [
    ['Steady progress, key milestones achieved mid-year', 'On track, maintain focus'],
    ['Significant improvement from Q1 baseline', 'Great improvement, continue pushing'],
    ['Facing some blockers but working through them', 'Identify and remove blockers quickly'],
  ],
  Q3: [
    ['Strong execution this quarter, ahead of schedule', 'Excellent progress, almost there'],
    ['Major deliverable completed, minor items remaining', 'Well done, wrap up remaining items'],
    ['Catching up after Q2 delays, back on track', 'Good recovery, stay focused for Q4'],
  ],
  Q4: [
    ['Target achieved, exceeded expectations in final quarter', 'Outstanding work this year'],
    ['Successfully completed annual objective', 'Strong finish, well done'],
    ['Delivered all remaining items, year-end target met', 'Consistent performance throughout'],
  ],
};

async function seed() {
  console.log('🔌 Connecting...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected\n');

  // Get existing data
  const admin = await User.findOne({ role: 'Admin' });
  const managers = await User.find({ role: 'Manager' });
  const employees = await User.find({ role: 'Employee' });
  const cycle = await Cycle.findOne({ name: 'FY 2025-26' });

  if (!admin || !cycle || managers.length === 0 || employees.length === 0) {
    console.error('❌ Missing base data. Run main seed first.'); process.exit(1);
  }

  // Clear ONLY FY 2025-26 data (keep current year)
  console.log('🗑️  Clearing old FY 2025-26 goals, sheets, check-ins...');
  const oldSheets = await GoalSheet.find({ cycleId: cycle._id });
  const oldSheetIds = oldSheets.map(s => s._id);
  const oldGoals = await Goal.find({ goalSheetId: { $in: oldSheetIds } });
  const oldGoalIds = oldGoals.map(g => g._id);
  await CheckIn.deleteMany({ goalId: { $in: oldGoalIds } });
  await Goal.deleteMany({ goalSheetId: { $in: oldSheetIds } });
  await GoalSheet.deleteMany({ cycleId: cycle._id });
  // Clear old audit logs & notifications for this cycle
  await AuditLog.deleteMany({ description: { $regex: 'FY 2025-26' } });
  await Notification.deleteMany({ message: { $regex: 'FY 2025-26|2025-26' } });

  // Mark cycle as completed
  cycle.isActive = false;
  await cycle.save();

  // Goal templates per user
  const goalMap = {
    [managers[0]._id.toString()]: mgrEngGoals,   // Rahul Sharma (Engineering Mgr)
    [managers[1]._id.toString()]: mgrMktGoals,    // Anita Desai (Marketing Mgr)
    [employees[0]._id.toString()]: engGoals,      // Priya Patel (Engineering)
    [employees[1]._id.toString()]: engGoals2,     // Amit Kumar (Engineering)
    [employees[2]._id.toString()]: mktGoals,      // Sneha Gupta (Marketing)
  };

  const allUsers = [...managers, ...employees];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const qDates = cycle.quarters; // quarter date ranges from cycle

  let totalGoals = 0, totalCheckins = 0, totalLogs = 0, totalNotifs = 0;

  for (const user of allUsers) {
    const reviewer = user.managerId ? await User.findById(user.managerId) : admin;
    const templates = goalMap[user._id.toString()];
    if (!templates) continue;

    // 1. Create GoalSheet (Approved for past year)
    const submitDate = new Date('2025-03-05');
    const approveDate = new Date('2025-03-12');
    const sheet = await GoalSheet.create({
      userId: user._id, cycleId: cycle._id, status: 'Approved',
      submittedAt: submitDate, approvedAt: approveDate, approvedBy: reviewer._id,
      comments: [{ text: 'Goals look well-aligned with team objectives. Approved.', by: reviewer._id, byName: reviewer.name, role: reviewer.role, createdAt: approveDate }],
    });

    // Audit: sheet created, submitted, approved
    await AuditLog.insertMany([
      { entityType: 'GoalSheet', entityId: sheet._id, action: 'created', changedBy: user._id, changedByName: user.name, description: `Goal sheet created for FY 2025-26`, createdAt: new Date('2025-03-01'), updatedAt: new Date('2025-03-01') },
      { entityType: 'GoalSheet', entityId: sheet._id, action: 'submitted', changedBy: user._id, changedByName: user.name, description: `Goal sheet submitted for FY 2025-26`, createdAt: submitDate, updatedAt: submitDate },
      { entityType: 'GoalSheet', entityId: sheet._id, action: 'approved', changedBy: reviewer._id, changedByName: reviewer.name, description: `Goal sheet approved for FY 2025-26`, createdAt: approveDate, updatedAt: approveDate },
    ]);
    totalLogs += 3;

    // Notifications
    await Notification.insertMany([
      { userId: user._id, type: 'goal_approved', title: 'Goals Approved', message: `Your FY 2025-26 goal sheet has been approved by ${reviewer.name}.`, read: true, link: '/goals', createdAt: approveDate, updatedAt: approveDate },
    ]);
    totalNotifs++;

    // 2. Create Goals with check-ins
    for (const tmpl of templates) {
      const progress = qProgress(tmpl.target, tmpl.uom);
      const achievements = [];

      const goal = await Goal.create({
        userId: user._id, cycleId: cycle._id, cycleName: 'FY 2025-26',
        goalSheetId: sheet._id, thrustArea: tmpl.thrust, title: tmpl.title,
        description: tmpl.desc, uom: tmpl.uom, uomDirection: tmpl.dir,
        target: tmpl.target, weightage: tmpl.w, status: 'Approved', isShared: false,
        achievements: [],
      });
      totalGoals++;

      // Audit: goal created
      await AuditLog.create({
        entityType: 'Goal', entityId: goal._id, action: 'created',
        changedBy: user._id, changedByName: user.name,
        description: `Goal "${tmpl.title}" created for FY 2025-26`,
        createdAt: new Date('2025-03-03'), updatedAt: new Date('2025-03-03'),
      });
      totalLogs++;

      // 3. Create Check-ins for each quarter
      for (let qi = 0; qi < 4; qi++) {
        const q = quarters[qi];
        const qRange = qDates[qi];
        const checkinDate = new Date(qRange.start.getTime() + 15 * 86400000 + Math.random() * 10 * 86400000);
        const val = progress[qi];
        const st = qStatus(val, tmpl.target, qi, tmpl.uom);
        const commentPair = qComments[q][Math.floor(Math.random() * qComments[q].length)];

        const checkinStatus = st === 'Completed' ? 'Completed' : st === 'At Risk' ? 'Needs Attention' : 'On Track';

        await CheckIn.create({
          goalId: goal._id, userId: user._id, quarter: q,
          achievement: tmpl.uom === 'Timeline' ? (qi === 3 ? tmpl.target : null) : val,
          status: checkinStatus,
          employeeComment: commentPair[0], managerComment: commentPair[1],
          createdAt: checkinDate, updatedAt: checkinDate,
        });
        totalCheckins++;

        achievements.push({
          quarter: q,
          value: tmpl.uom === 'Timeline' ? (qi === 3 ? tmpl.target : null) : val,
          status: st, comment: commentPair[0], updatedAt: checkinDate,
        });

        // Audit: check-in
        await AuditLog.create({
          entityType: 'CheckIn', entityId: goal._id, action: 'checkin_submitted',
          changedBy: user._id, changedByName: user.name,
          description: `${q} check-in for "${tmpl.title}" - FY 2025-26`,
          createdAt: checkinDate, updatedAt: checkinDate,
        });
        totalLogs++;
      }

      goal.achievements = achievements;
      await goal.save();
    }
    console.log(`  ✅ ${user.name} — ${templates.length} goals, ${templates.length * 4} check-ins`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Goals: ${totalGoals} | Check-ins: ${totalCheckins} | Audit Logs: ${totalLogs} | Notifications: ${totalNotifs}`);
  console.log('✅ FY 2025-26 seed complete!\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(e => { console.error('❌', e); process.exit(1); });
