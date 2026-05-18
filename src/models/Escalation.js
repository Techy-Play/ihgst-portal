import mongoose from 'mongoose';

const EscalationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  goalSheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoalSheet' },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cycle', required: true },
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'] },

  // What triggered this escalation
  type: {
    type: String,
    enum: ['GOAL_SUBMISSION', 'GOAL_APPROVAL', 'CHECKIN_PENDING'],
    required: true,
  },

  // How severe / who has been notified
  level: {
    type: String,
    enum: ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'],
    required: true,
  },

  // Lifecycle status
  status: {
    type: String,
    enum: ['ACTIVE', 'RESOLVED', 'DISMISSED'],
    default: 'ACTIVE',
  },

  message: { type: String, required: true },
  triggeredAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
}, { timestamps: true });

// Prevent duplicate active escalations for the same user/cycle/type/level
EscalationSchema.index({ userId: 1, cycleId: 1, type: 1, level: 1, status: 1 });
EscalationSchema.index({ status: 1, type: 1 });
EscalationSchema.index({ cycleId: 1 });
EscalationSchema.index({ triggeredAt: -1 });

export default mongoose.models.Escalation || mongoose.model('Escalation', EscalationSchema);
