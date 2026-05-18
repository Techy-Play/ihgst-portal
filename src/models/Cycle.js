import mongoose from 'mongoose';

const CycleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  goalSettingStart: { type: Date, required: true },
  goalSettingEnd: { type: Date, required: true },
  quarters: [{ label: String, start: Date, end: Date }],
  isActive: { type: Boolean, default: false },
  isClosed: { type: Boolean, default: false },
  closedAt: { type: Date },
  // Admin-controlled status shown in Analytics. Independent of isActive/isClosed.
  // 'on_track' = default live/open cycle
  // 'incomplete' = admin marks quarter/cycle as incomplete before closing
  // 'closed' = admin has formally closed the cycle
  cycleStatus: {
    type: String,
    enum: ['on_track', 'incomplete', 'closed'],
    default: 'on_track',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Clear cached model in dev hot-reload to pick up schema changes
if (mongoose.models.Cycle) delete mongoose.models.Cycle;

export default mongoose.model('Cycle', CycleSchema);
