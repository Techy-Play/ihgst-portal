import mongoose from 'mongoose';

const ExportLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  format: { type: String, enum: ['csv', 'excel'], required: true },
  scope: { type: String, enum: ['organization', 'team', 'personal'], default: 'organization' },
  recipientEmail: { type: String, required: true },
  recordCount: { type: Number, default: 0 },
  description: { type: String },
}, { timestamps: true });

ExportLogSchema.index({ userId: 1 });
ExportLogSchema.index({ createdAt: -1 });

export default mongoose.models.ExportLog || mongoose.model('ExportLog', ExportLogSchema);
