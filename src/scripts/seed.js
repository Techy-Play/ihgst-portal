const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Read .env.local file if it exists
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        if (val && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found.');
  console.error('Please set it in .env.local or as environment variable.');
  process.exit(1);
}

// ===== Schemas =====
const UserSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true, lowercase: true },
  password: String, role: { type: String, enum: ['Employee', 'Manager', 'Admin'] },
  department: String, managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  employeeId: { type: String, unique: true },
}, { timestamps: true });

const CycleSchema = new mongoose.Schema({
  name: String, goalSettingStart: Date, goalSettingEnd: Date,
  quarters: [{ label: String, start: Date, end: Date }],
  isActive: Boolean, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const GoalSheetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cycle' },
  status: String, submittedAt: Date, approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [{ text: String, by: mongoose.Schema.Types.ObjectId, byName: String, role: String, createdAt: Date }],
}, { timestamps: true });

const GoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  goalSheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoalSheet' },
  thrustArea: String, title: String, description: String,
  uom: String, uomDirection: String, target: mongoose.Schema.Types.Mixed,
  weightage: Number, status: String, isShared: Boolean,
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  primaryOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  linkedGoalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],
  achievements: [{ quarter: String, value: mongoose.Schema.Types.Mixed, status: String, comment: String, updatedAt: Date }],
}, { timestamps: true });

const AuditLogSchema = new mongoose.Schema({
  entityType: String, entityId: mongoose.Schema.Types.ObjectId,
  action: String, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedByName: String, changes: mongoose.Schema.Types.Mixed, description: String,
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String, title: String, message: String, read: Boolean, link: String,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Cycle = mongoose.model('Cycle', CycleSchema);
const GoalSheet = mongoose.model('GoalSheet', GoalSheetSchema);
const Goal = mongoose.model('Goal', GoalSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

async function seed() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected!\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}), Cycle.deleteMany({}), GoalSheet.deleteMany({}),
    Goal.deleteMany({}), AuditLog.deleteMany({}), Notification.deleteMany({}),
  ]);

  // ===== Create Users =====
  console.log('👤 Creating users...');
  const password = await bcrypt.hash('Admin@123', 10);
  const managerPw = await bcrypt.hash('Manager@123', 10);
  const employeePw = await bcrypt.hash('Employee@123', 10);

  const admin = await User.create({
    name: 'Admin User', email: 'admin@ihgst.com', password,
    role: 'Admin', department: 'Human Resources', employeeId: 'EMP001',
  });

  const manager = await User.create({
    name: 'Rahul Sharma', email: 'manager@ihgst.com', password: managerPw,
    role: 'Manager', department: 'Engineering', employeeId: 'EMP002',
  });

  const emp1 = await User.create({
    name: 'Priya Patel', email: 'employee1@ihgst.com', password: employeePw,
    role: 'Employee', department: 'Engineering', managerId: manager._id, employeeId: 'EMP003',
  });

  const emp2 = await User.create({
    name: 'Amit Kumar', email: 'employee2@ihgst.com', password: employeePw,
    role: 'Employee', department: 'Engineering', managerId: manager._id, employeeId: 'EMP004',
  });

  const emp3 = await User.create({
    name: 'Sneha Gupta', email: 'employee3@ihgst.com', password: employeePw,
    role: 'Employee', department: 'Marketing', managerId: manager._id, employeeId: 'EMP005',
  });

  console.log('  ✅ Admin: admin@ihgst.com / Admin@123');
  console.log('  ✅ Manager: manager@ihgst.com / Manager@123');
  console.log('  ✅ Employee 1: employee1@ihgst.com / Employee@123');
  console.log('  ✅ Employee 2: employee2@ihgst.com / Employee@123');
  console.log('  ✅ Employee 3: employee3@ihgst.com / Employee@123');

  // ===== Create Cycle =====
  console.log('\n📅 Creating performance cycle...');
  const cycle = await Cycle.create({
    name: 'FY 2025-26',
    goalSettingStart: new Date('2025-05-01'),
    goalSettingEnd: new Date('2025-06-30'),
    quarters: [
      { label: 'Q1 Check-in', start: new Date('2025-07-01'), end: new Date('2025-07-31') },
      { label: 'Q2 Check-in', start: new Date('2025-10-01'), end: new Date('2025-10-31') },
      { label: 'Q3 Check-in', start: new Date('2026-01-01'), end: new Date('2026-01-31') },
      { label: 'Q4 / Annual Review', start: new Date('2026-03-01'), end: new Date('2026-04-30') },
    ],
    isActive: true,
    createdBy: admin._id,
  });

  // ===== Create Goal Sheets and Goals =====
  console.log('\n🎯 Creating goals for Employee 1 (Priya Patel) — Approved...');
  const gs1 = await GoalSheet.create({
    userId: emp1._id, cycleId: cycle._id, status: 'Approved',
    submittedAt: new Date('2025-05-15'), approvedAt: new Date('2025-05-20'),
    approvedBy: manager._id,
  });

  await Goal.create([
    {
      userId: emp1._id, goalSheetId: gs1._id,
      thrustArea: 'Revenue Growth', title: 'Increase API performance by 30%',
      description: 'Optimize backend APIs to reduce response time by 30% across critical endpoints.',
      uom: 'Percentage', uomDirection: 'Min', target: 30, weightage: 30, status: 'Approved',
      achievements: [
        { quarter: 'Q1', value: 15, status: 'On Track', comment: 'Optimized 5 critical endpoints', updatedAt: new Date() },
      ],
    },
    {
      userId: emp1._id, goalSheetId: gs1._id,
      thrustArea: 'Quality Improvement', title: 'Achieve 95% test coverage',
      description: 'Increase unit and integration test coverage to 95% for core modules.',
      uom: 'Percentage', uomDirection: 'Min', target: 95, weightage: 25, status: 'Approved',
      achievements: [
        { quarter: 'Q1', value: 78, status: 'On Track', comment: 'Added tests for auth module', updatedAt: new Date() },
      ],
    },
    {
      userId: emp1._id, goalSheetId: gs1._id,
      thrustArea: 'Innovation', title: 'Deliver ML feature recommendation engine',
      description: 'Build and deploy an ML-based feature recommendation system.',
      uom: 'Timeline', uomDirection: 'Min', target: '2026-03-31', weightage: 25, status: 'Approved',
    },
    {
      userId: emp1._id, goalSheetId: gs1._id,
      thrustArea: 'People Development', title: 'Mentor 2 junior developers',
      description: 'Conduct weekly 1:1 sessions and code reviews with junior team members.',
      uom: 'Numeric', uomDirection: 'Min', target: 2, weightage: 20, status: 'Approved',
      achievements: [
        { quarter: 'Q1', value: 1, status: 'On Track', comment: 'Started mentoring Raj', updatedAt: new Date() },
      ],
    },
  ]);

  console.log('\n🎯 Creating goals for Employee 2 (Amit Kumar) — Submitted...');
  const gs2 = await GoalSheet.create({
    userId: emp2._id, cycleId: cycle._id, status: 'Submitted',
    submittedAt: new Date('2025-05-18'),
  });

  await Goal.create([
    {
      userId: emp2._id, goalSheetId: gs2._id,
      thrustArea: 'Operational Excellence', title: 'Reduce deployment time by 50%',
      description: 'Streamline CI/CD pipeline to cut deployment time in half.',
      uom: 'Percentage', uomDirection: 'Min', target: 50, weightage: 35, status: 'Submitted',
    },
    {
      userId: emp2._id, goalSheetId: gs2._id,
      thrustArea: 'Cost Optimization', title: 'Reduce cloud costs by 20%',
      description: 'Optimize cloud resource usage and implement cost-saving measures.',
      uom: 'Percentage', uomDirection: 'Min', target: 20, weightage: 30, status: 'Submitted',
    },
    {
      userId: emp2._id, goalSheetId: gs2._id,
      thrustArea: 'Compliance', title: 'Zero security incidents',
      description: 'Maintain zero critical security incidents throughout the year.',
      uom: 'Zero', uomDirection: 'Min', target: 0, weightage: 35, status: 'Submitted',
    },
  ]);

  console.log('\n🎯 Creating goals for Employee 3 (Sneha Gupta) — Draft...');
  const gs3 = await GoalSheet.create({
    userId: emp3._id, cycleId: cycle._id, status: 'Draft',
  });

  await Goal.create([
    {
      userId: emp3._id, goalSheetId: gs3._id,
      thrustArea: 'Customer Satisfaction', title: 'Increase NPS score to 70+',
      description: 'Improve customer satisfaction through better support and engagement.',
      uom: 'Numeric', uomDirection: 'Min', target: 70, weightage: 40, status: 'Draft',
    },
    {
      userId: emp3._id, goalSheetId: gs3._id,
      thrustArea: 'Revenue Growth', title: 'Generate 50 qualified leads per month',
      description: 'Create and execute campaigns to generate qualified leads.',
      uom: 'Numeric', uomDirection: 'Min', target: 50, weightage: 35, status: 'Draft',
    },
  ]);

  // ===== Audit Logs =====
  console.log('\n📋 Creating audit logs...');
  await AuditLog.create([
    { entityType: 'GoalSheet', entityId: gs1._id, action: 'submitted', changedBy: emp1._id, changedByName: 'Priya Patel', description: 'Goal sheet submitted for approval' },
    { entityType: 'GoalSheet', entityId: gs1._id, action: 'approved', changedBy: manager._id, changedByName: 'Rahul Sharma', description: 'Goal sheet approved' },
    { entityType: 'GoalSheet', entityId: gs2._id, action: 'submitted', changedBy: emp2._id, changedByName: 'Amit Kumar', description: 'Goal sheet submitted for approval' },
    { entityType: 'Cycle', entityId: cycle._id, action: 'created', changedBy: admin._id, changedByName: 'Admin User', description: 'FY 2025-26 cycle created' },
  ]);

  // ===== Notifications =====
  console.log('🔔 Creating notifications...');
  await Notification.create([
    { userId: manager._id, type: 'goal_submitted', title: 'Goal Sheet Submitted', message: 'Amit Kumar has submitted their goal sheet for review.', read: false, link: `/manager/review/${emp2._id}` },
    { userId: emp1._id, type: 'goal_approved', title: 'Goals Approved', message: 'Your goal sheet has been approved by Rahul Sharma.', read: true, link: '/goals' },
  ]);

  console.log('\n✅ ========================================');
  console.log('   SEED COMPLETE!');
  console.log('   ========================================');
  console.log('\n📌 Demo Credentials:');
  console.log('   Admin:     admin@ihgst.com     / Admin@123');
  console.log('   Manager:   manager@ihgst.com   / Manager@123');
  console.log('   Employee:  employee1@ihgst.com  / Employee@123');
  console.log('   Employee:  employee2@ihgst.com  / Employee@123');
  console.log('   Employee:  employee3@ihgst.com  / Employee@123');
  console.log('\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
