import mongoose from 'mongoose';

const GoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  goalSheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoalSheet', required: true },
  thrustArea: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  uom: { type: String, enum: ['Numeric', 'Percentage', 'Timeline', 'Zero'], required: true },
  uomDirection: { type: String, enum: ['Min', 'Max'], default: 'Min' },
  target: { type: mongoose.Schema.Types.Mixed, required: true },
  weightage: { type: Number, required: true, min: 10 },
  status: { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Returned', 'Locked'], default: 'Draft' },
  isShared: { type: Boolean, default: false },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  primaryOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  linkedGoalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],
  achievements: [{
    quarter: String, value: mongoose.Schema.Types.Mixed, status: { type: String, enum: ['Not Started', 'On Track', 'Completed'], default: 'Not Started' },
    comment: String, updatedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

GoalSchema.index({ userId: 1, goalSheetId: 1 });
export default mongoose.models.Goal || mongoose.model('Goal', GoalSchema);
