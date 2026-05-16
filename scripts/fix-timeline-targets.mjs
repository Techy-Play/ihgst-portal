import mongoose from 'mongoose';
import { readFileSync } from 'fs';

// Parse .env.local manually
const envFile = readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) envVars[key.trim()] = val.join('=').trim();
});

await mongoose.connect(envVars.MONGODB_URI);
const Goal = mongoose.model('Goal', new mongoose.Schema({}, { strict: false }));

const badGoals = await Goal.find({ uom: 'Timeline', target: { $type: 'number' } }).lean();
console.log(`Found ${badGoals.length} Timeline goals with numeric targets:`);
for (const g of badGoals) {
  console.log(`  ${g._id} | "${g.title}" | target: ${g.target}`);
  await Goal.updateOne({ _id: g._id }, { $set: { target: '2026-03-31' } });
  console.log(`    -> Fixed to "2026-03-31"`);
}
console.log('Done.');
process.exit(0);
