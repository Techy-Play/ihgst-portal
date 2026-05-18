import mongoose from 'mongoose';

const LoginLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String },
  ip: { type: String, default: 'Unknown' },
  userAgent: { type: String, default: '' },
  browser: { type: String, default: 'Unknown' },
  device: { type: String, default: 'Unknown' },
  os: { type: String, default: 'Unknown' },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
}, { timestamps: true });

LoginLogSchema.index({ userId: 1 });
LoginLogSchema.index({ createdAt: -1 });

export default mongoose.models.LoginLog || mongoose.model('LoginLog', LoginLogSchema);
