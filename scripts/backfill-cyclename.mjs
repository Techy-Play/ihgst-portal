// Migration: Backfill cycleName on all existing goals
// Run: node scripts/backfill-cyclename.mjs

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

// 1. Get all cycles
const cycles = await db.collection('cycles').find({}).toArray();
console.log(`Found ${cycles.length} cycles`);

const cycleMap = {};
cycles.forEach(c => { cycleMap[c._id.toString()] = c.name; });

// 2. Get all goals
const goals = await db.collection('goals').find({}).toArray();
console.log(`Found ${goals.length} total goals`);

let updated = 0;
let orphaned = 0;

for (const goal of goals) {
  // If goal has cycleId, backfill cycleName
  if (goal.cycleId) {
    const cycleName = cycleMap[goal.cycleId.toString()];
    if (cycleName && goal.cycleName !== cycleName) {
      await db.collection('goals').updateOne(
        { _id: goal._id },
        { $set: { cycleName } }
      );
      updated++;
    }
  } else {
    // Goal has no cycleId — try to infer from goalSheet
    if (goal.goalSheetId) {
      const sheet = await db.collection('goalsheets').findOne({ _id: goal.goalSheetId });
      if (sheet?.cycleId) {
        const cycleName = cycleMap[sheet.cycleId.toString()] || '';
        await db.collection('goals').updateOne(
          { _id: goal._id },
          { $set: { cycleId: sheet.cycleId, cycleName } }
        );
        updated++;
        console.log(`  Fixed orphan: "${goal.title}" → ${cycleName}`);
      } else {
        orphaned++;
        console.log(`  ORPHAN (no sheet cycle): "${goal.title}"`);
      }
    } else {
      orphaned++;
      console.log(`  ORPHAN (no sheet): "${goal.title}"`);
    }
  }
}

console.log(`\nDone! Updated ${updated} goals. Orphaned: ${orphaned}`);
process.exit(0);
