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
  achievements: [{ quarter: String, value: mongoose.Schema.Types.Mixed, status: String, comment: String, updatedAt: Date }],
}, { timestamps: true });

const CheckInSchema = new mongoose.Schema({
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quarter: String, achievement: mongoose.Schema.Types.Mixed,
  status: String, employeeComment: String, managerComment: String,
}, { timestamps: true });

const AuditLogSchema = new mongoose.Schema({
  entityType: String, entityId: mongoose.Schema.Types.ObjectId, action: String,
  changedBy: mongoose.Schema.Types.ObjectId, changedByName: String, description: String,
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId, type: String, title: String,
  message: String, read: Boolean, link: String,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Cycle = mongoose.model('Cycle', CycleSchema);
const GoalSheet = mongoose.model('GoalSheet', GoalSheetSchema);
const Goal = mongoose.model('Goal', GoalSchema);
const CheckIn = mongoose.model('CheckIn', CheckInSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected!\n');

  console.log('🗑️  Clearing ALL old data...');
  await Promise.all([
    User.deleteMany({}), Cycle.deleteMany({}), GoalSheet.deleteMany({}),
    Goal.deleteMany({}), CheckIn.deleteMany({}), AuditLog.deleteMany({}), Notification.deleteMany({}),
  ]);

  // ===== Create Users =====
  console.log('👤 Creating Users (1 Admin, 2 Managers, 3 Employees)...');
  const adminPw = await bcrypt.hash('Admin@123', 10);
  const managerPw = await bcrypt.hash('Manager@123', 10);
  const employeePw = await bcrypt.hash('Employee@123', 10);

  const admin = await User.create({
    name: 'Admin User', email: 'admin@ihgst.com', password: adminPw,
    role: 'Admin', department: 'Human Resources', employeeId: 'EMP-A001',
  });

  const managers = await User.insertMany([
    { name: 'Rahul Sharma', email: 'manager@ihgst.com', password: managerPw, role: 'Manager', department: 'Engineering', employeeId: 'EMP-M001' },
    { name: 'Anita Desai', email: 'manager2@ihgst.com', password: managerPw, role: 'Manager', department: 'Marketing', employeeId: 'EMP-M002' },
  ]);

  const employees = await User.insertMany([
    { name: 'Priya Patel', email: 'employee1@ihgst.com', password: employeePw, role: 'Employee', department: 'Engineering', managerId: managers[0]._id, employeeId: 'EMP-E001' },
    { name: 'Amit Kumar', email: 'employee2@ihgst.com', password: employeePw, role: 'Employee', department: 'Engineering', managerId: managers[0]._id, employeeId: 'EMP-E002' },
    { name: 'Sneha Gupta', email: 'employee3@ihgst.com', password: employeePw, role: 'Employee', department: 'Marketing', managerId: managers[1]._id, employeeId: 'EMP-E003' },
  ]);

  const allUsersWithGoals = [...managers, ...employees];

  // ===== Create Cycles =====
  console.log('📅 Creating FY 2025-26 and FY 2026-27 cycles (March - Feb)...');
  
  const cycle2526 = await Cycle.create({
    name: 'FY 2025-26', goalSettingStart: new Date('2025-02-15'), goalSettingEnd: new Date('2025-03-31'),
    quarters: [
      { label: 'Q1 Check-in', start: new Date('2025-03-01'), end: new Date('2025-05-31') },
      { label: 'Q2 Check-in', start: new Date('2025-06-01'), end: new Date('2025-08-31') },
      { label: 'Q3 Check-in', start: new Date('2025-09-01'), end: new Date('2025-11-30') },
      { label: 'Q4 / Annual Review', start: new Date('2025-12-01'), end: new Date('2026-02-28') },
    ], isActive: false, createdBy: admin._id,
  });

  const cycle2627 = await Cycle.create({
    name: 'FY 2026-27', goalSettingStart: new Date('2026-02-15'), goalSettingEnd: new Date('2026-03-31'),
    quarters: [
      { label: 'Q1 Check-in', start: new Date('2026-03-01'), end: new Date('2026-05-31') },
      { label: 'Q2 Check-in', start: new Date('2026-06-01'), end: new Date('2026-08-31') },
      { label: 'Q3 Check-in', start: new Date('2026-09-01'), end: new Date('2026-11-30') },
      { label: 'Q4 / Annual Review', start: new Date('2026-12-01'), end: new Date('2027-02-28') },
    ], isActive: true, createdBy: admin._id,
  });

  // ===== Helper for Generating Goals and Check-ins =====
  const thrustAreas = ['Revenue Growth', 'Cost Optimization', 'Quality Improvement', 'Innovation', 'People Development', 'Customer Satisfaction', 'Compliance'];
  
  const seedGoals = async (cycle, users, isPast) => {
    for (const u of users) {
      const sheet = await GoalSheet.create({
        userId: u._id, cycleId: cycle._id, status: 'Approved',
        submittedAt: new Date(cycle.goalSettingStart.getTime() + 86400000*5),
        approvedAt: new Date(cycle.goalSettingStart.getTime() + 86400000*10),
        approvedBy: u.managerId || admin._id
      });

      // Total weightage must be 100%. We'll create 4 goals per user with weightages 30, 30, 20, 20.
      const weightages = [30, 30, 20, 20];
      for (let i = 0; i < 4; i++) {
        const tArea = thrustAreas[randomInt(0, thrustAreas.length-1)];
        const targetVal = randomInt(50, 100);
        
        const goal = await Goal.create({
          userId: u._id, goalSheetId: sheet._id, thrustArea: tArea,
          title: `${tArea} Initiative ${i+1}`, description: `Focus on ${tArea} for ${cycle.name}`,
          uom: 'Numeric', uomDirection: 'Min', target: targetVal, weightage: weightages[i], status: 'Approved',
          achievements: []
        });

        const achievements = [];
        // The active quarter logic: Today is May 2026. This falls into FY 2026-27 Q1 (Mar 1 - May 31).
        // For the past cycle (FY 2025-26), fill all quarters.
        // For the active cycle (FY 2026-27), fill ONLY Q1.
        const quarters = isPast ? ['Q1', 'Q2', 'Q3', 'Q4'] : ['Q1'];
        
        let cumulative = 0;
        for (let qIdx = 0; qIdx < quarters.length; qIdx++) {
          const q = quarters[qIdx];
          const cycleQuarter = cycle.quarters[qIdx];
          const step = Math.ceil(targetVal / 4);
          cumulative += randomInt(step - 5, step + 5);
          if (cumulative < 0) cumulative = 0;
          if (q === 'Q4' && isPast) cumulative = randomInt(targetVal - 5, targetVal + 5);
          
          const status = cumulative >= (targetVal * ((qIdx+1)/4)) ? 'On Track' : 'Needs Attention';
          
          await CheckIn.create({
            goalId: goal._id, userId: u._id, quarter: q, achievement: cumulative,
            status: status === 'On Track' ? 'Completed' : 'On Track',
            employeeComment: `Progress update for ${q}`,
            managerComment: `Reviewed ${q}`,
            createdAt: new Date(cycleQuarter.start.getTime() + 86400000*15) // Mid quarter check-in
          });

          achievements.push({
            quarter: q, value: cumulative, status: status,
            comment: `Progress update for ${q}`, updatedAt: new Date(cycleQuarter.start.getTime() + 86400000*15)
          });
        }
        
        goal.achievements = achievements;
        await goal.save();
      }
    }
  };

  console.log('🎯 Seeding FY 2025-26 (Past Year - 4 Goals each, Q1-Q4)...');
  await seedGoals(cycle2526, allUsersWithGoals, true);

  console.log('🎯 Seeding FY 2026-27 (Current Year - 4 Goals each, Q1 ONLY)...');
  await seedGoals(cycle2627, allUsersWithGoals, false);

  console.log('\n✅ ========================================');
  console.log('   SEED COMPLETE! NEW STRUCTURE READY.');
  console.log('   ========================================');
  
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
