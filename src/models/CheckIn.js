import mongoose from 'mongoose';

const CheckInSchema = new mongoose.Schema({
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
  achievement: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['Not Started', 'On Track', 'Completed'], default: 'Not Started' },
  employeeComment: { type: String },
  managerComment: { type: String },
}, { timestamps: true });

CheckInSchema.index({ goalId: 1, quarter: 1 });
CheckInSchema.index({ userId: 1, quarter: 1 });

export default mongoose.models.CheckIn || mongoose.model('CheckIn', CheckInSchema);
