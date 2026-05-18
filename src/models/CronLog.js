import mongoose from 'mongoose';

const CronLogSchema = new mongoose.Schema({
  triggeredBy: { type: String, default: 'cron', enum: ['cron', 'admin'] },
  triggeredByName: { type: String, default: 'System' },
  status: { type: String, enum: ['success', 'error'], required: true },
  created: { type: Number, default: 0 },
  resolved: { type: Number, default: 0 },
  errorDetails: { type: [String], default: [] }, // renamed from 'errors' to avoid Mongoose reserved key
  durationMs: { type: Number },
  message: { type: String },
}, { timestamps: true });

CronLogSchema.index({ createdAt: -1 });

export default mongoose.models.CronLog || mongoose.model('CronLog', CronLogSchema);
