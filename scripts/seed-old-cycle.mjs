// Seed script for FY 2025-26 historical analytics data
// Run: node scripts/seed-old-cycle.mjs

import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
});

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

await mongoose.connect(MONGO_URI);
console.log('Connected to MongoDB');

const db = mongoose.connection.db;

// 1. Create old FY cycle
const existingCycle = await db.collection('cycles').findOne({ name: 'FY 2025-26' });
let cycleId;
if (existingCycle) {
  cycleId = existingCycle._id;
  console.log('FY 2025-26 cycle already exists:', cycleId);
} else {
  const res = await db.collection('cycles').insertOne({
    name: 'FY 2025-26',
    startDate: new Date('2025-04-01'),
    endDate: new Date('2026-03-31'),
    isActive: false,
    quarters: {
      Q1: { start: new Date('2025-04-01'), end: new Date('2025-06-30'), label: 'Q1' },
      Q2: { start: new Date('2025-07-01'), end: new Date('2025-09-30'), label: 'Q2' },
      Q3: { start: new Date('2025-10-01'), end: new Date('2025-12-31'), label: 'Q3' },
      Q4: { start: new Date('2026-01-01'), end: new Date('2026-03-31'), label: 'Q4' },
    },
    createdAt: new Date('2025-04-01'),
    updatedAt: new Date('2025-04-01'),
  });
  cycleId = res.insertedId;
  console.log('Created FY 2025-26 cycle:', cycleId);
}

// 2. Get existing users
const users = await db.collection('users').find({}).toArray();
const employees = users.filter(u => u.role === 'Employee' || u.role === 'Manager');
console.log(`Found ${employees.length} employees/managers to seed goals for`);

if (employees.length === 0) {
  console.log('No employees found. Exiting.');
  process.exit(0);
}

const thrustAreas = ['Academics', 'Research', 'Administration', 'Outreach', 'Innovation'];
const uoms = ['Number', 'Percentage', 'Rating', 'Timeline'];

// 3. Create goals for each employee tied to FY 2025-26
for (const user of employees) {
  // Check if goals already seeded for this user+cycle
  const existing = await db.collection('goals').findOne({ userId: user._id, cycleId });
  if (existing) { console.log(`  Skipping ${user.name} (already has goals)`); continue; }

  // Create or find a goal sheet
  let sheet = await db.collection('goalsheets').findOne({ userId: user._id, cycleId });
  if (!sheet) {
    const res = await db.collection('goalsheets').insertOne({
      userId: user._id,
      cycleId,
      status: 'Approved',
      submittedAt: new Date('2025-04-15'),
      reviewedAt: new Date('2025-04-20'),
      comments: [],
      createdAt: new Date('2025-04-10'),
      updatedAt: new Date('2025-04-20'),
    });
    sheet = { _id: res.insertedId };
  }

  const goalCount = 3 + Math.floor(Math.random() * 3); // 3-5 goals
  let remainingWeight = 100;
  const goals = [];

  for (let g = 0; g < goalCount; g++) {
    const isLast = g === goalCount - 1;
    const weight = isLast ? remainingWeight : Math.min(remainingWeight - (goalCount - g - 1) * 10, 10 + Math.floor(Math.random() * 30));
    remainingWeight -= weight;

    const thrust = thrustAreas[g % thrustAreas.length];
    const uom = uoms[g % uoms.length];
    const target = uom === 'Percentage' ? 100 : (20 + Math.floor(Math.random() * 80));
    const actual = Math.floor(target * (0.4 + Math.random() * 0.6)); // 40-100% achievement

    const goal = {
      userId: user._id,
      cycleId,
      goalSheetId: sheet._id,
      title: `${thrust} Goal ${g + 1} - ${user.name.split(' ')[0]}`,
      description: `Achieve ${thrust.toLowerCase()} targets for FY 2025-26 performance cycle.`,
      thrustArea: thrust,
      uom,
      uomDirection: 'Higher is Better',
      target,
      weightage: weight,
      status: 'Approved',
      isShared: false,
      achievements: [
        { quarter: 'Q1', value: Math.floor(actual * 0.25), comment: 'Q1 progress recorded', updatedAt: new Date('2025-07-01') },
        { quarter: 'Q2', value: Math.floor(actual * 0.5), comment: 'Q2 mid-year review', updatedAt: new Date('2025-10-01') },
        { quarter: 'Q3', value: Math.floor(actual * 0.75), comment: 'Q3 strong progress', updatedAt: new Date('2026-01-01') },
        { quarter: 'Q4', value: actual, comment: 'Q4 final assessment', updatedAt: new Date('2026-03-31') },
      ],
      createdAt: new Date('2025-04-10'),
      updatedAt: new Date('2026-03-31'),
    };
    goals.push(goal);
  }

  await db.collection('goals').insertMany(goals);

  // Create check-ins for each quarter
  for (const goal of goals) {
    // We need the goal _id, so find it
    const savedGoal = await db.collection('goals').findOne({ title: goal.title, cycleId });
    if (!savedGoal) continue;
    for (const ach of goal.achievements) {
      await db.collection('checkins').insertOne({
        userId: user._id,
        goalId: savedGoal._id,
        quarter: ach.quarter,
        value: ach.value,
        comment: ach.comment,
        createdAt: ach.updatedAt,
        updatedAt: ach.updatedAt,
      });
    }
  }

  console.log(`  Seeded ${goalCount} goals + check-ins for ${user.name}`);
}

console.log('\nDone! FY 2025-26 historical data seeded.');
process.exit(0);
