import mongoose from 'mongoose';

const GoalSheetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cycle', required: true },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Approved', 'Returned', 'Locked', 'Rebalancing'],
    default: 'Draft'
  },
  previousStatus: { type: String, default: null }, // state before Rebalancing, for rollback
  submittedAt: { type: Date },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [{
    text: { type: String, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: { type: String },
    role: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

GoalSheetSchema.index({ userId: 1, cycleId: 1 }, { unique: true });
GoalSheetSchema.index({ status: 1 });

export default mongoose.models.GoalSheet || mongoose.model('GoalSheet', GoalSheetSchema);

